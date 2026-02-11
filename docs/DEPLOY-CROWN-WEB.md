# Deploy crown-web (Next.js frontend)

جميع طلبات الـ API من الفرونت تستخدم `API_BASE_URL` من `lib/api.ts` فقط (عبر `app/api-config.ts`).  
لا يُستخدم أي fallback لـ localhost في production build.

## Build-time vs runtime

- **`NEXT_PUBLIC_API_URL`** يُقرأ عند **بناء** Next.js فقط (يُضمَّن في الـ bundle).
- تعيينه عند **تشغيل** الحاوية (Cloud Run runtime) **لن يؤثر** على الفرونت.
- يجب تمريره أثناء **بناء الصورة** (Docker build arg أو Cloud Build env).

## الهدف

أن يذهب أي طلب (مثل login) من crown-web إلى:

```
https://crown-api-av27y5zkga-uc.a.run.app/api
```

بدون أي localhost.

---

## 1) بناء الصورة مع الـ API base الصحيح

### Docker محلياً

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://crown-api-av27y5zkga-uc.a.run.app/api \
  -t crown-web:latest \
  .
```

### Cloud Build (جملة واحدة لـ crown-web)

استخدم إما:

**أ) بناء بـ Docker ثم دفع الصورة وتحديث الخدمة:**

في **Cloud Build** (Trigger منفصل لـ crown-web أو سكربت):

- **Build command** يجب أن يمرّر المتغير أثناء البناء، مثلاً:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NEXT_PUBLIC_API_URL=https://crown-api-av27y5zkga-uc.a.run.app/api'
      - '-t'
      - '$_AR_HOSTNAME/$_AR_PROJECT_ID/$_AR_REPOSITORY/$REPO_NAME/crown-web:$COMMIT_SHA'
      - '.'
```

أو استخدام **substitution** في الـ trigger:

- متغير استبدال: `_NEXT_PUBLIC_API_URL` = `https://crown-api-av27y5zkga-uc.a.run.app/api`
- وفي خطوة الـ build: `--build-arg NEXT_PUBLIC_API_URL=${_NEXT_PUBLIC_API_URL}`

**ب) استخدام Dockerfile فقط (بدون cloudbuild.yaml للفرونت):**

في إعدادات الـ Trigger:

- **Build type**: Dockerfile.
- **Build args (Docker)**:
  - اسم: `NEXT_PUBLIC_API_URL`
  - قيمة: `https://crown-api-av27y5zkga-uc.a.run.app/api`

ثم Push الصورة إلى Artifact Registry وتحديث خدمة Cloud Run للـ crown-web.

---

## 2) تشغيل crown-web على Cloud Run

- الصورة مُبناة مع `NEXT_PUBLIC_API_URL` مضمن فيها؛ لا حاجة لتعيينها كـ **runtime env** للفرونت.
- فقط تأكد من:
  - **PORT**: Cloud Run يمرّرها تلقائياً (والـ Dockerfile يستخدم 8080).
  - أي متغيرات أخرى للفرونت (إن وُجدت) حسب الحاجة.

---

## 3) التحقق

بعد الـ deploy:

1. افتح موقع crown-web (رابط Cloud Run للفرونت).
2. افتح DevTools → Network.
3. سجّل الدخول (login).
4. تأكد أن طلب الـ login يذهب إلى:
   `https://crown-api-av27y5zkga-uc.a.run.app/api/auth/login`
   وليس إلى أي `localhost`.

---

## ملخص

| ما الذي يُمرَّر؟ | أين؟ | متى؟ |
|-------------------|------|------|
| `NEXT_PUBLIC_API_URL=https://crown-api-av27y5zkga-uc.a.run.app/api` | كـ **build arg** (Docker / Cloud Build) | أثناء **بناء** الصورة فقط |
| لا تعيين `NEXT_PUBLIC_API_URL` في Cloud Run كـ env للتشغيل | خدمة crown-web | — |

بهذا يكون كل طلب من الفرونت (بما فيه login) يذهب إلى الـ API المطلوب بدون localhost.
