## HTTP(S) Load Balancer + Domain – `crown-web` / `crown-api`

الهدف:

- `https://DOMAIN/` → خدمة Cloud Run **crown-web** (الواجهة)
- `https://DOMAIN/erp-api/*` → خدمة Cloud Run **crown-api** (الباك إند)

---

### 1. تحضير Serverless NEGs (Cloud Run backends)

من Cloud Shell أو جهازك بعد إعداد `gcloud` والمشروع:

#### 1.1 إنشاء NEG لـ `crown-web`

```bash
gcloud compute network-endpoint-groups create crown-web-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=crown-web
```

#### 1.2 إنشاء NEG لـ `crown-api`

```bash
gcloud compute network-endpoint-groups create crown-api-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=crown-api
```

---

### 2. إنشاء HTTP(S) Load Balancer

يمكن عمل الخطوات من الـ Console (موصى به)، أو باستخدام `gcloud compute` (أكثر تعقيدًا). هنا وصف عالي المستوى:

1. اذهب إلى **Cloud Load Balancing** في Google Cloud Console.
2. اختر **Create load balancer** → External Application Load Balancer (HTTP(S)).
3. Frontend:
   - اختر بروتوكول **HTTPS**.
   - اربط **certificate** (انظر قسم SSL أدناه).
4. Backends:
   - أنشئ backend service باسم مثل `crown-web-backend` واربطه بالـ NEG `crown-web-neg` (الـ default backend).
   - أنشئ backend service آخر باسم مثل `crown-api-backend` واربطه بالـ NEG `crown-api-neg`.
5. URL map / Routing rules:
   - Default route (`/`) → `crown-web-backend`.
   - Path matcher rule:
     - Path: `/erp-api/*`
     - Backend service: `crown-api-backend`.
6. أنشئ الـ load balancer واحفظ الإعدادات، وانتظر حتى يحصل على External IP.

---

### 3. SSL – Managed Certificate

#### 3.1 إنشاء Managed SSL Certificate

من الـ Console:

1. اذهب إلى **Certificates** ضمن قسم Load Balancing.
2. أنشئ **Google-managed certificate** جديد باسم مثل `crown-domain-cert`.
3. أدخل الدومين (مثلاً: `crowncs.org` و/أو `www.crowncs.org`).
4. اربط الـ certificate بالـ HTTPS frontend في الـ Load Balancer.

> Google هيتولى شراء/تجديد الشهادة تلقائيًا، بشرط أن تكون سجلات DNS مضبوطة.

---

### 4. DNS Records

بعد إنشاء الـ Load Balancer، احصل على الـ **External IP** الخاص بالـ frontend.

في مزوّد الـ DNS (أو Cloud DNS):

- سجّل A record:
  - `@` → IP الخاص بالـ Load Balancer
- (اختياري) CNAME:
  - `www` → `DOMAIN.` (أو سجل A آخر لنفس الـ IP)

انتظر نشر الـ DNS (قد يأخذ من دقائق حتى ساعة).

---

### 5. تأكيد الإعداد

بعد انتهاء نشر Cloud Run + Load Balancer + DNS:

1. تحقق أن:
   - `https://DOMAIN/` يفتح تطبيق Next.js (crown-web).
   - `https://DOMAIN/erp-api/health` يرجع **200** و `{\"status\":\"ok\"}` من خدمة `crown-api`.
2. جرّب تسجيل الدخول من الواجهة:
   - الطلبات يجب أن تذهب إلى `/erp-api/...` فقط.
   - لا يجب أن تظهر أي أخطاء CORS في Network tab.

