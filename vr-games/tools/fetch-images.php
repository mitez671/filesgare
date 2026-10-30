<?php
/*
 * بارگذاری تصاویر روی همین سایت
 * ------------------------------------------------------------
 * - museum: آثار «مالکیت عمومی» (CC0) از موزهٔ هنر شیکاگو و نگارگری ایرانی از موزهٔ متروپولیتن
 *           → ../museum/art/ و ../museum/art/manifest.json
 * - tour:   عکس‌های کروی ۳۶۰ درجه با مجوز آزاد از ویکی‌مدیا کامنز
 *           → ../tour/pano/ و ../tour/pano/manifest.json
 * - models: مدل‌های سه‌بعدی اشیای واقعی موزه‌های اسمیتسونین (فهرست در ../museum3d/objects.json)
 *           → ../museum3d/models/ و ../museum3d/models/manifest.json (اجرای دوباره فقط موارد جامانده را می‌گیرد)
 * کار در چند مرحلهٔ کوتاه انجام می‌شود و صفحه خودش را تازه می‌کند تا تمام شود.
 * فقط از چند نشانی ثابت دانلود می‌کند. بعد از پایان، اجرای دوباره کاری نمی‌کند؛
 * برای دانلود دوباره، فایل manifest.json همان پوشه را از File Manager پاک کن.
 */
declare(strict_types=1);
@set_time_limit(90);
@ignore_user_abort(true);
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');

if (!function_exists('str_starts_with')) { function str_starts_with($h, $n) { return strncmp($h, $n, strlen($n)) === 0; } }
if (!function_exists('str_contains')) { function str_contains($h, $n) { return $n === '' || strpos($h, $n) !== false; } }
if (!function_exists('mb_strtolower')) { function mb_strtolower($s) { return strtolower($s); } }
const UA = 'QuestGameHall-ImageFetcher/1.0 (self-hosted VR museum and 360 tour; https://github.com/mitez671/filesgare)';
const BUDGET = 18;            // seconds of work per page load
const HOSTS = ['api.artic.edu', 'www.artic.edu', 'collectionapi.metmuseum.org', 'images.metmuseum.org', 'commons.wikimedia.org', 'upload.wikimedia.org', '3d-api.si.edu'];
$T0 = microtime(true);
$ROOT = dirname(__DIR__);

/* ---------------- museum rooms ---------------- */
$ROOMS = [
  ['key' => 'vangogh',   'name' => 'ون‌گوگ',            'src' => 'aic', 'artists' => ['Vincent van Gogh'], 'max' => 16],
  ['key' => 'monet',     'name' => 'کلود مونه',         'src' => 'aic', 'artists' => ['Claude Monet'], 'max' => 22],
  ['key' => 'impress',   'name' => 'امپرسیونیست‌ها',     'src' => 'aic', 'artists' => ['Pierre-Auguste Renoir', 'Edgar Degas', 'Camille Pissarro', 'Gustave Caillebotte', 'Georges Seurat', 'Berthe Morisot', 'Mary Cassatt'], 'max' => 24],
  ['key' => 'post',      'name' => 'پست‌امپرسیونیست‌ها', 'src' => 'aic', 'artists' => ['Paul Cézanne', 'Paul Gauguin', 'Henri de Toulouse-Lautrec', 'Henri Rousseau'], 'max' => 20],
  ['key' => 'masters',   'name' => 'استادان قدیم',       'src' => 'aic', 'artists' => ['Rembrandt van Rijn', 'El Greco', 'Peter Paul Rubens', 'Frans Hals', 'Jan Steen', 'Francisco José de Goya y Lucientes'], 'max' => 20],
  ['key' => 'japan',     'name' => 'چاپ چوبی ژاپنی',    'src' => 'aic', 'artists' => ['Katsushika Hokusai', 'Utagawa Hiroshige'], 'max' => 24],
  ['key' => 'persian',   'name' => 'نگارگری ایرانی',     'src' => 'met', 'queries' => ['Shahnama', 'Khamsa', 'Divan Hafiz', 'Persian painting'], 'max' => 24],
];

// used when the Met is unreachable from this server or returns too few Persian paintings
const PERSIAN_COMMONS = ['Shahnameh of Shah Tahmasp', 'Reza Abbasi', 'Persian miniature Safavid', 'Khamseh Nizami miniature', 'Sultan Muhammad painter', 'Kamal-ol-molk painting', 'Behzad miniature'];

/* ---------------- helpers ---------------- */
function elapsed(): float { global $T0; return microtime(true) - $T0; }
function allowed(string $url): bool { $h = parse_url($url, PHP_URL_HOST); return is_string($h) && in_array($h, HOSTS, true) && str_starts_with($url, 'https://'); }
function remote(string $url): string { $m = getenv('FETCH_MOCK_BASE'); return $m ? preg_replace('#^https://([^/]+)#', rtrim($m, '/') . '/$1', $url) : $url; }
function http_get(string $url, int $timeout = 25): ?string {
  if (!allowed($url)) return null;
  $u = remote($url);
  if (function_exists('curl_init')) {
    $c = curl_init($u);
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 10,
      CURLOPT_USERAGENT => UA, CURLOPT_HTTPHEADER => ['AIC-User-Agent: ' . UA], CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS]);
    $b = curl_exec($c); $code = (int)curl_getinfo($c, CURLINFO_RESPONSE_CODE); curl_close($c);
    return ($b !== false && $code >= 200 && $code < 300) ? $b : null;
  }
  $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'header' => "User-Agent: " . UA . "\r\nAIC-User-Agent: " . UA . "\r\n", 'follow_location' => 1]]);
  $b = @file_get_contents($u, false, $ctx);
  return $b === false ? null : $b;
}
function http_download(string $url, string $dest, int $timeout = 240): int {
  if (!allowed($url)) return 0;
  $u = remote($url); $part = $dest . '.part'; $d = dirname($dest);
  if (!is_dir($d) && !@mkdir($d, 0755, true)) return 0;
  $ok = false;
  if (function_exists('curl_init')) {
    $fh = @fopen($part, 'wb'); if (!$fh) return 0;
    $c = curl_init($u);
    curl_setopt_array($c, [CURLOPT_FILE => $fh, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 10,
      CURLOPT_USERAGENT => UA, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS]);
    $r = curl_exec($c); $code = (int)curl_getinfo($c, CURLINFO_RESPONSE_CODE); curl_close($c); fclose($fh);
    $ok = $r !== false && $code >= 200 && $code < 300;
  } else {
    $in = @fopen($u, 'rb', false, stream_context_create(['http' => ['timeout' => $timeout, 'header' => "User-Agent: " . UA . "\r\n", 'follow_location' => 1]]));
    $out = $in ? @fopen($part, 'wb') : false;
    if ($in && $out) { $ok = stream_copy_to_stream($in, $out) > 0; }
    if ($in) fclose($in); if ($out) fclose($out);
  }
  $n = is_file($part) ? (int)filesize($part) : 0;
  if (!$ok || $n < 100) { @unlink($part); return 0; }
  rename($part, $dest); return $n;
}
function http_json(string $url): ?array { $b = http_get($url); if ($b === null) return null; $j = json_decode($b, true); return is_array($j) ? $j : null; }
function load_json(string $f, $def) { if (!is_file($f)) return $def; $j = json_decode((string)file_get_contents($f), true); return $j === null ? $def : $j; }
function save_json(string $f, $data): void { $tmp = $f . '.tmp'; file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)); rename($tmp, $f); }
function norm(string $s): string { $s = mb_strtolower($s); return strtr($s, ['é' => 'e', 'è' => 'e', 'á' => 'a', 'ó' => 'o', 'ü' => 'u', 'ö' => 'o', 'ç' => 'c']); }
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function clean_html(string $s): string { return trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($s), ENT_QUOTES, 'UTF-8'))); }

/* ---------------- museum job ---------------- */
function museum_step(array &$w, string $dir): void {
  global $ROOMS;
  while (elapsed() < BUDGET) {
    if ($w['phase'] === 'build') {
      if ($w['room'] >= count($ROOMS)) { $w['phase'] = 'download'; $w['msg'] = 'فهرست آماده شد؛ دانلود تصاویر…'; continue; }
      $R = $ROOMS[$w['room']]; $k = $R['key'];
      if (!empty($w['only']) && $w['only'] !== $k){ $w['room']++; continue; }
      $w['items'][$k] = $w['items'][$k] ?? [];
      if ($R['src'] === 'aic') {
        if ($w['sub'] < count($R['artists'])) {
          $artist = $R['artists'][$w['sub']];
          $per = (int)ceil($R['max'] / count($R['artists'])) + 2;
          $q = http_build_query(['q' => $artist, 'query' => ['term' => ['is_public_domain' => 'true']], 'fields' => 'id,title,artist_title,date_display,image_id,thumbnail,is_public_domain', 'limit' => 60]);
          $j = http_json('https://api.artic.edu/api/v1/artworks/search?' . $q);
          $n = 0; $last = norm(preg_replace('/^.* /u', '', $artist));
          foreach (($j['data'] ?? []) as $a) {
            if ($n >= $per) break;
            if (empty($a['image_id']) || empty($a['is_public_domain'])) continue;
            if (!str_contains(norm((string)($a['artist_title'] ?? '')), $last)) continue;
            $tw = (int)($a['thumbnail']['width'] ?? 0); $th = (int)($a['thumbnail']['height'] ?? 0);
            $width = $tw > 0 ? min(1686, $tw) : 843;
            $w['items'][$k][] = ['id' => 'aic' . $a['id'], 'title' => (string)$a['title'], 'artist' => (string)($a['artist_title'] ?? ''), 'date' => (string)($a['date_display'] ?? ''),
              'url' => 'https://www.artic.edu/iiif/2/' . rawurlencode($a['image_id']) . '/full/' . $width . ',/0/default.jpg', 'aspect' => $th ? $tw / $th : 0,
              'source' => 'Art Institute of Chicago', 'link' => 'https://www.artic.edu/artworks/' . (int)$a['id'], 'license' => 'CC0'];
            $n++;
          }
          if ($j === null) $w['errors']++;
          $w['sub']++; $w['msg'] = 'جستجوی آثار: ' . $artist;
          continue;
        }
      } else { // Metropolitan Museum, Persian painting
        if (!empty($w['queue'])) {
          $id = (int)array_shift($w['queue']);
          $o = http_json('https://collectionapi.metmuseum.org/public/collection/v1/objects/' . $id);
          if ($o && !empty($o['isPublicDomain']) && !empty($o['primaryImageSmall'])) {
            $place = norm(($o['culture'] ?? '') . ' ' . ($o['country'] ?? '') . ' ' . ($o['period'] ?? '') . ' ' . ($o['dynasty'] ?? ''));
            $okPlace = preg_match('/iran|persia|safavid|timurid|qajar|ilkhanid|herat|tabriz|shiraz|isfahan/u', $place);
            $okType = preg_match('/painting|folio|illustrat|manuscript|drawing/i', ($o['classification'] ?? '') . ' ' . ($o['objectName'] ?? ''));
            $dup = array_filter($w['items'][$k], fn($x) => $x['id'] === 'met' . $id);
            if ($okPlace && $okType && !$dup && count($w['items'][$k]) < $R['max']) {
              $w['items'][$k][] = ['id' => 'met' . $id, 'title' => (string)$o['title'], 'artist' => (string)(($o['artistDisplayName'] ?? '') ?: ($o['culture'] ?? '')), 'date' => (string)($o['objectDate'] ?? ''),
                'url' => (string)$o['primaryImageSmall'], 'aspect' => 0, 'source' => 'The Metropolitan Museum of Art', 'link' => (string)($o['objectURL'] ?? ''), 'license' => 'CC0'];
            }
          } elseif ($o === null) { $w['errors']++; $w['metFail'] = ($w['metFail'] ?? 0) + 1; }
          if (count($w['items'][$k]) >= $R['max']) $w['queue'] = [];
          $w['msg'] = 'بررسی نگاره‌های ایرانی (' . count($w['items'][$k]) . ' تا اینجا)';
          continue;
        }
        if ($w['sub'] < count($R['queries']) && count($w['items'][$k]) < $R['max']) {
          $q = $R['queries'][$w['sub']];
          $j = http_json('https://collectionapi.metmuseum.org/public/collection/v1/search?' . http_build_query(['hasImages' => 'true', 'departmentId' => 14, 'q' => $q]));
          $w['queue'] = array_slice(array_map('intval', $j['objectIDs'] ?? []), 0, 45);
          if ($j === null) { $w['errors']++; $w['metFail'] = ($w['metFail'] ?? 0) + 1; }
          $w['sub']++; $w['msg'] = 'جستجوی نگارگری در موزهٔ متروپولیتن: ' . $q;
          continue;
        }
        $w['csub'] = $w['csub'] ?? 0;
        if (count($w['items'][$k]) < 12 && $w['csub'] < count(PERSIAN_COMMONS)) {
          $q = PERSIAN_COMMONS[$w['csub']++];
          $sj = http_json('https://commons.wikimedia.org/w/api.php?' . http_build_query(['action' => 'query', 'format' => 'json', 'formatversion' => 2, 'list' => 'search', 'srnamespace' => 6, 'srlimit' => 30, 'srsearch' => $q]));
          if ($sj === null) { $w['errors']++; $w['commonsFail'] = ($w['commonsFail'] ?? 0) + 1; }
          $titles = array_values(array_filter(array_map(fn($x) => $x['title'], $sj['query']['search'] ?? []), fn($t) => preg_match('/\.jpe?g$/i', $t)));
          foreach (array_chunk($titles, 20) as $chunk) {
            $ij = http_json('https://commons.wikimedia.org/w/api.php?' . http_build_query(['action' => 'query', 'format' => 'json', 'formatversion' => 2, 'prop' => 'imageinfo', 'iiprop' => 'url|size|mime|extmetadata', 'iiurlwidth' => 1600, 'iiextmetadatafilter' => 'LicenseShortName|Artist|ObjectName|DateTimeOriginal', 'titles' => implode('|', $chunk)]));
            foreach (($ij['query']['pages'] ?? []) as $pg) {
              if (count($w['items'][$k]) >= $R['max']) break 2;
              $ii = $pg['imageinfo'][0] ?? null; if (!$ii || empty($ii['height'])) continue;
              $r = $ii['width'] / $ii['height']; if ($r < .35 || $r > 2.6 || $ii['width'] < 700) continue;
              $m = $ii['extmetadata'] ?? []; $lic = (string)($m['LicenseShortName']['value'] ?? '');
              if (!preg_match('/public domain|cc0|^pd/i', $lic)) continue;
              $id = 'wc' . substr(sha1((string)$pg['title']), 0, 10);
              foreach ($w['items'][$k] as $x) if ($x['id'] === $id) continue 2;
              $title = clean_html((string)($m['ObjectName']['value'] ?? '')) ?: preg_replace('/^File:|\.[a-z]+$/i', '', (string)$pg['title']);
              $w['items'][$k][] = ['id' => $id, 'title' => mb_substr($title, 0, 120), 'artist' => mb_substr(clean_html((string)($m['Artist']['value'] ?? '')), 0, 80), 'date' => mb_substr(clean_html((string)($m['DateTimeOriginal']['value'] ?? '')), 0, 40),
                'url' => (string)($ii['thumburl'] ?? $ii['url']), 'aspect' => $r, 'source' => 'Wikimedia Commons', 'link' => (string)($ii['descriptionurl'] ?? ''), 'license' => $lic];
            }
          }
          $w['msg'] = 'جستجوی نگارگری در ویکی‌مدیا: ' . $q . ' (' . count($w['items'][$k]) . ' اثر)';
          continue;
        }
      }
      // room finished
      $w['items'][$k] = array_slice($w['items'][$k], 0, $R['max']);
      $w['room']++; $w['sub'] = 0; $w['queue'] = [];
      continue;
    }
    if ($w['phase'] === 'download') {
      $next = null;
      foreach ($w['items'] as $rk => $list) { foreach ($list as $i => $it) { if (!isset($it['file']) && empty($it['failed'])) { $next = [$rk, $i]; break 2; } } }
      if (!$next) { museum_finish($w, $dir); return; }
      [$rk, $i] = $next; $it = &$w['items'][$rk][$i];
      $name = preg_replace('/[^a-z0-9]+/', '-', strtolower($rk . '-' . $it['id'])) . '.jpg';
      $bin = is_file("$dir/$name") ? (string)file_get_contents("$dir/$name") : http_get($it['url'], 40);
      if ($bin !== null && strlen($bin) > 2000 && substr($bin, 0, 2) === "\xFF\xD8") {
        if (!is_file("$dir/$name")) file_put_contents("$dir/$name", $bin);
        $sz = @getimagesizefromstring($bin);
        $it['file'] = 'art/' . $name; if ($sz) { $it['w'] = $sz[0]; $it['h'] = $sz[1]; }
      } else { $it['failed'] = true; $w['errors']++; }
      unset($it);
      $w['done']++; $w['msg'] = 'دانلود تابلوها';
      continue;
    }
    return;
  }
}
function museum_finish(array &$w, string $dir): void {
  global $ROOMS;
  $rooms = [];
  $old = !empty($w['only']) ? load_json("$dir/manifest.json", ['rooms' => []]) : ['rooms' => []];
  $oldBy = []; foreach (($old['rooms'] ?? []) as $r) $oldBy[$r['key']] = $r;
  foreach ($ROOMS as $R) {
    $items = [];
    if (!empty($w['only']) && $w['only'] !== $R['key']){ if (isset($oldBy[$R['key']])) $rooms[] = $oldBy[$R['key']]; continue; }
    foreach (($w['items'][$R['key']] ?? []) as $it) { if (!isset($it['file'])) continue; unset($it['url'], $it['failed']); $items[] = $it; }
    if ($items) $rooms[] = ['key' => $R['key'], 'name' => $R['name'], 'items' => $items];
    $w['report'][$R['name']] = count($items);
  }
  save_json("$dir/manifest.json", ['generated' => gmdate('c'), 'rooms' => $rooms]);
  $w['phase'] = 'done'; $w['msg'] = 'تمام شد';
}

/* ---------------- tour job ---------------- */
function tour_free(string $lic): bool { return (bool)preg_match('/(^|\b)(cc0|cc[ -]by|public domain|pd[- ]|no restrictions|attribution)/i', $lic) && !preg_match('/(-nc|-nd| nc| nd|noncommercial|noderiv|fair use)/i', $lic); }
function tour_step(array &$w, string $dir, array $places, int $per): void {
  while (elapsed() < BUDGET) {
    if ($w['phase'] === 'build') {
      if ($w['p'] >= count($places)) { $w['phase'] = 'download'; continue; }
      $P = $places[$w['p']]; $name = $P[0];
      $qs = $P[2]; $base = preg_replace('/ 360$/', '', $qs[0]); $qs = array_values(array_unique(array_merge($qs, [$base . ' spherical', $base . ' equirectangular', $base])));
      $found = $w['items'][$name] ?? [];
      if ($w['q'] < count($qs) && count($found) < $per) {
        $sj = http_json('https://commons.wikimedia.org/w/api.php?' . http_build_query(['action' => 'query', 'format' => 'json', 'formatversion' => 2, 'list' => 'search', 'srnamespace' => 6, 'srlimit' => 40, 'srsearch' => $qs[$w['q']]]));
        if ($sj === null) $w['errors']++;
        $titles = array_values(array_filter(array_map(fn($x) => $x['title'], $sj['query']['search'] ?? []), fn($t) => preg_match('/\.(jpe?g|png)$/i', $t)));
        foreach (array_chunk($titles, 20) as $chunk) {
          if (count($found) >= $per) break;
          $ij = http_json('https://commons.wikimedia.org/w/api.php?' . http_build_query(['action' => 'query', 'format' => 'json', 'formatversion' => 2, 'prop' => 'imageinfo', 'iiprop' => 'url|size|mime|extmetadata', 'iiurlwidth' => 3840, 'iiextmetadatafilter' => 'LicenseShortName|Artist|LicenseUrl', 'titles' => implode('|', $chunk)]));
          foreach (($ij['query']['pages'] ?? []) as $pg) {
            $ii = $pg['imageinfo'][0] ?? null; if (!$ii || empty($ii['height'])) continue;
            $r = $ii['width'] / $ii['height']; if ($r < 1.96 || $r > 2.04 || $ii['width'] < 2400) continue;
            $m = $ii['extmetadata'] ?? []; $lic = (string)($m['LicenseShortName']['value'] ?? '');
            if (!tour_free($lic)) continue;
            foreach ($found as $f) if ($f['page'] === ($ii['descriptionurl'] ?? '')) continue 2;
            $found[] = ['title' => preg_replace('/^File:|\.[a-z]+$/i', '', (string)$pg['title']), 'url' => (string)($ii['thumburl'] ?? $ii['url']), 'page' => (string)($ii['descriptionurl'] ?? ''),
              'artist' => clean_html((string)($m['Artist']['value'] ?? '')) ?: 'نامشخص', 'license' => $lic, 'licenseUrl' => (string)($m['LicenseUrl']['value'] ?? '')];
            if (count($found) >= $per) break;
          }
        }
        $w['items'][$name] = $found; $w['q']++; $w['msg'] = 'جستجوی عکس ۳۶۰: ' . $name;
        continue;
      }
      $w['items'][$name] = $found; $w['p']++; $w['q'] = 0;
      continue;
    }
    if ($w['phase'] === 'download') {
      $next = null;
      foreach ($w['items'] as $pn => $list) { foreach ($list as $i => $it) { if (!isset($it['file']) && empty($it['failed'])) { $next = [$pn, $i]; break 2; } } }
      if (!$next) { tour_finish($w, $dir); return; }
      [$pn, $i] = $next; $it = &$w['items'][$pn][$i];
      $name = substr(sha1($pn . $it['page']), 0, 16) . '.jpg';
      $bin = is_file("$dir/$name") ? (string)file_get_contents("$dir/$name") : http_get($it['url'], 60);
      if ($bin !== null && strlen($bin) > 5000 && substr($bin, 0, 2) === "\xFF\xD8") { if (!is_file("$dir/$name")) file_put_contents("$dir/$name", $bin); $it['file'] = 'pano/' . $name; }
      else { $it['failed'] = true; $w['errors']++; }
      unset($it);
      $w['done']++; $w['msg'] = 'دانلود عکس‌های ۳۶۰ درجه';
      continue;
    }
    return;
  }
}
function tour_finish(array &$w, string $dir): void {
  $out = [];
  foreach ($w['items'] as $pn => $list) { $ok = []; foreach ($list as $it) { if (!isset($it['file'])) continue; unset($it['url'], $it['failed']); $ok[] = $it; } $out[$pn] = $ok; }
  save_json("$dir/manifest.json", ['generated' => gmdate('c'), 'places' => $out]);
  $w['phase'] = 'done'; $w['msg'] = 'تمام شد';
}

/* ---------------- 3D models job (Smithsonian Voyager packages) ---------------- */
const MODEL_MAX = 45 * 1048576;   // skip a single glb larger than this
const QUALITY_ORDER = ['Low', 'Medium', 'Thumb', 'High'];
function svx_url(string $id, string $file, int $variant): string { return 'https://3d-api.si.edu/content/document/' . ($variant ? '' : '3d_package:') . $id . '/' . $file; }
function safe_rel(string $uri): ?string { $uri = rawurldecode($uri); return (preg_match('#^[A-Za-z0-9][A-Za-z0-9 ._()/-]*\.glb$#', $uri) && !str_contains($uri, '..')) ? $uri : null; }
function enc_rel(string $rel): string { return implode('/', array_map('rawurlencode', explode('/', $rel))); }
function models_step(array &$w, string $dir, array $objs, array $have): void {
  while (elapsed() < BUDGET) {
    if ($w['phase'] === 'build') {
      if ($w['p'] >= count($objs)) { $w['phase'] = 'download'; continue; }
      $O = $objs[$w['p']]; $k = $O['key'];
      if (isset($have[$k]) || !preg_match('/^[0-9a-f-]{36}$/', (string)$O['id'])) { $w['p']++; continue; }
      $doc = null; $variant = 0;
      foreach ([0, 1] as $v) { $b = http_get(svx_url($O['id'], 'document.json', $v), 30); $j = $b === null ? null : json_decode($b, true); if (is_array($j) && !empty($j['models'])) { $doc = $b; $variant = $v; break; } }
      if ($doc === null) { $w['errors']++; $w['fail'][$O['fa']] = 'سند مدل از سرور اسمیتسونین دریافت نشد'; $w['p']++; $w['msg'] = 'دریافت نشد: ' . $O['en']; continue; }
      $j = json_decode($doc, true); $picks = [];
      foreach ($j['models'] as $mi => $M) {
        $best = null;
        foreach (QUALITY_ORDER as $q) {
          foreach (($M['derivatives'] ?? []) as $D) {
            if (($D['usage'] ?? '') !== 'Web3D' || ($D['quality'] ?? '') !== $q) continue;
            foreach (($D['assets'] ?? []) as $A) {
              if (($A['type'] ?? '') !== 'Model') continue;
              $rel = safe_rel((string)($A['uri'] ?? '')); if ($rel === null) continue;
              if (!empty($A['byteSize']) && (int)$A['byteSize'] > MODEL_MAX) continue;
              $best = ['index' => $mi, 'quality' => $q, 'uri' => (string)$A['uri'], 'file' => $rel, 'bytes' => (int)($A['byteSize'] ?? 0)]; break 3;
            }
          }
        }
        if ($best) $picks[] = $best;
      }
      if (!$picks) { $w['errors']++; $w['fail'][$O['fa']] = 'نسخهٔ glb مناسب نداشت'; $w['p']++; continue; }
      if (!is_dir("$dir/$k")) @mkdir("$dir/$k", 0755, true);
      file_put_contents("$dir/$k/document.json", $doc);
      $w['items'][$k] = ['fa' => $O['fa'], 'base' => svx_url($O['id'], '', $variant), 'picks' => $picks];
      $w['p']++; $w['msg'] = 'آماده شد: ' . $O['en'];
      continue;
    }
    if ($w['phase'] === 'download') {
      $next = null;
      foreach ($w['items'] as $k => $it) foreach ($it['picks'] as $i => $p) if (empty($p['done']) && empty($p['failed'])) { $next = [$k, $i]; break 2; }
      if (!$next) { models_finish($w, $dir, $objs, $have); return; }
      [$k, $i] = $next; $p = &$w['items'][$k]['picks'][$i];
      $dest = "$dir/$k/" . $p['file'];
      $n = is_file($dest) ? (int)filesize($dest) : http_download($w['items'][$k]['base'] . enc_rel(rawurldecode($p['uri'])), $dest);
      $head = $n ? (string)file_get_contents($dest, false, null, 0, 4) : '';
      if ($n && $head === 'glTF') { $p['done'] = true; $p['bytes'] = $n; $w['bytes'] = ($w['bytes'] ?? 0) + $n; }
      else { if ($n) @unlink($dest); $p['failed'] = true; $w['errors']++; $w['fail'][$w['items'][$k]['fa']] = 'دانلود فایل مدل کامل نشد'; }
      unset($p);
      $w['done']++; $w['msg'] = 'دانلود مدل‌های سه‌بعدی';
      continue;
    }
    return;
  }
}
function models_finish(array &$w, string $dir, array $objs, array $have): void {
  $out = $have;
  foreach ($w['items'] as $k => $it) {
    $ok = array_values(array_filter($it['picks'], fn($p) => !empty($p['done'])));
    if (!$ok || count($ok) < count($it['picks'])) continue;     // all parts or nothing
    $out[$k] = ['doc' => "models/$k/document.json", 'base' => "models/$k/", 'models' => array_map(fn($p) => ['index' => $p['index'], 'quality' => $p['quality'], 'file' => $p['file'], 'bytes' => $p['bytes']], $ok)];
  }
  foreach ($objs as $O) { $w['report'][$O['fa']] = isset($out[$O['key']]) ? 1 : 0; }
  save_json("$dir/manifest.json", ['generated' => gmdate('c'), 'objects' => $out]);
  $w['phase'] = 'done'; $w['msg'] = 'تمام شد';
}

/* ---------------- page ---------------- */
$job = $_GET['job'] ?? '';
$jobs = [
  'museum' => ['dir' => "$ROOT/museum/art", 'title' => 'تابلوهای موزهٔ مجازی', 'app' => '../museum/'],
  'tour'   => ['dir' => "$ROOT/tour/pano",  'title' => 'عکس‌های سفر ۳۶۰',    'app' => '../tour/'],
  'persian'=> ['dir' => "$ROOT/museum/art", 'title' => 'تالار نگارگری ایرانی', 'app' => '../museum/', 'only' => 'persian'],
  'models' => ['dir' => "$ROOT/museum3d/models", 'title' => 'مدل‌های سه‌بعدی موزه', 'app' => '../museum3d/', 'only' => 'models'],
];
if ($job === 'models') @set_time_limit(300);
$out = ''; $refresh = false;
if (isset($jobs[$job])) {
  $J = $jobs[$job]; $dir = $J['dir'];
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) { $out = '<p class="err">ساخت پوشهٔ ' . h($dir) . ' ممکن نشد. دسترسی نوشتن پوشه را در File Manager بررسی کن.</p>'; }
  elseif ($job === 'models' && !is_file("$ROOT/museum3d/objects.json")) { $out = '<p class="err">فایل museum3d/objects.json پیدا نشد. پوشهٔ museum3d را کامل آپلود کن.</p>'; }
  elseif ($job === 'models' && is_file("$dir/manifest.json") && !is_file("$dir/_work_models.json") && count(load_json("$dir/manifest.json", [])['objects'] ?? []) >= count(load_json("$ROOT/museum3d/objects.json", [])['objects'] ?? [])) {
    $out = '<p class="ok">همهٔ مدل‌ها قبلاً روی سایت دانلود شده‌اند.</p><p><a class="btn" href="' . h($J['app']) . '">باز کردن موزه</a></p><p class="muted">برای دانلود دوباره، فایل manifest.json را از پوشهٔ museum3d/models پاک کن.</p>';
  }
  elseif (is_file("$dir/manifest.json") && empty($J['only'])) {
    $m = load_json("$dir/manifest.json", []);
    $n = $job === 'museum' ? array_sum(array_map(fn($r) => count($r['items']), $m['rooms'] ?? [])) : array_sum(array_map('count', $m['places'] ?? []));
    $out = '<p class="ok">این کار قبلاً انجام شده: ' . $n . ' تصویر روی سایت هست.</p><p><a class="btn" href="' . h($J['app']) . '">باز کردن برنامه</a></p><p class="muted">برای دانلود دوباره، فایل manifest.json را از پوشهٔ ' . h(basename(dirname($dir)) . '/' . basename($dir)) . ' پاک کن.</p>';
  } else {
    $lock = @fopen("$dir/_lock", 'c');
    if ($lock && !flock($lock, LOCK_EX | LOCK_NB)) { $out = '<p>یک مرحلهٔ دیگر در حال اجراست…</p>'; $refresh = true; }
    else {
      $wf = "$dir/_work" . (empty($J['only']) ? '' : '_' . $J['only']) . ".json";
      $w = load_json($wf, ['phase' => 'build', 'room' => 0, 'sub' => 0, 'queue' => [], 'p' => 0, 'q' => 0, 'items' => [], 'done' => 0, 'errors' => 0, 'msg' => 'شروع', 'only' => $J['only'] ?? '']);
      if ($job === 'models') { $objs = load_json("$ROOT/museum3d/objects.json", [])['objects'] ?? []; $have = load_json("$dir/manifest.json", [])['objects'] ?? []; $have = array_intersect_key($have, array_flip(array_map(fn($o) => $o['key'], $objs))); foreach ($have as $hk => $hv) foreach ($hv['models'] as $hm) if (!is_file("$dir/$hk/" . $hm['file'])) { unset($have[$hk]); break; } models_step($w, $dir, $objs, $have); }
      elseif ($job === 'museum' || $job === 'persian') museum_step($w, $dir);
      else { $pl = load_json("$ROOT/tour/places.json", ['iran' => [], 'world' => []]); $per = max(1, min(3, (int)($_GET['per'] ?? 1))); tour_step($w, $dir, array_merge($pl['iran'], $pl['world']), $per); }
      save_json($wf, $w);
      if ($lock){ flock($lock, LOCK_UN); fclose($lock); }
      $total = $job === 'models' ? array_sum(array_map(fn($it) => count($it['picks']), $w['items'])) : array_sum(array_map('count', $w['items']));
      if ($w['phase'] === 'done') {
        @unlink($wf); @unlink("$dir/_lock");
        $rep = '';
        foreach (($w['report'] ?? []) as $rn => $c) $rep .= '<li>' . h($rn) . ': ' . $c . ($c ? '' : ' <span class="err">(چیزی پیدا نشد)</span>') . '</li>';
        if (!empty($w['metFail'])) $rep .= '<li class="muted">موزهٔ متروپولیتن از این سرور ' . $w['metFail'] . ' بار جواب نداد؛ به جایش از ویکی‌مدیا استفاده شد.</li>';
        if ($job === 'models') { $rep = ''; foreach (($w['report'] ?? []) as $rn => $c) $rep .= '<li>' . h($rn) . ': ' . ($c ? '<span class="ok">روی سایت است</span>' : '<span class="err">' . h($w['fail'][$rn] ?? 'دریافت نشد') . '</span>') . '</li>'; if (!empty($w['bytes'])) $rep .= '<li class="muted">حجم دانلود این بار: ' . round($w['bytes'] / 1048576, 1) . ' مگابایت</li>'; if (array_sum($w['report'] ?? []) < count($w['report'] ?? [])) $rep .= '<li class="muted">برای امتحان دوبارهٔ موارد جامانده، همین دکمه را دوباره بزن؛ موارد دانلودشده دوباره گرفته نمی‌شوند.</li>'; }
        if (!empty($w['commonsFail'])) $rep .= '<li class="err">ویکی‌مدیا هم از این سرور ' . $w['commonsFail'] . ' بار جواب نداد.</li>';
        $out = '<p class="ok">تمام شد! ' . $w['done'] . ($job === 'models' ? ' فایل مدل' : ' تصویر') . ' دانلود شد' . ($w['errors'] ? ' (' . $w['errors'] . ' مورد خطا داشت و کنار گذاشته شد)' : '') . '.</p>' . ($rep ? '<ul>' . $rep . '</ul>' : '') . '<p><a class="btn" href="' . h($J['app']) . '">باز کردن برنامه</a></p>';
      } else {
        $pct = $w['phase'] === 'build' ? 5 : (int)round(5 + 95 * $w['done'] / max(1, $total));
        $out = '<p>' . h($w['msg']) . '</p><div class="bar"><i style="width:' . $pct . '%"></i></div><p class="muted">' . ($w['phase'] === 'build' ? 'مرحلهٔ ۱ از ۲: پیدا کردن تصاویر' : 'مرحلهٔ ۲ از ۲: ' . $w['done'] . ' از ' . $total . ' دانلود شد') . ' · خطا: ' . $w['errors'] . '</p><p class="muted">این صفحه را نبند؛ خودش ادامه می‌دهد.</p>';
        $refresh = true;
      }
    }
  }
}
$self = h(strtok($_SERVER['REQUEST_URI'] ?? 'fetch-images.php', '?'));
?><!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<?php if ($refresh): ?><meta http-equiv="refresh" content="1"><?php endif; ?>
<title>بارگذاری تصاویر روی سایت</title>
<style>
:root{--bg:#120f0c;--ink:#f6efe4;--muted:#b4a796;--accent:#f0a742;--ok:#7bd88f;--err:#ff8a8a;color-scheme:dark}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.9 Vazirmatn,Tahoma,sans-serif}
main{max-width:640px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-left,0px))}
h1{font-size:26px;margin:0 0 6px;color:var(--accent)}
.card{background:#1c1814;border:1px solid rgba(246,239,228,.14);border-radius:14px;padding:16px 18px;margin:14px 0}
.btn{display:inline-block;background:var(--accent);color:#1e1406;text-decoration:none;font-weight:800;border-radius:10px;padding:10px 16px}
.muted{color:var(--muted);font-size:13.5px}.ok{color:var(--ok)}.err{color:var(--err)}
.bar{height:12px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden}.bar i{display:block;height:100%;background:var(--accent)}
</style></head><body><main>
<h1>بارگذاری تصاویر روی سایت</h1>
<?php if ($job && isset($jobs[$job])): ?>
  <div class="card"><b><?= h($jobs[$job]['title']) ?></b><?= $out ?></div>
  <p><a href="<?= $self ?>">→ بازگشت</a></p>
<?php else: ?>
  <p class="muted">هر دکمه تصاویر لازم را یک بار روی همین سایت دانلود می‌کند تا برنامه‌ها بدون وابستگی به سرورهای خارجی کار کنند. این کار چند دقیقه طول می‌کشد.</p>
  <div class="card"><b>موزهٔ مجازی</b><p class="muted">حدود ۱۵۰ تابلو با مجوز آزاد CC0 از موزهٔ هنر شیکاگو و نگارگری ایرانی از موزهٔ متروپولیتن · حدود ۵۰ مگابایت</p><a class="btn" href="?job=museum">دانلود تابلوها</a><p class="muted">اگر تالار نگارگری ایرانی خالی ماند، فقط همان را دوباره بگیر (بقیهٔ تالارها دست نمی‌خورند):</p><a class="btn" href="?job=persian">دریافت دوبارهٔ نگارگری ایرانی</a></div>
  <div class="card"><b>موزهٔ اشیای واقعی (سه‌بعدی)</b><p class="muted">مدل‌های سه‌بعدی اسکن‌شدهٔ موزه‌های اسمیتسونین: دایناسورها، ماموت، هواپیمای برادران رایت، کپسول آپولو ۱۱، شاتل دیسکاوری و… · بین ۴۰ تا ۲۰۰ مگابایت، بسته به نسخه‌ای که موزه گذاشته</p><a class="btn" href="?job=models">دانلود مدل‌ها</a></div>
  <div class="card"><b>سفر ۳۶۰</b><p class="muted">برای هر مکان یک عکس کروی با مجوز آزاد از ویکی‌مدیا کامنز · حدود ۱۰۰ مگابایت</p><a class="btn" href="?job=tour">دانلود عکس‌های ۳۶۰</a> <a class="muted" href="?job=tour&amp;per=2">(یا ۲ عکس برای هر مکان)</a></div>
<?php endif; ?>
</main></body></html>
