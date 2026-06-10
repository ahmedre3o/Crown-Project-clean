/** Static copy for login About / Contact — kept separate for tests and reuse. */

export const LOGIN_ABOUT_DEMO_URL = 'https://www.facebook.com/share/v/18Qegpmvjg/';

export const LOGIN_ABOUT_COPY = {
  ar: {
    title: 'من نحن',
    saasIntro:
      'Crown Services منصة SaaS (برمجيات كخدمة) مصممة لتُمكّن الشركات من إدارة عملياتها في السحابة.',
    intro: `🔧 ماذا يحتوي النظام؟

Crown Services — ERP سحابي متكامل من مكان واحد:

• 🧾 مبيعات نقطة البيع والفواتير
• 📦 مخزون وفروع متعددة
• 🧑‍💼 عملاء (CRM) · 🏢 موارد بشرية ورواتب
• 💰 محاسبة وضرائب وتقارير · 🛒 متجر أونلاين وربط الطلبات
• 🤖 مساعد ذكي · 📊 تحليلات لحظية · 💾 نسخ احتياطي واستعادة لحظية`,
    story: `👑 قصة "تاج الخدمات" (Crown Services)
تم تطوير هذا النظام برؤية مؤسسه (أحمد حسن)، المتخصص في العمليات اللوجستية، ليتحول من تحدٍ شخصي عند سن الثلاثين إلى منصة تقنية رائدة. نحن لا نبني مجرد كود، بل نبني "تاجاً" من التنظيم لكل صاحب عمل يطمح للنمو العالمي باستخدام تكنولوجيا Google Cloud وذكاء Gemini الاصطناعي.`,
    aboutMeta: `المؤسس: أحمد حسن
📍 الإسكندرية، مصر
📧 ahmed@crowncs.org`,
    masterclassTitle: '🎥 شاهد النظام في عمله (Masterclass)',
    masterclassBody:
      'نحن نؤمن بالشفافية الكاملة؛ لذا يمكنك مشاهدة شرح تفصيلي حي (51 دقيقة) لكامل خصائص النظام من الألف إلى الياء عبر هذا الرابط:',
    demoLinkText: 'شاهد العرض التوضيحي من هنا',
    footer: '✔ بيانات معزولة · ✔ صلاحيات · ✔ باقات مرنة · سحابة حديثة للسرعة والاستقرار.',
  },
  en: {
    title: 'About Us',
    saasIntro:
      'Crown Services is a SaaS (Software as a Service) platform designed for businesses to manage operations in the cloud.',
    intro: `🔧 What does the system include?

Crown Services — cloud ERP in one place:

• 🧾 POS sales & invoicing
• 📦 Inventory & multi-branch
• 🧑‍💼 CRM · 🏢 HR & payroll
• 💰 Accounting & taxes · 🛒 Online store & order linking
• 🤖 AI assistant · 📊 Live analytics · 💾 Instant backup & restore`,
    story: `👑 The story of Crown Services
This system was developed with the vision of its founder (Ahmed Hassan), a logistics specialist—turning a personal challenge at thirty into a leading technology platform. We don't just write code; we build a "crown" of organization for every business owner who aspires to global growth using Google Cloud and Gemini AI.`,
    aboutMeta: `Founder: Ahmed Hassan
📍 Alexandria, Egypt
📧 ahmed@crowncs.org`,
    masterclassTitle: '🎥 See the system in action (Masterclass)',
    masterclassBody:
      'We believe in full transparency: you can watch a live, detailed walkthrough (51 minutes) covering every feature from A to Z via this link:',
    demoLinkText: 'Watch the full demo here',
    footer: '✔ Isolated data · ✔ Roles · ✔ Flexible plans · Modern cloud for speed & reliability.',
  },
} as const;

export const CONTACT_EMAIL = 'ahmed@crowncs.org';

/** Prebuilt mailto (no Next/router) — works on desktop & mobile mail clients */
export const CONTACT_MAIL_SUBJECT = 'Contact Crown Services';
export const CONTACT_MAILTO_HREF = `mailto:ahmed@crowncs.org?subject=${encodeURIComponent(CONTACT_MAIL_SUBJECT)}`;

export const CONTACT_WHATSAPP_URL = 'https://wa.me/201202620913';
export const CONTACT_WHATSAPP_DISPLAY = '+201202620913';

export const CONTACT_PHONE_TEL = 'tel:+01070045116';
export const CONTACT_PHONE_DISPLAY = '+01070045116';

/** Bullet lines for the login marketing column (Arabic per landing spec). */
export const LANDING_FEATURE_LINES: ReadonlyArray<{ ar: string; en: string }> = [
  { ar: '🧾 مبيعات نقطة البيع والفواتير', en: '🧾 POS sales & invoicing' },
  { ar: '📦 مخزون وتنبيهات المخزون المنخفض', en: '📦 Inventory & low-stock alerts' },
  { ar: '📑 تقارير (PDF / Excel / CSV) ورسوم بيانية', en: '📑 Reports (PDF/Excel/CSV) & charts' },
  { ar: '🛒 متجر أونلاين وربط الطلبات', en: '🛒 Online store & order linking' },
  { ar: '🤖 مساعد ذكي بالذكاء الاصطناعي', en: '🤖 AI-powered assistant' },
  { ar: '📊 تقارير وتحليلات لحظية', en: '📊 Real-time analytics & reports' },
  { ar: '💾 نسخ احتياطي واستعادة لحظية', en: '💾 Instant backup & restore' },
];

export const LANDING_MASTERCLASS = {
  quoteAr: "تاج الخدمات وُلِد من قلب 'الوقت الإضافي'",
  quoteEn: "Crown Services born from the heart of 'Extra Time'.",
  ctaAr: 'شاهد الـ Masterclass (51 دقيقة) من هنا',
  ctaEn: 'Watch the Masterclass (51 min) — here',
  href: 'https://www.facebook.com/share/v/18Qegpmvjg/',
  /** Shown as secondary line under the button */
  urlDisplay: 'facebook.com/share/v/18Qegpmvjg/',
} as const;

/** Section heading above industry tiles (industries we support — not feature modules). */
export const LANDING_INDUSTRIES_SECTION = {
  titleAr: 'مناسب للأنشطة التالية',
  titleEn: 'Suitable for these businesses',
  subtitleAr: 'يمكن تخصيص النظام ليتناسب مع هذه الأنشطة بسهولة',
  subtitleEn: 'The system can be adapted to fit these industries easily',
  footnoteAr: '*بعض الخصائص قد تختلف حسب الباقة',
  footnoteEn: '*Features may vary depending on your plan',
} as const;

/** Landing page — five focus industries (SaaS hero). */
export const LANDING_INDUSTRIES: ReadonlyArray<{
  arTitle: string;
  enTitle: string;
  arSub: string;
  enSub: string;
}> = [
  { arTitle: 'سوبر ماركت', enTitle: 'Supermarkets', arSub: 'بقالة وتجزئة سريعة', enSub: 'Grocery & fast retail' },
  { arTitle: 'صيدليات', enTitle: 'Pharmacies', arSub: 'أدوية ومستلزمات صحية', enSub: 'Medicines & health supplies' },
  { arTitle: 'ورش', enTitle: 'Workshops', arSub: 'صيانة وقطع غيار', enSub: 'Service & spare parts' },
  { arTitle: 'مستودعات', enTitle: 'Warehouses', arSub: 'تخزين وتوريد', enSub: 'Storage & distribution' },
  { arTitle: 'لوجستيات', enTitle: 'Logistics', arSub: 'شحن وتتبع', enSub: 'Shipping & tracking' },
];

/** SaaS landing hero (login home). */
export const LANDING_SAAS_HERO = {
  titleAr: 'أدر عملك بالكامل من منصة واحدة',
  titleEn: 'Manage Your Entire Business from One Platform',
  subtitleAr: 'ERP سحابي + نقاط بيع + أتمتة بالذكاء الاصطناعي للأعمال الحديثة',
  subtitleEn: 'Cloud ERP + POS + AI-powered automation for modern businesses',
  ctaStartAr: 'ابدأ الآن',
  ctaStartEn: 'Start Now',
  ctaDemoAr: 'شاهد العرض',
  ctaDemoEn: 'Watch Demo',
} as const;

export const LANDING_SAAS_FEATURES: ReadonlyArray<{
  key: 'pos' | 'inventory' | 'ai' | 'ocr' | 'accounting' | 'hr';
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}> = [
  {
    key: 'pos',
    titleAr: 'مبيعات نقاط البيع',
    titleEn: 'POS Sales',
    descAr: 'فواتير سريعة، عملاء، ودفع مرن من نقطة واحدة.',
    descEn: 'Fast invoicing, customers, and flexible checkout from one counter.',
  },
  {
    key: 'inventory',
    titleAr: 'إدارة المخزون',
    titleEn: 'Inventory Management',
    descAr: 'فروع، حد أدنى، وتنبيهات صلاحية.',
    descEn: 'Branches, reorder levels, and expiry awareness.',
  },
  {
    key: 'ai',
    titleAr: 'مساعد ذكي',
    titleEn: 'AI Assistant',
    descAr: 'إجابات وتقارير بلغتك ضمن حدود باقتك.',
    descEn: 'Answers and insights in your language within plan limits.',
  },
  {
    key: 'ocr',
    titleAr: 'قراءة فواتير OCR',
    titleEn: 'Invoice OCR',
    descAr: 'رفع صورة فاتورة شراء واستخراج البيانات تلقائياً.',
    descEn: 'Upload purchase invoice images and extract data automatically.',
  },
  {
    key: 'accounting',
    titleAr: 'محاسبة',
    titleEn: 'Accounting',
    descAr: 'مبيعات، مصروفات، وضرائب في لوحة واحدة.',
    descEn: 'Sales, expenses, and taxes in one financial view.',
  },
  {
    key: 'hr',
    titleAr: 'موارد بشرية',
    titleEn: 'HR System',
    descAr: 'موظفون، حضور، ورواتب حسب الصلاحيات.',
    descEn: 'Employees, attendance, and payroll with role-based access.',
  },
];

export const LANDING_SAAS_OCR = {
  titleAr: 'رفع فاتورة ← يستخرج النظام تلقائياً',
  titleEn: 'Upload invoice → the system auto-extracts',
  introAr: 'ارفع صورة فاتورة شراء فيستخرج النظام:',
  introEn: 'Upload a purchase invoice image — the system extracts:',
  bulletsAr: ['الأصناف', 'المورد', 'الأسعار', 'تاريخ الصلاحية', 'الضرائب'] as const,
  bulletsEn: ['Products', 'Supplier', 'Prices', 'Expiry date', 'Taxes'] as const,
} as const;

/** Caption under import/OCR UI screenshot in OCR section */
export const LANDING_SAAS_OCR_IMAGE_CAPTION = {
  ar: 'معاينة من النظام: استيراد Excel أو مسح فاتورة/صورة ومراجعة الأصناف قبل الحفظ.',
  en: 'In-app preview: Excel import or scan invoice/image and review lines before saving.',
} as const;

/** Separate section — printed POS sales invoice look */
export const LANDING_SAAS_SALES_INVOICE = {
  titleAr: 'فاتورة مستوحاة من النظام',
  titleEn: 'System-inspired invoice',
  bodyAr:
    'عند إتمام عملية البيع تُنشأ فاتورة بهذا الشكل المنظم والواضح — أفضل من الورق اليدوي، مع إجماليات وضريبة بصيغة احترافية.',
  bodyEn:
    'When you complete a sale, Crown generates an invoice in this clean layout — more professional than handwritten slips, with totals and tax clearly shown.',
  captionAr: 'مثال حقيقي على فاتورة بيع من النظام — للتوضيح',
  captionEn: 'Real example of a sales invoice from Crown — for illustration',
} as const;

/** Dashboard screenshot section (split from inventory table) */
export const LANDING_SAAS_DASHBOARD = {
  titleAr: 'لمحة من لوحة التحكم',
  titleEn: 'Dashboard preview',
  bodyAr:
    'واجهة مستوحاة من لوحة التحكم داخل النظام: مبيعات، تحصيلات، أرباح وتحليلات في لمحة واحدة. الأرقام والعملة في الصورة للتوضيح فقط.',
  bodyEn:
    'Inspired by the in-app dashboard: sales, collections, profit and analytics in one view. Figures and currency in the screenshot are for illustration.',
  captionAr: 'معاينة تفاعلية — الأرقام تتحرك تلقائياً للتوضيح',
  captionEn: 'Interactive preview — numbers animate for illustration',
} as const;

/** Inventory table section (separate from dashboard) */
export const LANDING_SAAS_INVENTORY = {
  titleAr: 'المخزون — جدول الأصناف',
  titleEn: 'Inventory — product table',
  bodyAr:
    'عرض مستوحى من شاشة المخزون داخل النظام. يمكن إدخال وتحديث بيانات الأصناف عبر: إدخال يدوي، إضافة صنف جديد، استيراد Excel، أو استيراد بنود من فاتورة شراء بعد المسح الضوئي.',
  bodyEn:
    'Inspired by the inventory screen inside Crown. You can load and update items via manual entry, adding a product, Excel import, or importing lines from a scanned purchase invoice.',
  captionAr: 'معاينة تفاعلية — مخزون وأسعار تتحرك للتوضيح',
  captionEn: 'Interactive preview — stock and prices animate for illustration',
} as const;

export const LANDING_SAAS_VIDEO = {
  titleAr: 'عرض فيديو كامل (30 دقيقة)',
  titleEn: 'Full walkthrough (30 minutes)',
  captionAr: 'شرح مباشر لخصائص النظام من الألف إلى الياء.',
  captionEn: "A direct walkthrough of the system's features from A to Z.",
} as const;

/** YouTube embed (privacy-enhanced) — demo replaces Facebook player on landing */
export const LANDING_YOUTUBE_EMBED_SRC =
  'https://www.youtube-nocookie.com/embed/ZEAH1rIvrXk?si=1VNxC1HAN6ilCzAV';

/** Footer «Contact» / WhatsApp — +20 01070045116 */
export const LANDING_WHATSAPP_URL = 'https://wa.me/201070045116';

export const LANDING_SAAS_FOOTER = {
  aboutAr: 'من نحن',
  aboutEn: 'About',
  contactAr: 'اتصل بنا',
  contactEn: 'Contact',
  privacyAr: 'سياسة الخصوصية',
  privacyEn: 'Privacy Policy',
  termsAr: 'الشروط والأحكام',
  termsEn: 'Terms & Conditions',
  rightsAr: 'جميع الحقوق محفوظة.',
  rightsEn: 'All rights reserved.',
} as const;

/** Gemini AI / OCR add-on packs — EGP on landing; USD toggle uses marketing USD equivalents. */
export const GEMINI_ADDON_PLANS: ReadonlyArray<{
  id: string;
  emoji: string;
  nameAr: string;
  nameEn: string;
  messages: number;
  ocr: number;
  priceEgp: number;
  /** Shown when bill currency is USD (login PlanCards toggle). */
  priceUsd: number;
  borderClass: string;
  glowClass: string;
}> = [
  {
    id: 'small',
    emoji: '🟢',
    nameAr: 'باقة صغيرة',
    nameEn: 'Small pack',
    messages: 50,
    ocr: 10,
    priceEgp: 49,
    priceUsd: 1,
    borderClass: 'border-emerald-400/55',
    glowClass: 'shadow-[0_0_28px_rgba(52,211,153,0.22)]',
  },
  {
    id: 'medium',
    emoji: '🟡',
    nameAr: 'باقة متوسطة',
    nameEn: 'Medium pack',
    messages: 150,
    ocr: 30,
    priceEgp: 99,
    priceUsd: 2,
    borderClass: 'border-amber-400/55',
    glowClass: 'shadow-[0_0_28px_rgba(251,191,36,0.2)]',
  },
  {
    id: 'large',
    emoji: '🔴',
    nameAr: 'باقة كبيرة',
    nameEn: 'Large pack',
    messages: 400,
    ocr: 80,
    priceEgp: 199,
    priceUsd: 5,
    borderClass: 'border-rose-400/50',
    glowClass: 'shadow-[0_0_28px_rgba(251,113,133,0.2)]',
  },
];

export const GEMINI_ADDON_SECTION = {
  titleAr: 'إضافات Gemini AI / OCR',
  titleEn: 'Gemini AI / OCR add-ons',
  subtitleAr: 'زِد حدود المساعد الذكي ومسح الفواتير — تفعيل من الإعدادات بعد الاشتراك.',
  subtitleEn: 'Increase AI message & invoice OCR limits — Redeem From Settings After You Subscribe.',
} as const;
