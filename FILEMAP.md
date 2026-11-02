# FILEMAP — نقشهٔ فایل‌ها

هر چیزی کجاست و برای چیست.

## ریشهٔ ریپو

```
filesgare/
├── README.md            معرفی و راهنمای اجرا/انتقال
├── CLAUDE.md            قواعد و دام‌ها برای Claude
├── FILEMAP.md           همین نقشه
├── scripts/             اسکریپت‌های ترموکس (FTP)
│   ├── deploy-vr.sh     آپلود zip + استخراج روی سرور
│   ├── get-assets.sh    دانلود مدل/عکس از سمت سرور و ارسال با FTP
│   └── fix-cache.sh     اصلاح کش و مجوزها
├── vr-games/            ۷۹ بازی و محیط VR
├── anarshekan/          بازی مستقل انارشکن
├── zarb-shamshir/       بازی مستقل ضرب‌شمشیر
├── phone-agent/         عامل اندروید + سرور MCP
├── .github/workflows/   ساخت خودکار phone-agent
└── m.zip                آرشیو قدیمی
```

## داخل vr-games

| مسیر | کار |
|---|---|
| `index.html` | صفحهٔ اصلی (هاب) با کارت همهٔ بازی‌ها و تب بخش‌ها |
| `README-fa.md` | تاریخچهٔ تغییرات و بازبینی واقع‌گرایی |
| `_shared/three-r149.js` | موتور three.js |
| `_shared/cannon-0.6.2.js` | فیزیک (دو بازی) |
| `_shared/realism.js`، `_shared/realism/` | مصالح و بافت‌ها (سنگ، چوب، چمن، پارچه…) و تبدیل خودکار درخت |
| `_shared/models.js` | بارگذار مدل GLB |
| `_shared/models/*.glb` | مدل‌های ناسا: آپولو، فضانورد، هابل، وب، وویجر، ساترن ۵، شاتل، ایستگاه، پشتکار، نبوغ |
| `_shared/models/CREDITS-fa.md` | منبع و مجوز مدل‌ها |
| `_shared/gltf/` | بارگذارهای GLTF/Draco |
| `_shared/figure.js` | آدمک و تفنگ اسباب‌بازی |
| `_shared/earth.jpg`، `moon.jpg`، `clouds.png`، `lights.png` | بافت‌های سیاره‌ای |
| `tests/runtime-check.cjs` | آزمون اجرای هر بازی؛ `validation-report.json` نتیجهٔ آخر |
| `tools/fetch-images.php` | کار دانلود سمت سرور (مدل‌ها، عکس‌ها، پانوراما) |
| `tools/index.html` | صفحهٔ ابزارها |
| `museum3d/objects.json` | فهرست آثار گنجینه، تالار، ابعاد، `photoQueries` |
| `museum3d/lib/` | three.js به‌صورت ES module برای گنجینه |
| `museum3d/photos/` | عکس‌های واقعی آثار (بعد از `get-assets.sh photos`) |
| `museum/art/` | تابلوها و مصالح نگارخانه (فرش و…) |

## فهرست بازی‌ها

| پوشه | عنوان | فایل‌های کنار index.html |
|---|---|---|
| `anarshekan` | انارشکن | — |
| `aquarium` | آکواریوم | — |
| `archery` | کمان‌دار | — |
| `balloons` | بادکنک‌باز | — |
| `basket` | بسکتبال | — |
| `bowling` | بولینگ | — |
| `boxing` | ضرب‌مشت | — |
| `breaker` | دیوارشکن | — |
| `bubbles` | حباب‌ها | — |
| `build` | خانه‌سازی | — |
| `castle` | دژبان | — |
| `cinema` | سینما | — |
| `clay` | شکار بشقاب | — |
| `cleveland` | موزهٔ کلیولند | — |
| `coaster` | ترن هوایی | — |
| `connect4` | چهارتایی | — |
| `darts` | دارت | — |
| `daynight` | روز و شب زمین | — |
| `deepsea` | سفر به اعماق دریا | — |
| `dodge` | جاخالی | — |
| `dooz` | دوز | — |
| `escape` | خانهٔ رمزها (اتاق فرار AR) | — |
| `escape-vr` | اتاق‌های رمز: ۴ سناریو (موتور در `index.html`، هر سناریو `sc-<id>.js`؛ VR، صداهای CC0 در `sfx/`) | — |
| `drone` | پهپاد | — |
| `drums` | طبل‌زن | — |
| `english` | کلاس انگلیسی | — |
| `fishing` | ماهیگیری | — |
| `flights` | پروازهای زنده | — |
| `forest` | جنگل آرام | — |
| `galaxy` | کهکشان راه شیری | — |
| `goalkeeper` | دروازه‌بان | — |
| `golf` | مینی‌گلف | — |
| `hello-webxr` | Hello WebXR! - Mozilla Mixed Reality | `CREDITS.md`, `LICENSE`, `assets`, `bundle.js`, `res`, `src` |
| `hockey` | ایرهاکی | — |
| `iss` | ایستگاه فضایی | — |
| `juggle` | روپایی | — |
| `map` | زمین‌نما | `README-fa.md`, `atlas-room.js`, `atlas.css`, `earcut-2.2.4.js` |
| `mars` | مریخ | — |
| `maze` | هزارتو | — |
| `memory` | جفت‌ها | — |
| `meteor` | شهاب‌شکن | — |
| `molecules` | مولکول‌ها | — |
| `moon` | قدم زدن روی ماه | — |
| `museum` | نگارخانه | `README-fa.md`, `art`, `gallery-room.js`, `gallery.css` |
| `museum3d` | گنجینه | `lib`, `objects.json` |
| `nasa` | گالری ناسا | — |
| `paint` | نقاشی در هوا | — |
| `periodic` | جدول تناوبی | — |
| `piano` | پیانو | — |
| `pingpong` | پینگ‌پنگ | — |
| `plank` | لبهٔ آسمان | — |
| `poetry` | باغ شعر | — |
| `potd` | عکس روز | — |
| `quakes` | زمین‌لرزه‌های زنده | — |
| `race` | مسابقهٔ ماشین | — |
| `radio` | رادیو جهان | — |
| `reflex` | رفلکس | — |
| `robot` | دوئل با ربات | — |
| `rubik` | روبیک غول‌پیکر | — |
| `santur` | سنتورزن | — |
| `scale` | از اتم تا کهکشان | — |
| `seasons` | فصل‌ها | — |
| `shapes` | شکل‌های هندسی | — |
| `shield` | سپر و شمشیر | — |
| `simon` | سایمون | — |
| `sky` | آسمان شب | `data.json` |
| `slingshot` | تیرکمان | — |
| `snake` | مار | — |
| `snowball` | برف‌بازی | — |
| `solar` | منظومهٔ شمسی | — |
| `stacker` | برج بلند | — |
| `tour` | سفر ۳۶۰ | `places.json` |
| `tower` | برج‌ساز | — |
| `towers` | برج‌های جهان | — |
| `visualizer` | نورافشان | — |
| `wall` | دیوار | — |
| `weather` | آب‌وهوای جهان | — |
| `whack` | موش‌کوب | — |
| `wiki` | دانشنامهٔ جهان | — |
| `wizard` | جادوگر | — |
| `zarb-shamshir` | ضرب‌شمشیر | — |
| `zen` | باغ ذن | — |

## چه فایلی را برای چه کاری عوض کنم؟

- محتوا یا ظاهر یک بازی → `vr-games/<نام>/index.html`
- نور و بافت مشترک → `_shared/realism.js`
- مدل سه‌بعدی تازه → فایل GLB در `_shared/models/` + سطر در `CREDITS-fa.md` + `VRModels.place(...)`
- اثر تازه در گنجینه → `museum3d/objects.json`
- آهنگ آموزشی پیانو → شیء `SONGS` و فهرست `modes` در `vr-games/piano/index.html`
- کارت بازی در صفحهٔ اصلی → `vr-games/index.html`
