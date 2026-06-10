# أوامر إغلاق الأخطاء نهائيًا / Close errors for good

شغّل الأوامر دي في المشروع (من مجلد الجذر):

```bash
npm i
npm i @zxing/browser
```

ثم احذف مجلد البناء وشغّل التطبيق:

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev:all
```

**Windows (CMD) أو أي نظام:**
```bash
rmdir /s /q .next 2>nul
npm run dev:all
```

بعدها تأكد من:
- `/store-admin/branches` — تُفتح بدون crash
- `/pos` — زر المسح بالكاميرا يعمل أو يظهر رسالة واضحة إن ZXing غير متاح
- الملف `app/components/Sidebar.tsx` (حرف S كبير) والاستيراد الموحّد: `@/components/Sidebar`

---

**في الريبو الموجود على السيرفر (online deployment):** انسخ نفس التعديلات:
1. `tsconfig.json` — وجود `"baseUrl": "."` و `"paths": { "@/*": ["./app/*"] }`
2. كل استيرادات الـ Sidebar تكون `from '@/components/Sidebar'` (ولا تستخدم `../` أو `../../` لـ Sidebar)
