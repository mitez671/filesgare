# Phone Agent — کنترل گوشی با Claude Code

```
┌──────────── گوشی اندروید ─────────────────────────────────────┐
│                                                              │
│  Termux → Ubuntu → Claude Code   (مغز: تصمیم می‌گیرد)          │
│                │  MCP (stdio)                                │
│          phone_mcp.py            (مترجم: ابزارها)             │
│                │  HTTP روی 127.0.0.1:8765 + توکن              │
│  اپ Phone Agent (Accessibility)  (چشم و دست)                  │
│     اسکرین‌شات · خواندن صفحه · کلیک · سوایپ · تایپ · دکمه‌ها       │
└──────────────────────────────────────────────────────────────┘
```

Claude Code خودش هوش مصنوعی است، پس **کلید API جداگانه لازم نیست**؛ همان اشتراکی که Claude Code با آن لاگین است کافی است. همه‌چیز روی خود گوشی اجرا می‌شود و سرور فقط روی `127.0.0.1` گوش می‌دهد (از شبکه قابل دسترس نیست).

## پیش‌نیازها
- اندروید ۱۱ یا بالاتر
- Termux + اوبونتو (proot-distro) با Claude Code نصب‌شده
- یک حساب GitHub (فقط برای ساختن APK، رایگان)

---

## مرحلهٔ ۱: ساختن APK با GitHub Actions

1. در github.com یک ریپوی **خالی و Private** بساز، مثلاً `phone-agent`.
2. در اوبونتوی Termux:
   ```bash
   apt install -y git unzip python3
   cd ~ && unzip --- (در این ریپو، پوشهٔ phone-agent)
   cd phone-agent
   git init && git add . && git commit -m "phone agent"
   git branch -M main
   git remote add origin https://github.com/<USERNAME>/phone-agent.git
   git push -u origin main
   ```
   برای پسورد، یک **Personal Access Token** از GitHub › Settings › Developer settings بساز و به‌جای پسورد بزن.
3. در صفحهٔ ریپو برو به تب **Actions** ← اجرای «Build APK» (حدود ۴ دقیقه) ← پایین صفحه، بخش Artifacts، فایل **PhoneAgent-apk** را دانلود کن. داخلش `app-release.apk` است.

> فایل‌ها از گوشی در Termux معمولاً در `/sdcard/Download` هستند؛ اول `termux-setup-storage` را بزن.

## مرحلهٔ ۲: نصب و روشن کردن اپ
1. APK را نصب کن (اجازهٔ نصب از منابع ناشناس را بده).
2. اپ **Phone Agent** را باز کن ← دکمهٔ «روشن کردن در تنظیمات دسترسی‌پذیری» ← Phone Agent را روشن کن.
   - **اندروید ۱۳ به بالا:** اگر گزینه خاکستری بود: Settings › Apps › Phone Agent › منوی ⋮ › **Allow restricted settings**، بعد دوباره امتحان کن.
3. به اپ برگرد؛ باید سبز بنویسد «روشن».
4. **شیائومی/سامسونگ/هواوی:** در تنظیمات باتری، Phone Agent و Termux را «بدون محدودیت» کن تا سیستم آن‌ها را نبندد.

## مرحلهٔ ۳: وصل کردن به Claude Code
در اپ دکمهٔ **«کپی دستور»** را بزن و در اوبونتوی Termux پیست کن. شبیه این است:
```bash
claude mcp add phone -s user -e PHONE_TOKEN=xxxx -e PHONE_URL=http://127.0.0.1:8765 \
  -- python3 ~/phone-agent/mcp/phone_mcp.py
```
تست سریع بدون Claude:
```bash
export PHONE_TOKEN=xxxx
python3 ~/phone-agent/mcp/phonectl.py info
python3 ~/phone-agent/mcp/phonectl.py tree
```

## مرحلهٔ ۴: استفاده
```bash
cd ~/phone-agent/mcp      # تا CLAUDE.md (قوانین کار با گوشی) خوانده شود
claude
```
و بگو مثلاً:
- «تلگرام رو باز کن و بگو آخرین پیام‌های گروه X چیه»
- «تو تنظیمات، Wi-Fi رو چک کن»
- «یوتیوب رو باز کن و دنبال آموزش پایتون بگرد»

> نکته: وقتی Claude کار می‌کند، Termux باید در پس‌زمینه باز بماند. می‌توانی با Split-screen یا پنجرهٔ شناور Termux کار را تماشا کنی.

---

## ابزارهایی که Claude دارد
| ابزار | کار |
|---|---|
| `phone_ui_tree` | خواندن متن‌ها و دکمه‌های صفحه با مختصات (سریع و دقیق) |
| `phone_screenshot` | دیدن تصویر صفحه |
| `phone_tap` / `phone_long_press` | کلیک / نگه داشتن |
| `phone_swipe` / `phone_scroll` | کشیدن / اسکرول |
| `phone_type` | تایپ (فارسی هم کار می‌کند) |
| `phone_click_text` | کلیک روی چیزی که این متن را دارد |
| `phone_key` | back, home, recents, notifications, quick_settings, lock, enter |
| `phone_open_app` / `phone_list_apps` | باز کردن و فهرست برنامه‌ها |
| `phone_wait` | صبر برای بارگذاری صفحه |

## امنیت
- سرور فقط روی `127.0.0.1` است و هر درخواست توکن ۱۲۸ بیتی می‌خواهد. توکن را به کسی نده؛ اگر لو رفت، در اپ «توکن جدید» بزن.
- کلید **«توقف موقت»** در اپ فوراً همهٔ دسترسی‌ها را قطع می‌کند. برای خاموشی کامل، سرویس را در تنظیمات دسترسی‌پذیری خاموش کن.
- `CLAUDE.md` به Claude می‌گوید قبل از ارسال پیام، پرداخت، حذف یا تغییر تنظیمات حساب از تو بپرسد و هیچ‌وقت پسورد یا کد تأیید تایپ نکند.
- تصاویر صفحه برای پردازش به سرورهای Anthropic فرستاده می‌شوند (مثل هر چیز دیگری که به Claude می‌دهی). برنامه‌های حساس را هنگام کار با عامل باز نکن.

## رفع مشکل
| مشکل | راه‌حل |
|---|---|
| `cannot reach the Phone Agent app` | سرویس دسترسی‌پذیری خاموش شده؛ دوباره روشنش کن (بعد از ری‌استارت یا بستن توسط سیستم) |
| `401 bad or missing token` | توکن عوض شده؛ دستور را دوباره از اپ کپی کن (اول `claude mcp remove phone -s user`) |
| `too fast, wait` | اندروید بین اسکرین‌شات‌ها حدود ۱ ثانیه فاصله می‌خواهد |
| `screen is protected` | اپ‌های بانکی اسکرین‌شات را می‌بندند؛ Claude از `phone_ui_tree` استفاده می‌کند |
| تایپ کار نمی‌کند | اول روی فیلد متن tap شود؛ بعضی اپ‌ها (بازی، کیبورد سفارشی) پشتیبانی نمی‌کنند |
| گزینهٔ دسترسی‌پذیری خاکستری است | Allow restricted settings (مرحلهٔ ۲) |

## ساختار پروژه
```
android/   سورس اپ (Kotlin، بدون کتابخانهٔ خارجی)
mcp/       phone_mcp.py (سرور MCP، فقط کتابخانهٔ استاندارد پایتون)
           phonectl.py  (تست دستی)   CLAUDE.md (قوانین برای Claude)
.github/workflows/build-apk.yml   ساخت خودکار APK
```
