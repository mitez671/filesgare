#!/data/data/com.termux/files/usr/bin/bash
# آپلود یک پوشه (مثلاً escape-vr) یک‌جا؛ رمز را یک بار می‌پرسد و هیچ‌جا ذخیره نمی‌کند.
# استفاده: bash upload-folder.sh ~/storage/downloads/escape-vr escape-vr
set -uo pipefail
SRC="${1:?پوشهٔ محلی}"; DST="${2:?نام پوشه روی سایت}"
HOST="mashghbazi.ir"; REMOTE_BASE="public_html/game/vr-games"
command -v lftp >/dev/null || pkg install -y lftp
read -rp "FTP user: " U; read -rsp "FTP pass: " P; echo; export LFTP_PASS="$P"
lftp -u "$U" --env-password -e "set ssl:verify-certificate no; set ftp:passive-mode yes; cd $REMOTE_BASE; mkdir -p -f '$DST'; mirror -R --no-perms --verbose '$SRC' '$DST'; chmod 755 '$DST'; chmod 755 '$DST/sfx'; bye" "$HOST" && echo "✓ انجام شد: https://$HOST/game/vr-games/$DST/"
