#!/data/data/com.termux/files/usr/bin/bash
# Fix stale (cached) gallery + Earth files on the site, and check the Wright Flyer model.
# Only adds ?v=... to file addresses; app behaviour does not change.
set -uo pipefail
SITE="$HOME/vr-site/vr-games"
URL="https://mashghbazi.ir/game/vr-games"
V="v=$(date +%Y%m%d%H%M)"
cd "$SITE" || { echo "پوشهٔ $SITE پیدا نشد"; exit 1; }

echo "== ۱) سرور هر فایل را چطور می‌فرستد =="
for f in museum/index.html museum/gallery-room.js map/index.html map/atlas-room.js museum/art/materials/persian-medallion-rug.jpg; do
  echo "--- $f"
  curl -sI "$URL/$f" | grep -iE "^HTTP|^server|cache|^age|^x-|^ar-|content-length" | sed 's/^/   /'
  loc=$(wc -c < "$f"); rem=$(curl -s "$URL/$f" | wc -c)
  [ "$loc" = "$rem" ] && echo "   ✓ همان نسخهٔ جدید ($loc بایت)" || echo "   ✗ سایت نسخهٔ دیگری می‌دهد: سایت $rem بایت، نسخهٔ جدید $loc بایت"
done

echo; echo "== ۲) نشانی تازه برای فایل‌ها =="
sed -i -E "s#(src=\"\.\./_shared/realism\.js)(\?v=[0-9]+)?\"#\1?$V\"#; s#(src=\"gallery-room\.js)(\?v=[0-9]+)?\"#\1?$V\"#; s#(href=\"gallery\.css)(\?v=[0-9]+)?\"#\1?$V\"#" museum/index.html
sed -i -E "s#(src=\"\.\./_shared/realism\.js)(\?v=[0-9]+)?\"#\1?$V\"#; s#(src=\"atlas-room\.js)(\?v=[0-9]+)?\"#\1?$V\"#; s#(href=\"atlas\.css)(\?v=[0-9]+)?\"#\1?$V\"#" map/index.html
sed -i -E "s#(art/materials/persian-medallion-rug\.jpg)(\?v=[0-9]+)?'#\1?$V'#" museum/gallery-room.js
grep -o "[a-z-]*\.\(js\|css\|jpg\)?$V" museum/index.html map/index.html museum/gallery-room.js | sed 's/^/   /'

echo; echo "== ۳) هواپیمای برادران رایت =="
if grep -q '"wright"' museum3d/models/manifest.json 2>/dev/null; then echo "   روی گوشی دانلود شده"; ls -la museum3d/models/wright | sed 's/^/   /'
else echo "   ✗ مدل رایت روی گوشی دانلود نشده؛ بعد از این اسکریپت بزن: bash ~/get-assets.sh models"; fi

echo; read -rp "FTP user: " U; read -rsp "FTP pass: " P; echo
CMD="set ssl:verify-certificate no; set ftp:passive-mode yes; cd public_html/game/vr-games; put museum/index.html -o museum/index.html; put museum/gallery-room.js -o museum/gallery-room.js; put map/index.html -o map/index.html; chmod 755 museum map museum/art museum/art/materials museum/art/curated _shared _shared/realism; cls -l museum3d/models; bye"
lftp -u "$U,$P" -e "$CMD" mashghbazi.ir

echo; echo "== بررسی نهایی =="
for f in museum/index.html map/index.html; do
  n=$(curl -s "$URL/$f" | grep -c "$V"); [ "$n" -gt 0 ] && echo "   ✓ $f نسخهٔ تازه است" || echo "   ✗ $f هنوز نسخهٔ قدیمی است؛ کش CDN را در پنل هاست پاک کن"
done
echo "حالا صفحه را در پنجرهٔ ناشناس باز کن."
