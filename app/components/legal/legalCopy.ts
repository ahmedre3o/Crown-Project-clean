/** Exact legal copy for /privacy and /terms (AR + EN). */

export const PRIVACY_COPY = {
  ar: {
    title: 'سياسة الخصوصية',
    body: `نحن في Crown Services نلتزم بحماية بيانات عملائنا وخصوصيتهم.

نقوم بجمع:
- بيانات الحساب (الاسم، البريد الإلكتروني)
- بيانات الاستخدام داخل النظام (المبيعات، المخزون، العمليات)

نستخدم البيانات من أجل:
- تحسين الأداء
- تقديم تقارير دقيقة
- حماية الحسابات

حماية البيانات:
يتم تخزين البيانات على خوادم Google Cloud بشكل آمن مع استخدام التشفير.

لن نشارك بياناتك مع أي طرف ثالث بدون إذنك.

لا نبيع بيانات المستخدمين تحت أي ظرف من الظروف.

للتواصل:
ahmed@crowncs.org`,
  },
  en: {
    title: 'Privacy Policy',
    body: `At Crown Services, we are committed to protecting your data and privacy.

We collect:
- Account data (name, email)
- System activity (sales, inventory, operations)

We use data to:
- Improve performance
- Provide accurate reports
- Secure accounts

Data Protection:
All data is stored securely on Google Cloud with proper encryption.

We do not share your data with third parties without your consent.

We do not sell user data under any circumstances.

Contact:
ahmed@crowncs.org`,
  },
} as const;

export const TERMS_COPY = {
  ar: {
    title: 'الشروط والأحكام',
    body: `باستخدامك لنظام Crown Services، فإنك توافق على:

- أنت مسؤول عن بياناتك
- يمنع استخدام النظام في أي نشاط غير قانوني
- يحق لنا إيقاف الحساب عند إساءة الاستخدام
- الخدمة مقدمة كما هي بدون ضمانات

يحتفظ Crown Services بحق تحديث الأسعار والميزات.

للتواصل:
ahmed@crowncs.org`,
  },
  en: {
    title: 'Terms of Service',
    body: `By using Crown Services, you agree to:

- You are responsible for your data
- Illegal use is prohibited
- We can suspend accounts in case of misuse
- Service is provided "as is"

Crown Services reserves the right to update pricing and features.

Contact:
ahmed@crowncs.org`,
  },
} as const;
