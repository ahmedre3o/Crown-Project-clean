# إصلاح trigger نشر crown-api (الباك إند)

إذا كان نشر **crown-api** يفشل برسالة عن `crown-web` أو تعارض إصدارات، فالسبب غالباً أن الـ trigger الخاص بالباك إند يشغّل ملف بناء خاطئ أو متغيرات تعويض خاطئة.

## الخطوات في Google Cloud Console

1. افتح **Cloud Build** → **Triggers** (المحفزات).
2. اضغط على الـ trigger الخاص بـ **crown-api** (الباك إند).
3. تحقق من الإعدادات التالية:

### مطلوب لـ crown-api

| الإعداد | القيمة الصحيحة |
|--------|-----------------|
| **ملف الإعداد (Configuration)** | نوع: **Cloud Build configuration file (YAML or JSON)** |
| **الملف** | `cloudbuild.backend.yaml` (في جذر المستودع) |
| **المتغيرات (Substitution variables)** | **لا تضف** `_SERVICE` أو اجعل قيمتها `crown-api` فقط. الأفضل تركها فارغة لأن الملف يحدد الخدمة مباشرة. |

4. احفظ التغييرات (Save).

## التأكد من أن البناء الصحيح يعمل

بعد تشغيل الـ trigger، من **Build history** افتح آخر بناء لـ crown-api. في **اللوج (Logs)** يجب أن ترى في البداية:

```
=== This is crown-api (backend) build. Deploy target: crown-api only ===
```

- إذا **ظهر** هذا السطر ثم فشل البناء: المشكلة في خطوة البناء أو النشر (شارك رسالة الخطأ).
- إذا **لم يظهر**: الـ trigger لا يزال يستخدم ملفاً آخر (مثلاً `cloudbuild.yaml` أو `cloudbuild.frontend.yaml`). عدّل الـ trigger ليستخدم `cloudbuild.backend.yaml` فقط.

## نشر يدوي من سطر الأوامر (اختياري)

من Cloud Shell أو جهازك (بعد تثبيت gcloud):

```bash
cd Crown-Project-clean
git pull origin master
gcloud builds submit --project gen-lang-client-0711622878 --config cloudbuild.backend.yaml .
```

هذا يشغّل نفس ملف `cloudbuild.backend.yaml` وينشر على **crown-api** فقط.
