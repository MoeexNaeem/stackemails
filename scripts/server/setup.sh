#!/usr/bin/env bash
# Put stackemails.com live on this server (run as root). Safe to re-run: it pulls
# the latest code, rebuilds and restarts, and adds the free SSL certificate once the
# domain points here.
#
#   git clone https://github.com/MoeexNaeem/stackemails.git /www/wwwroot/stackemails
#   bash /www/wwwroot/stackemails/scripts/server/setup.sh
#   bash /www/wwwroot/stackemails/scripts/server/setup.sh ssl   (SSL only, no rebuild)
#
# Runs the app as PM2 app `stackemails` on 127.0.0.1:3600 behind aaPanel's nginx.
# Other sites on this server are left untouched.
set -euo pipefail

main() {

APP=stackemails
DOMAIN=stackemails.com
PORT=3600
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ACME_ROOT=/www/wwwroot/$APP-acme
CERT_DIR=/etc/ssl/$APP

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mXX  %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Please run this as root."
cd "$APP_DIR"

if [ -x /www/server/nginx/sbin/nginx ]; then
  NGINX=/www/server/nginx/sbin/nginx; CONF=/www/server/panel/vhost/nginx/$DOMAIN.conf
elif command -v nginx >/dev/null 2>&1; then
  NGINX=$(command -v nginx); CONF=/etc/nginx/conf.d/$DOMAIN.conf
else
  die "nginx is not installed (aaPanel > App Store > Nginx)."
fi
reload_nginx() { "$NGINX" -t && "$NGINX" -s reload; }
# A real (Let's Encrypt) certificate, not a leftover self-signed one.
# (grep reads everything, no -q: with pipefail an early grep exit fails the check.)
have_cert() { [ -s "$CERT_DIR/fullchain.pem" ] && openssl x509 -noout -issuer -in "$CERT_DIR/fullchain.pem" 2>/dev/null | grep -i "let's encrypt" >/dev/null; }

ONLY_SSL=0; [ "${1:-}" = ssl ] && ONLY_SSL=1

# ---------------------------------------------------------------- 1. app
if [ "$ONLY_SSL" = 0 ]; then
say "1/3 Building and starting the app (a few minutes)"
command -v node >/dev/null 2>&1 || die "Node.js is not installed."
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
if [ -d .git ]; then git pull --ff-only || warn "git pull failed, building the code already here."; fi
npm ci --no-audit --no-fund
npm run build
if pm2 describe "$APP" >/dev/null 2>&1; then
  pm2 restart "$APP" --update-env
else
  pm2 start npm --name "$APP" --cwd "$APP_DIR" -- start -- -p "$PORT" -H 127.0.0.1
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------- 2. domain
say "2/3 Connecting $DOMAIN"
mkdir -p "$ACME_ROOT"
write_conf() {
  if have_cert; then
    cat > "$CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root $ACME_ROOT; }
    location / { return 301 https://$DOMAIN\$request_uri; }
}
server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;
    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF
  else
    cat > "$CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root $ACME_ROOT; }
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  fi
  # Never leave a rejected file behind: it would break the next nginx restart for every site.
  reload_nginx || { rm -f "$CONF"; "$NGINX" -s reload 2>/dev/null || true; die "nginx rejected the $DOMAIN config, removed it. Other sites are unaffected."; }
}
write_conf

# ---------------------------------------------------------------- 3. SSL
say "3/3 Free SSL certificate (Let's Encrypt)"
SERVER_IP=$(curl -s --max-time 5 https://api.ipify.org || true)
DOMAIN_IP=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
echo "Server IP: ${SERVER_IP:-unknown} | $DOMAIN points to: ${DOMAIN_IP:-nothing}"
if have_cert; then
  echo "Certificate already installed (renews automatically)."
elif [ -z "$SERVER_IP" ] || [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
  warn "$DOMAIN points to ${DOMAIN_IP:-nothing}, not this server (${SERVER_IP:-unknown}). In Hostinger DNS set the A record @ to ${SERVER_IP:-this server IP}, wait a few minutes, then run this script again for SSL. The site works on http:// meanwhile."
else
  if [ ! -f ~/.acme.sh/acme.sh ]; then echo "Installing acme.sh (Let's Encrypt client)"; curl -s https://get.acme.sh | sh -s; fi
  echo "Requesting the certificate"
  WWW=""; [ "$(getent ahostsv4 "www.$DOMAIN" | awk 'NR==1{print $1}')" = "$SERVER_IP" ] && WWW="-d www.$DOMAIN"
  # shellcheck disable=SC2086
  ~/.acme.sh/acme.sh --issue --server letsencrypt -d "$DOMAIN" $WWW -w "$ACME_ROOT" || true
  mkdir -p "$CERT_DIR"
  if ~/.acme.sh/acme.sh --install-cert -d "$DOMAIN" --key-file "$CERT_DIR/privkey.pem" --fullchain-file "$CERT_DIR/fullchain.pem" --reloadcmd "$NGINX -s reload"; then
    write_conf
    echo "SSL is on."
  else
    warn "Could not get the certificate. The site works on http:// for now; run this script again later."
  fi
fi

echo
if have_cert; then echo "Live: https://$DOMAIN"; else echo "Live: http://$DOMAIN"; fi
echo "Update later: bash $APP_DIR/scripts/server/setup.sh"
echo "Logs:         pm2 logs $APP"
}

main "$@"
