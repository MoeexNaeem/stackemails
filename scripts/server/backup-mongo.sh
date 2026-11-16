#!/usr/bin/env bash
# Daily backup of the Stack Emails MongoDB database (run as root).
#
#   bash /www/wwwroot/stackemails/scripts/server/backup-mongo.sh            # back up now
#   bash /www/wwwroot/stackemails/scripts/server/backup-mongo.sh install    # + run every night at 03:15
#
# Writes a compressed archive to /www/backup/stackemails (owner-only access) and
# keeps the last 14. Only the `stackemails` database is dumped, using the app's
# own MONGODB_URI, so rankkw and every other database are never touched.
#
# Off-server copy (strongly recommended): install rclone, run `rclone config` to add
# a remote (e.g. Google Drive or Backblaze B2) named "offsite", and every backup is
# copied there too. Restore with:
#   mongorestore --uri "<MONGODB_URI>" --gzip --archive=<file> --nsInclude 'stackemails.*'
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DEST=/www/backup/stackemails
KEEP=14
REMOTE="${BACKUP_RCLONE_REMOTE:-offsite}"

say() { printf '\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mXX  %s\033[0m\n' "$*"; exit 1; }
[ "$(id -u)" = 0 ] || die "Please run this as root."

if [ "${1:-}" = "install" ]; then
  LINE="15 3 * * * bash $APP_DIR/scripts/server/backup-mongo.sh >> /var/log/stackemails-backup.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v "scripts/server/backup-mongo.sh" ; echo "$LINE" ) | crontab -
  say "Nightly backup scheduled (03:15). Log: /var/log/stackemails-backup.log"
fi

DUMP=$(command -v mongodump || true)
[ -z "$DUMP" ] && [ -x /www/server/mongodb/bin/mongodump ] && DUMP=/www/server/mongodb/bin/mongodump
[ -n "$DUMP" ] || die "mongodump not found. Install MongoDB Database Tools: dnf install -y mongodb-database-tools"

# Read the connection string without executing the .env file.
ENV_FILE=""
for f in "$APP_DIR/.env.production" "$APP_DIR/.env.local" "$APP_DIR/.env"; do
  if [ -f "$f" ] && grep -q '^MONGODB_URI=' "$f"; then ENV_FILE=$f; break; fi
done
[ -n "$ENV_FILE" ] || die "MONGODB_URI not found in $APP_DIR/.env"
URI=$(grep '^MONGODB_URI=' "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//')
[ -n "$URI" ] || die "MONGODB_URI is empty"

umask 077
mkdir -p "$DEST"
chmod 700 "$DEST"
# Pass the URI through a private config file so the password never shows in `ps`.
CFG=$(mktemp)
trap 'rm -f "$CFG"' EXIT
printf 'uri: "%s"\n' "$URI" > "$CFG"

FILE="$DEST/stackemails-$(date +%Y%m%d-%H%M).archive.gz"
say "Backing up to $FILE"
"$DUMP" --config="$CFG" --gzip --archive="$FILE" --quiet
chmod 600 "$FILE"
say "Done: $(du -h "$FILE" | cut -f1)"

# Keep the newest $KEEP backups.
ls -1t "$DEST"/stackemails-*.archive.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx "$REMOTE:"; then
  say "Copying off-server to $REMOTE:stackemails-backups"
  rclone copy "$FILE" "$REMOTE:stackemails-backups" --quiet
  rclone delete "$REMOTE:stackemails-backups" --min-age 30d --quiet || true
else
  printf '\033[1;33m!!  No off-server copy: set up an rclone remote named "%s" (see the top of this script).\033[0m\n' "$REMOTE"
fi
