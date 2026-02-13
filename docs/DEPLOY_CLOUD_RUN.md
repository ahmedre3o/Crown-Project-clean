## Cloud Run Deploy – `crown-api` & `crown-web`

Region: **us-central1**  
Services: **crown-api**, **crown-web**

> ملاحظة: الأوامر هنا تُنفَّذ من جهازك/Cloud Shell بعد إعداد `gcloud` و اختيار المشروع الصحيح.

---

### 1. Deploy `crown-api` (Express backend)

المصدر الفعلي للباك إند في هذا الريبو هو مجلد `backend/`.

#### 1.1 أول نشر من المصدر (يدمج Cloud Build + Buildpacks)

من جذر المشروع:

```bash
gcloud run deploy crown-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated
```

هذا الأمر:

- يبني صورة من كود `backend/` (باستخدام Buildpacks أو Dockerfile إن وجد)
- ينشر الخدمة على Cloud Run باسم `crown-api` في `us-central1`
- يسمح بالوصول العام (يمكن تعطيله لو هتستخدم فقط من الـ Load Balancer)

#### 1.2 تهيئة المتغيرات (بيئة الإنتاج)

يمكنك تعديل الخدمة لاحقًا لضبط متغيرات البيئة (بدون إعادة رفع الكود):

```bash
gcloud run services update crown-api \
  --region us-central1 \
  --set-env-vars \
NODE_ENV=production,\
DB_MODE=ip,\
DB_HOST=YOUR_DB_HOST,\
DB_PORT=3306,\
DB_USER=YOUR_DB_USER,\
DB_PASSWORD=YOUR_DB_PASSWORD,\
DB_NAME=YOUR_DB_NAME,\
DB_SSL=true,\
JWT_SECRET=YOUR_JWT_SECRET,\
GEMINI_API_KEY=YOUR_GEMINI_KEY,\
CORS_ORIGIN=https://crowncs.org,https://www.crowncs.org,\
DOMAIN_OVERRIDE=api.crowncs.org
```

اضبط القيم الحقيقية (`YOUR_...`) حسب إعداداتك الحالية/أسرارك في Secret Manager.

---

### 2. Deploy `crown-web` (Next.js frontend)

المصدر هو جذر الريبو (Next.js App Router في مجلد `app/`).

#### 2.1 نشر من الـ source مباشرة

من جذر المشروع:

```bash
gcloud run deploy crown-web \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Cloud Run / Cloud Build هيتولى:

- تثبيت الـ dependencies
- تشغيل build لـ Next.js
- إنشاء صورة production-ready

> تأكد أن كودك في الـ main branch جاهز للإنتاج (API_BASE_URL = `/erp-api`، لا يوجد أي `localhost` في الـ frontend).

---

### 3. Continuous Deploy من GitHub

لو عايز نشر تلقائي من GitHub:

1. افتح **Cloud Run → Services → Deploy from source**.
2. اربط الريبو من GitHub (باستخدام Cloud Build أو Cloud Deploy).
3. أنشئ **خدمة** جديدة `crown-api` من مجلد `backend/` على فرع `main`.
4. أنشئ خدمة `crown-web` من جذر الريبو (`.`) على نفس الفرع.
5. فعّل auto-deploy on commit إن حابب.

بهذا الشكل أي push للـ main هيفتح build + deploy تلقائيًا.

