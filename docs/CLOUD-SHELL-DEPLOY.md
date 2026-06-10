# نشر من Google Cloud Shell

لا تستخدم القيمة النصية `YOUR_PROJECT`. عيّن المشروع الفعلي (مثال من بيئتك): **`gen-lang-client-0711622878`**.

## 1) إعداد المشروع والمجلد

```bash
gcloud config set project gen-lang-client-0711622878
```

انسخ المستودع وادخل **جذر المشروع** (حيث يوجد `Dockerfile` و`cloudbuild.yaml`):

```bash
git clone https://github.com/ahmedre3o/Crown-Project-clean.git
cd Crown-Project-clean
```

> **لا تستنسخ المستودع مرة ثانية داخل نفس المجلد** (`cd Crown-Project-clean && git clone ...`) — سيُنشئ مجلداً `Crown-Project-clean` داخل المشروع ويُرفع مع `gcloud builds submit` فيفشل `next build` لأنه يحاول فحص `backend/api.ts` من النسخة الداخلية. إن وُجد هذا المجلد احذفه: `rm -rf Crown-Project-clean` من جذر المستودع.

> **مهم:** أمر `gcloud builds submit` يحتاج أن تكون داخل مجلد المشروع، ويُفضّل إضافة `.` في النهاية لتحديد سياق البناء.

### لماذا يظهر Cloud Build كـ «global» بينما تريد us-central1؟

- **عمود Region في سجل Cloud Build** يعني **أين تُشغَّل وظيفة البناء** (Cloud Build API)، وليس بالضرورة نفس منطقة **Cloud Run**.
- في كثير من المشاريع يظهر **global** طالما البناء يستخدم الـ pool الافتراضي أو لم يُحدَّد `--region` لـ `gcloud builds submit`.
- **نشر الخدمة** عندك مضبوط في الملفات على **`us-central1`** (`_REGION: us-central1` و`gcloud run deploy --region=us-central1` و Artifact Registry بنفس المنطقة).

لجعل **سجل البناء** نفسه يظهر تحت منطقة محددة (إن كانت مفعّلة للمشروع):

```bash
gcloud config set builds/region us-central1
```

ثم نفّذ أوامر `gcloud builds submit` كالعادة، أو أضف صراحةً:

```bash
gcloud builds submit --region=us-central1 --config=cloudbuild.backend.yaml --project=gen-lang-client-0711622878 .
```

> إذا رفض المشروع الإقليمية، يبقى البناء على **global** لكن **الخدمة على Cloud Run تبقى us-central1** ما دام الـ YAML يستخدم `_REGION: us-central1`.

## 2) نشر الـ Backend (crown-api)

```bash
gcloud run deploy crown-api \
  --source ./backend \
  --region us-central1 \
  --project gen-lang-client-0711622878
```

## 3) نشر الـ Frontend (crown-web)

من **نفس جذر المشروع** (حيث `cloudbuild.yaml`):

```bash
gcloud builds submit --region=us-central1 --config=cloudbuild.yaml --project gen-lang-client-0711622878 .
```

أو باستخدام الملف البديل:

```bash
gcloud builds submit --region=us-central1 --config=cloudbuild.frontend.yaml --project gen-lang-client-0711622878 .
```

`NEXT_PUBLIC_API_URL` مضبوط في الـ YAML (مثل `https://api.crowncs.org`). عدّل الـ substitutions إن احتجت نطاق API مختلف.

## أخطاء شائعة

| الخطأ | السبب |
|--------|--------|
| `project property must be set to a valid project ID` | استبدل `YOUR_PROJECT` بـ `gen-lang-client-0711622878` أو نفّذ `gcloud config set project ...` |
| `Unable to read file [cloudbuild.yaml]` | لا يوجد الملف في المجلد الحالي؛ نفّذ `cd` إلى مجلد المستودع و`ls cloudbuild*.yaml` |
| بناء قديم في المتصفح | بعد deploy انتظر نشر الريفيجن، أو امسح كاش المتصفح |
| فشل `cloudbuild.yaml` عند خطوة Docker (`next build`) | بعد `git pull` جرّب البناء مجدداً. راجع السجل: `gcloud builds log BUILD_ID --project=gen-lang-client-0711622878 --region=us-central1` (أو `region=global` إن كان البناء هناك). الـ `Dockerfile` يستخدم `next build --webpack`، صورة `bookworm-slim`، أدوات `python3/make/g++`، و`sharp`، وحدّ أقصى للذاكرة 4GB. |
