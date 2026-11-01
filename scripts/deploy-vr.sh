#!/data/data/com.termux/files/usr/bin/bash
# Upload vr-games-enhanced.zip to the FTP server and extract it on the server.
# Result: https://mashghbazi.ir/game/vr-games/
#
# How it works:
#   1) uploads the zip + a one-time PHP extractor (random name) to the "game" folder via FTP
#   2) calls the extractor over HTTPS, which unzips on the server and then deletes itself and the zip
#   3) if the server cannot unzip (no PHP zip support), it unzips on the phone and uploads the files one by one
set -euo pipefail

# ------------ settings (change if needed) ------------
FTP_HOST="${FTP_HOST:-mashghbazi.ir}"
SITE_URL="https://mashghbazi.ir/game"          # web address of the folder that will contain vr-games/
REMOTE_DIR="${REMOTE_DIR:-}"                    # FTP path of that same folder; empty = detect (public_html/game or game)
ZIP="${1:-}"                                    # zip path; empty = look in Downloads
# -----------------------------------------------------

say(){ printf '\n\033[1;33m» %s\033[0m\n' "$*"; }
die(){ printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

say "Installing tools (lftp, curl, unzip)…"
for p in lftp curl unzip; do command -v "$p" >/dev/null 2>&1 || pkg install -y "$p"; done

# find the zip
if [ -z "$ZIP" ]; then
  [ -d "$HOME/storage/downloads" ] || { say "Allow storage access in the popup, then run this script again."; termux-setup-storage; exit 0; }
  ZIP=$(ls -t "$HOME"/storage/downloads/vr-games-enhanced*.zip 2>/dev/null | head -n1 || true)
fi
[ -n "$ZIP" ] && [ -f "$ZIP" ] || die "Zip not found. Put vr-games-enhanced.zip in Download, or run: bash deploy-vr.sh /path/to/file.zip"
unzip -tq "$ZIP" >/dev/null || die "The zip is damaged. Download it again."
say "File: $ZIP ($(du -h "$ZIP" | cut -f1))"

# credentials (password is not saved anywhere)
read -rp "FTP username: " FTP_USER
read -rsp "FTP password: " FTP_PASS; echo
export LFTP_PASSWORD="$FTP_PASS"

LFTP_SET="set ftp:ssl-allow yes; set ssl:verify-certificate no; set ftp:passive-mode yes; set net:timeout 30; set net:max-retries 5; set net:reconnect-interval-base 5"
ftp_run(){ lftp -u "$FTP_USER" --env-password -e "$LFTP_SET; $1; bye" "$FTP_HOST"; }

say "Connecting to FTP…"
LIST=$(ftp_run "cls -1" 2>&1) || die "FTP login failed: $LIST"

if [ -z "$REMOTE_DIR" ]; then
  if echo "$LIST" | grep -qx 'public_html/\?'; then REMOTE_DIR="public_html/game"
  elif echo "$LIST" | grep -qx 'www/\?'; then REMOTE_DIR="www/game"
  else REMOTE_DIR="game"; fi
fi
say "Upload folder on the server: $REMOTE_DIR  (→ $SITE_URL/vr-games/)"

TOKEN=$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')
PHP="$TMPDIR/_unzip_$TOKEN.php"; RZIP="_vr_$TOKEN.zip"
cat > "$PHP" <<EOF
<?php
// one-time extractor; deletes itself
@set_time_limit(600); header('Content-Type: text/plain; charset=utf-8');
\$zip = __DIR__ . '/$RZIP'; \$ok = false; \$msg = '';
if (!is_file(\$zip)) { echo 'NOZIP'; exit; }
if (class_exists('ZipArchive')) {
  \$z = new ZipArchive();
  if (\$z->open(\$zip) === true) { \$ok = \$z->extractTo(__DIR__); \$n = \$z->numFiles; \$z->close(); \$msg = "files=\$n"; }
  else \$msg = 'open failed';
} elseif (class_exists('PharData')) {
  try { (new PharData(\$zip))->extractTo(__DIR__, null, true); \$ok = true; \$msg = 'phar'; } catch (Throwable \$e) { \$msg = \$e->getMessage(); }
} else \$msg = 'no zip support';
if (\$ok) { @unlink(\$zip); foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(__DIR__ . '/vr-games', FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST) as \$f) @chmod(\$f->getPathname(), \$f->isDir() ? 0755 : 0644); echo "OK \$msg"; } else echo "FAIL \$msg";
@unlink(__FILE__);
EOF

say "Uploading the zip (this may take a few minutes)…"
ftp_run "mkdir -p -f '$REMOTE_DIR'; cd '$REMOTE_DIR'; put -c '$ZIP' -o '$RZIP'; put '$PHP' -o '_unzip_$TOKEN.php'; chmod 644 '$RZIP' '_unzip_$TOKEN.php'"
rm -f "$PHP"

say "Extracting on the server…"
RES=$(curl -sS --max-time 600 "$SITE_URL/_unzip_$TOKEN.php" 2>&1 || true)
echo "Server reply: $RES"

if [[ "$RES" == OK* ]]; then
  say "Done ✓  Open: $SITE_URL/vr-games/"
  exit 0
fi

say "Server extraction did not work. Extracting on the phone and uploading the files instead…"
ftp_run "cd '$REMOTE_DIR'; rm -f '$RZIP' '_unzip_$TOKEN.php'" || true
WORK="$TMPDIR/vr-deploy"; rm -rf "$WORK"; mkdir -p "$WORK"
unzip -q "$ZIP" -d "$WORK"
[ -d "$WORK/vr-games" ] || die "No vr-games folder inside the zip."
ftp_run "mkdir -p -f '$REMOTE_DIR/vr-games'; mirror -R --no-perms --parallel=4 --verbose=1 '$WORK/vr-games' '$REMOTE_DIR/vr-games'"
rm -rf "$WORK"
say "Done ✓  Open: $SITE_URL/vr-games/"
