#!/data/data/com.termux/files/usr/bin/bash
# Download every external asset of vr-games ON THE PHONE (the host cannot reach the outside servers),
# then upload them to the site via FTP.
#
# It runs the project's own tools/fetch-images.php locally with Termux PHP, so the files and the
# manifest.json files are exactly what the site expects:
#   museum3d/models/   3D scans of the treasure museum (Smithsonian)       ~40–200 MB
#   museum3d/photos/   real photo of each treasure object (Wikimedia)      ~5 MB
#   tour/pano/         360° photos for the 360 tour (Wikimedia)            ~100 MB
#   museum/art/        paintings for the gallery (Art Institute, Met)      ~50 MB
#
# Usage:  bash get-assets.sh                  (all jobs)
#         bash get-assets.sh models photos    (only these jobs: models photos tour museum)
# Re-running continues where it stopped; finished items are not downloaded again.
set -uo pipefail

FTP_HOST="${FTP_HOST:-mashghbazi.ir}"
REMOTE_DIR="${REMOTE_DIR:-}"          # FTP path of the folder that contains vr-games/ ; empty = detect
SITE="$HOME/vr-site"                  # local working copy (kept between runs)
PORT=8090
JOBS=("$@"); [ ${#JOBS[@]} -eq 0 ] && JOBS=(models photos tour museum)

say(){ printf '\n\033[1;33m» %s\033[0m\n' "$*"; }
die(){ printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

say "Installing tools (php, curl, lftp, unzip)…"
for p in php curl lftp unzip; do command -v "$p" >/dev/null 2>&1 || pkg install -y "$p" || die "could not install $p"; done

# ---- local copy of the project ----
if [ ! -f "$SITE/vr-games/tools/fetch-images.php" ]; then
  [ -d "$HOME/storage/downloads" ] || { say "Allow storage access in the popup, then run this script again."; termux-setup-storage; exit 0; }
  ZIP=$(ls -t "$HOME"/storage/downloads/vr-games-enhanced*.zip 2>/dev/null | head -n1)
  [ -n "$ZIP" ] || die "vr-games-enhanced.zip not found in Download."
  say "Unpacking $ZIP → $SITE"
  mkdir -p "$SITE" && unzip -oq "$ZIP" -d "$SITE" || die "unzip failed"
fi

# ---- connectivity check (from Iran a VPN on the phone is usually needed) ----
say "Checking access to the source servers…"
for u in https://3d-api.si.edu https://commons.wikimedia.org https://upload.wikimedia.org https://api.artic.edu; do
  if curl -s -o /dev/null --max-time 15 "$u"; then echo "  ✓ $u"; else echo "  ✗ $u  (not reachable — turn on a VPN and run again)"; fi
done

# ---- run fetch-images.php locally ----
php -S 127.0.0.1:$PORT -t "$SITE" >"$TMPDIR/php-server.log" 2>&1 &
PHP_PID=$!; trap 'kill $PHP_PID 2>/dev/null' EXIT
sleep 2; kill -0 $PHP_PID 2>/dev/null || die "PHP server did not start (see $TMPDIR/php-server.log)"

run_job(){
  local job=$1 i=0 page txt
  say "Job: $job"
  while [ $i -lt 3000 ]; do
    i=$((i+1))
    page=$(curl -s --max-time 400 "http://127.0.0.1:$PORT/vr-games/tools/fetch-images.php?job=$job") || { sleep 3; continue; }
    txt=$(printf '%s' "$page" | tr '\n' ' ' | sed -n 's/.*<div class="card">\(.*\)<\/div>.*/\1/p' | sed 's/<\/li>/\n/g; s/<[^>]*>/ /g' | tr -s ' ')
    if printf '%s' "$page" | grep -q 'http-equiv="refresh"'; then
      printf '\r\033[K  %s' "$(printf '%s' "$txt" | head -c 110)"; sleep 1
    else
      printf '\r\033[K'; printf '%s\n' "$txt" | sed 's/^/  /'; return 0
    fi
  done
}
for j in "${JOBS[@]}"; do run_job "$j"; done
kill $PHP_PID 2>/dev/null

say "Downloaded on the phone:"
for d in museum3d/models museum3d/photos tour/pano museum/art; do
  [ -d "$SITE/vr-games/$d" ] && printf '  %-18s %s\n' "$d" "$(du -sh "$SITE/vr-games/$d" | cut -f1)"
done

# ---- upload via FTP ----
read -rp $'\nUpload to the site now? [Y/n] ' a; [[ "${a:-y}" =~ ^[Nn] ]] && exit 0
read -rp "FTP username: " FTP_USER
read -rsp "FTP password: " FTP_PASS; echo
export LFTP_PASSWORD="$FTP_PASS"
LFTP_SET="set ftp:ssl-allow yes; set ssl:verify-certificate no; set ftp:passive-mode yes; set net:timeout 30; set net:max-retries 8; set net:reconnect-interval-base 5"
ftp_run(){ lftp -u "$FTP_USER" --env-password -e "$LFTP_SET; $1; bye" "$FTP_HOST"; }

LIST=$(ftp_run "cls -1" 2>&1) || die "FTP login failed: $LIST"
if [ -z "$REMOTE_DIR" ]; then
  if echo "$LIST" | grep -qx 'public_html/\?'; then REMOTE_DIR="public_html/game"
  elif echo "$LIST" | grep -qx 'www/\?'; then REMOTE_DIR="www/game"
  else REMOTE_DIR="game"; fi
fi
say "Uploading to $REMOTE_DIR/vr-games/ …"
CMDS=""
for d in museum3d/models museum3d/photos tour/pano museum/art; do
  [ -f "$SITE/vr-games/$d/manifest.json" ] || continue
  CMDS="$CMDS mkdir -p -f '$REMOTE_DIR/vr-games/$d'; mirror -R --no-perms --only-newer --parallel=3 --verbose=1 -X '_lock' -X '_work*' -X '*.part' -X '*.tmp' '$SITE/vr-games/$d' '$REMOTE_DIR/vr-games/$d';"
done
[ -n "$CMDS" ] || die "Nothing to upload (no manifest.json was created)."
ftp_run "$CMDS" || die "Upload stopped. Run the script again; it continues from where it stopped."
say "Done ✓  Open: https://mashghbazi.ir/game/vr-games/museum3d/"
