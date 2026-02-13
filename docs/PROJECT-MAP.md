# Crown-Project-clean — Project Map

## 1) تقسيم المشروع ومواقع الفرونت والباكند

المشروع **monorepo**: فرونت (Next.js) في الجذر، باكند (Express) في مجلد منفصل. النشر يتم عبر فرعين منفصلين وملفات Cloud Build منفصلة.

| الجزء | المسار | فرع النشر | خدمة Cloud Run |
|--------|--------|-----------|-----------------|
| **Frontend (crown-web)** | جذر المشروع: `app/`, `lib/`, `components/`, `public/`, `package.json`, `next.config.mjs` | `deploy/frontend` | `crown-web` |
| **Backend (crown-api)** | `backend/` | `deploy/backend` أو `backup/pre-deploy-clean-copy` | `crown-api` |

- **الفرونت للإنتاج:** تطبيق Next.js في **الجذر** (ليس `frontend/` ولا `client/`). مجلدات `frontend/` و `client/` تطبيقات Vite/React قديمة أو تجريبية وغير مستخدمة للنشر الحالي.
- **الباكند للإنتاج:** مجلد `backend/` فقط؛ يُبنى بـ Buildpacks من `--path=backend`.

---

## 2) الباكند — نقطة الدخول وكيفية التشغيل

| البند | التفاصيل |
|--------|----------|
| **Entry file** | `backend/api.ts` |
| **كيف يُشغَّل** | عبر `backend/package.json`: `npm run build` → `tsc -p tsconfig.json` (يُنتج `backend/dist/api.js`)، ثم `npm start` → `node dist/api.js`. |
| **Scripts (من جذر المشروع)** | `npm run backend` = `cd backend && npx ts-node api.ts` (تطوير). `npm run backend:dev` = نفس المسار مع ts-node-dev. للإنتاج يُستخدم `backend/` مستقل: `cd backend && npm run build && npm start`. |
| **Port** | `process.env.PORT` (افتراضي في الكود: `8080`)، ربط على `0.0.0.0`. |

لا يوجد نقطة دخول أخرى للباكند في الإنتاج؛ الملف الذي تشغّله Cloud Run هو الناتج من `backend/api.ts` عبر `dist/api.js`.

---

## 3) الفرونت — النوع ونقطة الدخول والبناء والتشغيل

| البند | التفاصيل |
|--------|----------|
| **النوع** | **Next.js 16** (App Router)، React 19. |
| **نقطة الدخول** | `app/layout.tsx` + `app/page.tsx`؛ المسارات تحت `app/**/page.tsx`. |
| **Build** | من **جذر** المشروع: `npm run build` → `next build` (يُنتج `.next/`). |
| **Start** | `npm start` → `next start` (يقرأ `PORT` من البيئة؛ افتراضي Next 3000، في Docker يُستخدم غالباً 8080). |
| **Config** | `next.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json` (جذر). |

الفرونت المُنشَر (crown-web) هو هذا التطبيق في الجذر فقط.

---

## 4) ملفات مهمة للنشر

| الملف | الاستخدام |
|--------|------------|
| **Dockerfile** | (موجود على فرع `deploy/frontend`) بناء صورة crown-web؛ يمرّر `NEXT_PUBLIC_API_URL` كـ build arg أثناء `docker build`. |
| **cloudbuild.yaml** | باكند: Buildpack يبني من `--path=backend`، يدفع الصورة، يحدّث خدمة Cloud Run `crown-api`. |
| **cloudbuild.frontend.yaml** | فرونت: بناء Docker مع `--build-arg NEXT_PUBLIC_API_URL=...`، دفع الصورة، نشر خدمة `crown-web` على Cloud Run. (موجود على `deploy/frontend`). |
| **package.json** (جذر) | Next.js: `build`, `start`, `dev`؛ لا يُستخدم لتشغيل الباكند في الإنتاج. |
| **backend/package.json** | الباكند: `build` (tsc)، `start` (node dist/api.js). |
| **backend/tsconfig.json** | خرج التجميع: `outDir: "./dist"`. |
| **next.config.mjs** | إعدادات Next (transpilePackages، إلخ). |
| **lib/api.ts** | مصدر واحد لـ API base: `NEXT_PUBLIC_API_URL` (build-time فقط؛ مطلوب في production build). |
| **app/api-config.ts** | يعيد تصدير `API_BASE_URL` من `lib/api.ts`؛ كل طلبات الفرونت تمرّ منه. |
| **.env / .env.example** | للباكند: `backend/.env` (DB_*, JWT_SECRET, CORS_ORIGIN, PORT، إلخ). للفرونت: لا حاجة لـ runtime env للـ API؛ القيمة تُمرَّر عند البناء فقط. |

---

## 5) جدول ملخص: Component / Path / Entry / Build / Start

| Component | Path | Entry | Build command | Start command |
|------------|------|--------|----------------|----------------|
| **crown-web (Frontend)** | `.` (جذر المشروع) | `app/layout.tsx`, `app/page.tsx` | `npm run build` (`next build`) | `npm start` (`next start`) |
| **crown-api (Backend)** | `backend/` | `backend/api.ts` → `backend/dist/api.js` | `cd backend && npm run build` (`tsc -p tsconfig.json`) | `cd backend && npm start` (`node dist/api.js`) |

---

## 6) ملاحظات سريعة

- **الفرونت:** لا تعتمد على `frontend/` أو `client/` للنشر؛ الاعتماد على الجذر + Next.js فقط.
- **الباكند:** يُبنى ويُشغَّل من `backend/` فقط؛ Cloud Build يستخدم `--path=backend` وليس الجذر.
- **NEXT_PUBLIC_API_URL:** يُمرَّر عند **بناء** صورة crown-web (Docker build arg أو Cloud Build) وليس كـ runtime env على Cloud Run.
