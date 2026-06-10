# Crown API – Endpoints (Auth, Users, Invites)

Base URL: `https://YOUR_API_URL` or `http://localhost:8080`

---

## Auth (public unless noted)

### POST /api/auth/signup
إنشاء حساب صاحب متجر (shop_owner) + متجر افتراضي. يستخدم عمود `password` و JWT من `process.env.JWT_SECRET`.

**Body (JSON):**
- `username` (مطلوب)
- `password` (مطلوب)
- `email` (اختياري)
- `businessName` (اختياري) – اسم المتجر
- `ownerName` (اختياري) – اسم المالك

**مثال curl:**
```bash
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"myowner","password":"SecurePass123!","email":"owner@example.com","businessName":"متجري","ownerName":"أحمد"}'
```

**Response 201:** `{ "token", "user": { "id", "username", "email", "role", "package", "shopId" } }`

---

### POST /api/auth/login
تسجيل الدخول. يقرأ `shopId` من: `body.shopId` أو `query.shopId` أو هيدر `x-shop-id`.

**Body (JSON):**
- `username` (مطلوب): بريد إلكتروني، أو رقم موظف (employee_id)، أو username
- `password` (مطلوب)

**قواعد:**
- إذا `username` ليس بريداً (لا يحتوي `@`) ولا يوجد `shopId` → **400** `SHOP_ID_REQUIRED` (رسائل عربي/إنجليزي).
- إذا المستخدم غير موجود → **404** `USER_NOT_FOUND` (رسائل عربي/إنجليزي).
- super_admin يجب أن يسجل دخوله بالبريد فقط → **401** `SUPER_ADMIN_EMAIL_ONLY` (رسائل عربي/إنجليزي).

**أمثلة curl:**
```bash
# تسجيل دخول بـ email
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner@example.com","password":"SecurePass123!"}'

# تسجيل دخول بـ employee_id مع تحديد المتجر
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" -H "x-shop-id: 1" \
  -d '{"username":"42","password":"Pass123!"}'
```

**Response 200:** `{ "token", "user": { "id", "email", "username", "role", "package", "shopId" } }`

---

### GET /api/auth/me (محمي – Bearer token مطلوب)
يعيد بيانات المستخدم الحالي.

```bash
curl -s -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

بدون توكن → **401** `Access token required`.

---

### POST /api/auth/accept-invite (عام)
قبول دعوة وإنشاء مستخدم. يتحقق من الدعوة، ينشئ المستخدم، يحدّث `used_at`، ويرجع token + user.

**Body (JSON):**
- `shopId` (مطلوب)
- `inviteCode` (مطلوب)
- `password` (مطلوب)
- `username` (اختياري) – إن لم يُرسل يُستخدم email أو employee_id من الدعوة

```bash
curl -s -X POST http://localhost:8080/api/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{"shopId":1,"inviteCode":"HEX_CODE_FROM_INVITE","password":"NewPass123!"}'
```

**Response 201:** `{ "token", "user": { "id", "username", "email", "employee_id", "role", "package", "shopId" } }`

---

## Users (محمية – Bearer token مطلوب)

### GET /api/users
قائمة مستخدمي المتجر. يعتمد `resolveShopId` (query/body/header `x-shop-id`). يرجع `employee_id` ضمن الحقول.  
لـ super_admin: إرسال `shopId` مطلوب وإلا **400** `SHOP_ID_REQUIRED`.

```bash
curl -s -X GET "http://localhost:8080/api/users?shopId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# أو
curl -s -X GET http://localhost:8080/api/users -H "x-shop-id: 1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### POST /api/users
إنشاء مستخدم. الحقل الرئيسي هو `username` ويمكن أن يكون: email أو رقم employee_id أو username. يطبق CREATABLE_ROLES ويعيّن الفرع الافتراضي للكاشير/المخزن/مدير الفرع عند الإمكان.

**Body (JSON):**
- `username` (مطلوب)
- `password` (مطلوب)
- `role` (مطلوب)
- `branchId` (اختياري)

```bash
curl -s -X POST http://localhost:8080/api/users \
  -H "Authorization: Bearer OWNER_TOKEN" -H "Content-Type: application/json" -H "x-shop-id: 1" \
  -d '{"username":"99","password":"Pass123!","role":"cashier"}'
```

**Response 201:** `{ "id", "username", "email", "employee_id", "role" }`

---

### POST /api/users/invite (محمي)
إنشاء دعوة. مسموح للأدوار: shop_owner, branch_manager, multi_branch_manager, super_admin. يولد `invite_code` قوياً (crypto) ويحفظ في `user_invites`.

**Body (JSON):**
- `role` (مطلوب)
- `employee_id` أو `email` (واحد على الأقل)
- `expiresHours` (اختياري، افتراضي 24)

```bash
curl -s -X POST http://localhost:8080/api/users/invite \
  -H "Authorization: Bearer OWNER_TOKEN" -H "Content-Type: application/json" -H "x-shop-id: 1" \
  -d '{"role":"cashier","email":"new@example.com","expiresHours":24}'
```

**Response 201:** `{ "invite_code", "shopId", "role", "expires_at" }`

---

## CORS
- الاعتماد على `app.use(cors(corsOptions))` فقط (لا استخدام `app.options('*', ...)` المخالف لـ Express 5).
- ضبط `CORS_ORIGIN` في بيئة التشغيل (قيم مفصولة بفاصلة).
