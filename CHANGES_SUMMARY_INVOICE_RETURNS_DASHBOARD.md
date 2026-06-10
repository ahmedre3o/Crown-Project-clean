# ملخص التعديلات: طباعة الفاتورة + سجل المرتجعات + لوحة التحكم

> تكملة فوق commit 005e4d2 (On-Account + Returns)  
> Branch: master | DB: crown_services_dev

---

## Commit hash (آخر تحديث)

```
431c488 feat: invoice print hide after-discount when no discount, dashboard period dropdowns, net sales card
```

---

## Files changed (هذه الجلسة)

| الملف | التعديل |
|-------|---------|
| `app/invoices/page.tsx` | hasDiscount يشمل item.discount_amount/percent + إخفاء "الإجمالي بعد الخصم" عند عدم خصم |
| `app/dashboard/page.tsx` | Dropdown فترة على كروت: المبيعات، الأونلاين، العمليات، المرتجعات، صافي المبيعات |
| `app/dashboard/page.tsx` | كارت جديد: صافي المبيعات (المبيعات - المرتجعات) مع Dropdown |
| `backend/sql/production-safe-migrations-debts-convert-returns.sql` | إضافة print_count لجدول returns (idempotent) |

---

## الملفات السابقة (من الجلسات السابقة)

| الملف | التعديل |
|-------|---------|
| `app/invoices/page.tsx` | return_status badges + قسم المرتجعات المرتبطة + طباعة إيصال المرتجع |
| `app/store-admin/returns/page.tsx` | فلاتر فترة (يومي/أسبوعي/شهري/سنوي/الكل) + زر طباعة + print_count |
| `backend/api.ts` | GET /api/returns, GET /api/returns/:id, POST /api/returns/:id/print, GET /api/sales/:id/returns, GET /api/dashboard/summary?period= |

---

## Migration file(s)

- `backend/sql/production-safe-migrations-returns-print-count.sql` (منفصل)
- `backend/sql/production-safe-migrations-debts-convert-returns.sql` (يتضمن print_count أيضاً)

---

## Migration commands (على crown_services_dev فقط)

```bash
mysql -h YOUR_CLOUD_SQL_IP -u USER -p crown_services_dev < backend/sql/production-safe-migrations-returns-print-count.sql
# أو إذا تم تشغيل debts-convert-returns سابقاً:
mysql -h YOUR_CLOUD_SQL_IP -u USER -p crown_services_dev < backend/sql/production-safe-migrations-debts-convert-returns.sql
```

---

## Deploy commands (على master فقط)

```bash
cd c:\Users\Aogi\Desktop\Crown-Project-Clean-Job
git pull origin master

# Backend (من مجلد backend)
gcloud run deploy crown-api \
  --source backend \
  --region us-central1 \
  --project gen-lang-client-0711622878 \
  --labels "git_sha=$(git rev-parse HEAD),git_branch=master" \
  --quiet

# Frontend (من نفس المجلد - cloudbuild يبني من .)
gcloud builds submit --config=cloudbuild.yaml
```

---

## Verification steps checklist

- [ ] فاتورة بدون خصومات → لا يظهر سطر "الإجمالي بعد الخصم"
- [ ] فاتورة بخصم → يظهر السطر طبيعي
- [ ] سجل المرتجعات يعرض كل المرتجعات + فلاتر period تعمل
- [ ] طباعة مرتجع 3 مرات → يظهر "تمت الطباعة 3 مرات"
- [ ] مرتجع جزئي → Badge "تم استرجاع منتج/منتجات" على الفاتورة
- [ ] مرتجع كامل → Badge "تم استرجاع الفاتورة بالكامل"
- [ ] قسم "المرتجعات المرتبطة" يظهر في تفاصيل الفاتورة
- [ ] المخزون يرجع بعد المرتجع
- [ ] Dashboard: تغيير Dropdown يغيّر الأرقام + كارت صافي المبيعات
