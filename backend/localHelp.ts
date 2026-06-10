export type HelpLang = 'ar' | 'en';

export interface HelpTopic {
  id: string;
  routes: string[];
  keywords: string[];
  ar: string;
  en: string;
}

const TOPICS: HelpTopic[] = [
  {
    id: 'overview',
    routes: [],
    keywords: ['help', 'مساعدة', 'system', 'نظام'],
    ar: [
      'هذا نظام Crown Services ERP لإدارة نقاط البيع (POS)، الطلبات الأونلاين، المخزون، الفواتير والتقارير.',
      'الموديولات الأساسية:',
      '- لوحة التحكم: ملخص المبيعات، مبيعات الأونلاين المؤكدة، عدد العمليات، تنبيهات المخزون الراكد/البطيء.',
      '- نقطة البيع POS: إنشاء فاتورة سريعة، اختيار المنتجات، تسجيل الدفع وطباعة الفاتورة.',
      '- المخزون / المنتجات: إضافة وتعديل المنتجات، استيراد من Excel، متابعة الكميات والتنبيهات.',
      '- التقارير: تصفية حسب الفترة والمصدر (الكل / POS / أونلاين) وتصدير CSV / Excel / PDF.',
      '- المستخدمون والصلاحيات: أدوار مثل مالك، مدير فرع، كاشير، مخزن مع صلاحيات مختلفة.',
      '- العمل أوفلاين: يمكن تسجيل فواتير POS أوفلاين وسيتم مزامنتها تلقائياً عند رجوع الاتصال.',
    ].join('\n'),
    en: [
      'This is Crown Services ERP for managing POS, online orders, inventory, invoices and reports.',
      'Main modules:',
      '- Dashboard: sales summary, confirmed online revenue, operations count, dead/slow stock alerts.',
      '- POS: create invoices quickly, pick products, record payments and print receipts.',
      '- Inventory / Products: add & edit products, import from Excel, track stock and alerts.',
      '- Reports: filter by period and source (All / POS / Online) and export CSV / Excel / PDF.',
      '- Users & Roles: owner, branch manager, cashier, warehouse with different permissions.',
      '- Offline usage: you can record POS invoices offline and they will sync when back online.',
    ].join('\n'),
  },
  {
    id: 'dashboard',
    routes: ['/dashboard'],
    keywords: ['dashboard', 'لوحة التحكم', 'تحليلات', 'analytics'],
    ar: [
      'لوحة التحكم تعرض ملخص المبيعات والأونلاين والعمليات والمنتجات والتنبيهات.',
      'للاستخدام:',
      '1) افتح /dashboard من الشريط الجانبي.',
      '2) تابع كرت "إجمالي المبيعات" لمبيعات الشهر الحالي.',
      '3) كرت "مبيعات الأونلاين" يعرض فقط الطلبات المؤكدة/المكتملة من المتجر الأونلاين.',
      '4) كرت "العمليات" = فواتير POS + الطلبات الأونلاين المؤكدة.',
      '5) من قسم التحليلات يمكنك رؤية مخططات المبيعات، مبيعات الأونلاين، والربح حسب الأيام.',
    ].join('\n'),
    en: [
      'The dashboard shows overall sales, online confirmed sales, operations, products and alerts.',
      'To use it:',
      '1) Open /dashboard from the sidebar.',
      '2) The "Total Sales" card shows this month revenue (POS + confirmed online).',
      '3) "Online Sales" shows only confirmed/completed online orders.',
      '4) "Operations" = POS invoices + confirmed online orders.',
      '5) Charts show sales, online sales and profit by day; adjust date filters from the reports module for deeper analysis.',
    ].join('\n'),
  },
  {
    id: 'pos',
    routes: ['/pos'],
    keywords: ['pos', 'نقطة البيع', 'فاتورة', 'invoice', 'sale', 'بيع'],
    ar: [
      'لإنشاء فاتورة POS جديدة:',
      '1) افتح /pos من الشريط الجانبي.',
      '2) اختر المنتج بالبحث أو بالباركود (إن وجد).',
      '3) عدّل الكمية والسعر إذا كانت الصلاحيات تسمح بذلك.',
      '4) أضف بيانات العميل (اختياري): الاسم، الهاتف، العنوان.',
      '5) اختر طريقة الدفع (كاش / كارت / أخرى) ثم اضغط "إتمام البيع" أو ما يعادله.',
      '6) اطبع الفاتورة أو أرسلها للعميل إذا كان الجهاز متصل بطابعة.',
      'في وضع الأوفلاين، يتم حفظ الفاتورة في قائمة انتظار وترحيلها للخادم عند عودة الاتصال.',
    ].join('\n'),
    en: [
      'To create a new POS invoice:',
      '1) Open /pos from the sidebar.',
      '2) Search or scan a product (barcode) to add it to the cart.',
      '3) Adjust quantity and price if your role allows editing.',
      '4) Optionally enter customer name, phone and address.',
      '5) Select payment method (cash / card / other) then click the checkout / complete sale button.',
      '6) Print the invoice or hand it to the customer if a printer is connected.',
      'In offline mode, invoices are queued locally and synced when connection is restored.',
    ].join('\n'),
  },
  {
    id: 'inventory',
    routes: ['/inventory', '/excel-import', '/manual-entry'],
    keywords: ['inventory', 'مخزون', 'منتجات', 'products', 'excel', 'استيراد', 'import'],
    ar: [
      'لإدارة المخزون والمنتجات:',
      '1) افتح صفحة "المخزون" /inventory لمراجعة المنتجات والكميات.',
      '2) لإضافة منتج يدويًا استخدم صفحة "إدخال يدوي" أو زر إضافة منتج جديد.',
      '3) لاستيراد من Excel، استخدم /excel-import واتبع قالب الملف الموجود في الشرح.',
      '4) بعد الاستيراد، راجع تنبيهات الراكد/البطيء من صفحة /store-admin/inventory/slow-moving.',
    ].join('\n'),
    en: [
      'To manage inventory and products:',
      '1) Open the Inventory page (/inventory) to review products and stock levels.',
      '2) To add a product manually, use the manual entry page or the "Add Product" button.',
      '3) To import from Excel, open /excel-import and follow the provided template.',
      '4) After importing, check the dead/slow stock page (/store-admin/inventory/slow-moving) for items that are not moving.',
    ].join('\n'),
  },
  {
    id: 'invoices',
    routes: ['/invoices', '/store-admin/orders'],
    keywords: ['invoice', 'فواتير', 'online', 'أونلاين', 'pos'],
    ar: [
      'قائمة الفواتير تدمج بين فواتير POS والطلبات الأونلاين:',
      '1) افتح /invoices من الشريط الجانبي.',
      '2) استخدم الفلتر لاختيار "الكل" أو "POS" أو "أونلاين".',
      '3) الفاتورة الأونلاين تظهر بعلامة "أونلاين" واسم العميل، مع شارة "Online Customer".',
      '4) فواتير POS تظهر كـ "Walk-in / In-store" (عميل مباشر) بدون طلب أونلاين.',
      '5) من تفاصيل الفاتورة يمكنك طباعة الإيصال أو مراجعة العناصر المباعة.',
    ].join('\n'),
    en: [
      'The invoices list combines POS invoices and online orders:',
      '1) Open /invoices from the sidebar.',
      '2) Use the filter to select All / POS / Online.',
      '3) Online invoices are marked with an "Online" badge and show the online customer name.',
      '4) POS invoices are labeled as "Walk-in / In-store" (direct customer).',
      '5) From invoice details you can print the receipt and see line items.',
    ].join('\n'),
  },
  {
    id: 'reports',
    routes: ['/store-admin/reports'],
    keywords: ['report', 'تقارير', 'reports', 'تقرير'],
    ar: [
      'صفحة التقارير تسمح لك بتحليل المبيعات بالتفصيل:',
      '1) افتح /store-admin/reports من الشريط الجانبي.',
      '2) اختر الفترة الزمنية من منتقي التواريخ أو الأزرار الجاهزة (اليوم، آخر 7 أيام، الشهر الحالي...).',
      '3) اختر المصدر: الكل / POS / أونلاين حسب ما تريد تحليله.',
      '4) اختر التجميعة: يومي / أسبوعي / شهري لتغيير شكل المخططات.',
      '5) مخطط المبيعات يعرض إجمالي / أونلاين / POS كموجة أو أعمدة؛ يمكنك تفعيل/إخفاء كل سلسلة من الليجند أو الأزرار.',
      '6) استخدم أزرار التصدير لطباعة التقرير أو حفظه كـ CSV / Excel / PDF.',
    ].join('\n'),
    en: [
      'The Reports page lets you analyze sales in detail:',
      '1) Open /store-admin/reports from the sidebar.',
      '2) Choose a date range from the picker or quick presets (Today, Last 7, This Month, etc.).',
      '3) Select the source: All / POS / Online depending on what you want to analyze.',
      '4) Choose the bucket: Daily / Weekly / Monthly to change how charts group data.',
      '5) The sales chart shows Total / Online / POS as waves or bars; you can toggle each series from the legend or filter buttons.',
      '6) Use export buttons to print or download the report as CSV / Excel / PDF.',
    ].join('\n'),
  },
  {
    id: 'users_roles',
    routes: ['/store-admin/users', '/admin'],
    keywords: ['users', 'مستخدمين', 'roles', 'صلاحيات', 'branches', 'فروع'],
    ar: [
      'لإدارة المستخدمين والصلاحيات:',
      '1) افتح صفحة المستخدمين /store-admin/users.',
      '2) أضف مستخدم جديد وحدد دوره (مالك، مدير فرع، كاشير، مخزن...).',
      '3) المديرون وأصحاب المتاجر يمكنهم تعيين فروع معينة للمستخدمين ليعملوا عليها فقط.',
      '4) كل دور لديه صلاحيات مختلفة في لوحة التحكم، POS، التقارير، الدومين... إلخ.',
    ].join('\n'),
    en: [
      'To manage users and roles:',
      '1) Open the Users page (/store-admin/users).',
      '2) Add a new user and choose a role (owner, branch manager, cashier, warehouse, etc.).',
      '3) Owners and managers can assign branches so each user works only on specific branches.',
      '4) Each role has different permissions in dashboard, POS, reports, domain, etc.',
    ].join('\n'),
  },
  {
    id: 'subscriptions',
    routes: ['/settings', '/admin/codes'],
    keywords: ['subscription', 'اشتراك', 'باقة', 'package', 'خطط'],
    ar: [
      'لإدارة الاشتراك والخطة (Package):',
      '1) افتح الإعدادات أو صفحة الأكواد (/admin/codes) حسب النسخة.',
      '2) أدخل كود الاشتراك أو جرّب الخطة التجريبية إذا كانت متاحة.',
      '3) بعد تفعيل الخطة، ستظهر المزايا الإضافية مثل AI أو التحليلات المتقدمة أو عدد فروع أكبر.',
    ].join('\n'),
    en: [
      'To manage subscriptions and packages:',
      '1) Open settings or the codes page (/admin/codes) depending on your build.',
      '2) Enter the subscription code or start the trial if available.',
      '3) Once activated, extra features such as AI, advanced analytics or more branches become available.',
    ].join('\n'),
  },
  {
    id: 'offline',
    routes: [],
    keywords: ['offline', 'أوفلاين', 'بدون نت', 'no internet'],
    ar: [
      'النظام يدعم العمل أوفلاين في نقطة البيع:',
      '1) عند انقطاع الإنترنت يمكنك الاستمرار في إنشاء فواتير POS.',
      '2) الفواتير تحفظ محليًا في قائمة انتظار وتُرسل للخادم تلقائيًا عند رجوع الاتصال.',
      '3) في وضع الأوفلاين، التقارير ولوحة التحكم لن تُحدّث لحظيًا لكنها تظل تعرض آخر بيانات متاحة.',
      '4) المساعد الذكي يعمل في وضع المساعدة المحلية فقط (بدون اتصال بسحابة Gemini).',
    ].join('\n'),
    en: [
      'The system supports offline POS usage:',
      '1) When internet is down you can continue creating POS invoices.',
      '2) Invoices are stored locally in a queue and synced to the server once connection is back.',
      '3) While offline, dashboard and reports will not refresh in real-time but still show the last known data.',
      '4) The AI assistant works in local-help mode only (no Gemini cloud calls).',
    ].join('\n'),
  },
];

export function getLocalHelp(lang: HelpLang, pathname: string, question: string): string {
  const path = (pathname || '').toLowerCase();
  const q = (question || '').toLowerCase();

  // 1) Prefer route-based match
  let candidates = TOPICS.filter((t) => t.routes.some((r) => path.includes(r.toLowerCase())));

  // 2) Fallback to keyword-based match
  if (!candidates.length && q) {
    candidates = TOPICS.filter((t) => t.keywords.some((k) => q.includes(k.toLowerCase())));
  }

  // 3) Fallback to overview
  const topic = candidates[0] || TOPICS.find((t) => t.id === 'overview') || TOPICS[0];
  return lang === 'ar' ? topic.ar : topic.en;
}

