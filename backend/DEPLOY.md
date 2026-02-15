# Crown API – Deploy (Cloud Run)

## 1) تطبيق ترحيلات DB على Cloud SQL (Production-safe)

- تنفيذ الملف `sql/production-safe-migrations.sql` على قاعدة الإنتاج (Cloud SQL). السكربت يستخدم INFORMATION_SCHEMA لتفادي أخطاء Duplicate (لا يضيف عموداً أو فهرساً إن كان موجوداً).

مثال من Cloud Shell أو من جهازك (بعد تفعيل Cloud SQL Proxy أو الاتصال المباشر):

```bash
# من جذر الريبو
mysql -h YOUR_CLOUD_SQL_IP -u USER -p DATABASE < backend/sql/production-safe-migrations.sql
```

أو تشغيل كل جملة يدوياً من وحدة تحكم Cloud SQL.

---

## 2) Build المحلي (من مجلد backend)

```bash
cd backend
npm ci
npm run build
```

التأكد أن `dist/api.js` يُبنى بدون أخطاء وأن الـ routes (signup, login, me, users, invite, accept-invite) موجودة في الكود المبنى.

---

## 3) نشر crown-api على Cloud Run

المنطقة الافتراضية: **us-central1**. نفّذ الأوامر من جذر الريبو أو من مجلد المشروع (الصورة تُبنى عادة من الـ Trigger أو من أمر docker من جذر الريبو مع `dir: backend`).

### أ) بناء الصورة ونشرها يدوياً (من جذر الريبو)

```bash
# بناء الصورة من مجلد backend
docker build -t gcr.io/PROJECT_ID/crown-api ./backend
docker push gcr.io/PROJECT_ID/crown-api

# نشر الخدمة
gcloud run deploy crown-api \
  --image gcr.io/PROJECT_ID/crown-api \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

استبدل `PROJECT_ID` بمعرف مشروع GCP. إذا الصورة في Artifact Registry:

```bash
gcloud run deploy crown-api \
  --image us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/crown-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### ب) نشر عبر Cloud Build (موصى به)

- ربط الـ Trigger بالفرع المطلوب وملف `cloudbuild.yaml` الذي يبني من `backend/Dockerfile` ويدفع الصورة ثم ينشر crown-api.
- بعد الـ push يتم البناء والنشر تلقائياً.

---

## 4) ضبط Env Vars (CORS + API URL وغيرها)

**Canonical domains:** API `https://api.crowncs.org`, Frontend `https://crowncs.org`. الـ backend يسمح مبدئياً بـ `https://crowncs.org` و `http://localhost:3000` ويسمح بالهيدر `X-Shop-Id` مع `Content-Type` و `Authorization` و `credentials: true`.

- **CORS_ORIGIN** (اختياري): إذا مُعرّف يُستبدل الافتراضي. مثال:  
  `https://crowncs.org,http://localhost:3000`
- **JWT_SECRET**: من Secret Manager أو متغير بيئة (لا تخزينه في كود).
- **DB_HOST, DB_NAME, DB_USER, DB_PASSWORD** (واختياري DB_SSL, DB_PORT, DB_MODE).
- **Frontend (crown-web):** يُبنى بـ substitution في Cloud Build: `_NEXT_PUBLIC_API_URL=https://api.crowncs.org/api`. لا تستخدم *.run.app في الإنتاج.

تحديث CORS فقط (اختياري):

```bash
gcloud run services update crown-api \
  --region us-central1 \
  --update-env-vars "CORS_ORIGIN=https://crowncs.org,http://localhost:3000"
```

ضبط JWT من Secret Manager:

```bash
gcloud run services update crown-api \
  --region us-central1 \
  --set-secrets "JWT_SECRET=jwt-secret:latest"
```

---

## 5) Checklist نهائي بعد النشر

نفّذ بالترتيب بعد أن تصبح الخدمة live (استبدل `BASE_URL` بمسار crown-api الفعلي، مثلاً `https://crown-api-xxxxx.run.app`):

| # | الخطوة | الأمر / الإجراء |
|---|--------|------------------|
| 1 | **Health** | `curl -s BASE_URL/api/health` → يتوقع `{"status":"ok"}` |
| 2 | **Login** | `curl -s -X POST BASE_URL/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"EMAIL","password":"PASS"}'` → يتوقع `token` و `user` |
| 3 | **Invite** | مع توكن owner: `curl -s -X POST BASE_URL/api/users/invite -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -H "x-shop-id: SHOP_ID" -d '{"role":"cashier","email":"invited@test.com","expiresHours":24}'` → يتوقع `invite_code` و `expires_at` |
| 4 | **Accept-invite** | `curl -s -X POST BASE_URL/api/auth/accept-invite -H "Content-Type: application/json" -d '{"shopId":SHOP_ID,"inviteCode":"CODE","password":"NewPass1!"}'` → يتوقع `token` و `user` |
| 5 | **Login بالمستخدم المقبول** | استخدام التوكن أو تسجيل الدخول بـ identifier/كلمة المرور الجديدة ثم `GET /api/auth/me` للتأكد من الجلسة |

راجع `API_ENDPOINTS.md` لأمثلة curl كاملة ولجميع الـ endpoints.
