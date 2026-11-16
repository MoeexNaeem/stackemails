#!/usr/bin/env bash
# Server hardening for the Stack Emails VPS (run as root). Safe to re-run.
#
#   bash /www/wwwroot/stackemails/scripts/server/harden.sh
#
# What it does:
#   1. fail2ban: bans an IP for 1 hour after 5 failed SSH logins in 10 minutes
#   2. SSH: key-only logins from the internet (passwords still allowed from the
#      server itself, so aaPanel's web terminal keeps working). It is skipped
#      unless root already has an SSH key installed, and it rolls back on its own
#      if the new settings don't check out, so you can't be locked out.
#   3. Automatic security updates (dnf-automatic, security fixes only)
#   4. Report of every port that's reachable from the internet
#
# Nothing here touches MongoDB, Redis data, rankkw or other sites.
set -euo pipefail

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mXX  %s\033[0m\n' "$*"; exit 1; }
[ "$(id -u)" = 0 ] || die "Please run this as root."
command -v dnf >/dev/null 2>&1 || die "This script expects a dnf-based system (AlmaLinux/Rocky/CentOS)."

# ------------------------------------------------------------ 1. fail2ban
say "1/4 fail2ban (blocks SSH password guessing)"
if ! command -v fail2ban-client >/dev/null 2>&1; then
  dnf install -y epel-release >/dev/null 2>&1 || true
  dnf install -y fail2ban >/dev/null
fi
# Ban through whichever firewall this server actually runs.
if systemctl is-active --quiet firewalld; then BANACTION=firewallcmd-rich-rules; else BANACTION=iptables-multiport; fi
cat > /etc/fail2ban/jail.d/stackemails.local <<EOF
[DEFAULT]
banaction = $BANACTION
bantime  = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 2
fail2ban-client status sshd 2>/dev/null | sed -n '1,12p' || warn "fail2ban started but the sshd jail isn't reporting yet; check: fail2ban-client status sshd"

# ------------------------------------------------------------ 2. SSH
say "2/4 SSH: key-only from the internet"
DROPIN_DIR=/etc/ssh/sshd_config.d
DROPIN=$DROPIN_DIR/00-stackemails-hardening.conf
if [ ! -s /root/.ssh/authorized_keys ]; then
  warn "Skipped: root has no SSH key in /root/.ssh/authorized_keys, so turning off passwords could lock you out."
elif ! grep -Eq '^\s*Include\s+/etc/ssh/sshd_config\.d/\*\.conf' /etc/ssh/sshd_config; then
  warn "Skipped: /etc/ssh/sshd_config doesn't include $DROPIN_DIR/*.conf. Ask for a manual change instead."
else
  mkdir -p "$DROPIN_DIR"
  cat > "$DROPIN" <<'EOF'
# Stack Emails hardening (scripts/server/harden.sh)
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
MaxAuthTries 4
LoginGraceTime 30
X11Forwarding no

# aaPanel's web terminal connects from the server itself with a password.
Match Address 127.0.0.1,::1
    PasswordAuthentication yes
    PermitRootLogin yes
EOF
  chmod 600 "$DROPIN"
  eff() { sshd -T -C "user=root,host=x,addr=$1" 2>/dev/null | awk -v k="$2" '$1==k{print $2}'; }
  if sshd -t \
     && [ "$(eff 203.0.113.9 passwordauthentication)" = "no" ] \
     && [ "$(eff 203.0.113.9 permitrootlogin)" = "without-password" -o "$(eff 203.0.113.9 permitrootlogin)" = "prohibit-password" ] \
     && [ "$(eff 127.0.0.1 passwordauthentication)" = "yes" ]; then
    systemctl reload sshd
    echo "   Internet: SSH keys only. From the server itself (aaPanel terminal): password still works."
    warn "Before closing this window, open a NEW terminal on your PC and check you can still log in: ssh stackemails-server"
  else
    rm -f "$DROPIN"
    warn "The new SSH settings didn't validate, so they were removed and nothing changed."
  fi
fi

# ------------------------------------------------------------ 3. updates
say "3/4 Automatic security updates"
dnf install -y dnf-automatic >/dev/null 2>&1 || true
if [ -f /etc/dnf/automatic.conf ]; then
  sed -i -e 's/^upgrade_type\s*=.*/upgrade_type = security/' -e 's/^apply_updates\s*=.*/apply_updates = yes/' /etc/dnf/automatic.conf
  systemctl enable --now dnf-automatic.timer >/dev/null 2>&1 && echo "   Security updates install daily."
else
  warn "dnf-automatic isn't available; run 'dnf upgrade --security' now and then."
fi

# ------------------------------------------------------------ 4. ports
say "4/4 Ports reachable from the internet"
ss -H -ltnp 2>/dev/null | awk '{print $4, $6}' | grep -Ev '^(127\.0\.0\.1|\[::1\]|::1):' | sort -u | while read -r addr proc; do
  printf '   %-24s %s\n' "$addr" "$(echo "$proc" | sed -E 's/.*\(\("([^"]+)".*/\1/')"
done
for svc in 27017:MongoDB 6379:Redis 3600:Next.js; do
  port=${svc%%:*}; name=${svc#*:}
  if ss -H -ltn "sport = :$port" 2>/dev/null | awk '{print $4}' | grep -Evq '^(127\.0\.0\.1|\[::1\]|::1):'; then
    warn "$name (port $port) is listening on a public address. It should be 127.0.0.1 only."
  fi
done
echo "   Expected public: 22 (SSH), 80/443 (websites), aaPanel's port (restrict it in aaPanel > Settings)."

say "Hardening done."
