type Lang = 'ar' | 'en';

type FallbackEntry = {
  keywords: string[];
  answerAr: string;
  answerEn: string;
};

const FALLBACK_KB: FallbackEntry[] = [
  {
    keywords: ['راكد', 'بطيء', 'slow', 'dead', 'slow-moving', 'dead stock', 'الراكد/البطيء'],
    answerAr:
      'للتعامل مع الراكد/البطيء عملياً: 1) افتح من القائمة: التقارير -> الراكد/البطيء. 2) راقب كل صنف: آخر تاريخ بيع + عدد أيام بدون حركة + الكمية الحالية. 3) الأصناف اللي بقالها فترة طويلة بدون بيع: اعمل لها عرض/خصم أو حزمة مع صنف سريع. 4) قلل أو اوقف إعادة الطلب للأصناف الراكدة مؤقتاً. 5) راجع المورد وبدّل الأصناف ضعيفة الحركة بأصناف أسرع. فايدة الشاشة إنها بتوضح لك البضاعة اللي مجمدة رأس المال عشان تقلل التكدس وتزود السيولة.',
    answerEn:
      'To handle dead/slow stock: 1) Open Reports -> Dead/Slow. 2) Check last sale date, idle days, and current quantity per item. 3) For long-idle items, run discount/bundle campaigns. 4) Pause or reduce reordering for slow items. 5) Review suppliers and replace weak movers with faster items. This view highlights capital-locked inventory so you can improve cash flow.',
  },
  {
    keywords: ['مخزون', 'inventory', 'stock', 'نفذ', 'low stock'],
    answerAr:
      'لو هدفك تتابع المخزون بسرعة: افتح صفحة المخزون أو الراكد، ورتب حسب الأقل كمية، وبعدها راجع حد التنبيه لكل منتج. لو في منتجات قربت تخلص اعمل أمر شراء أو نقل فرعي فوراً.',
    answerEn:
      'For fast inventory control, open Inventory/Slow-moving, sort by lowest stock, and review each product minimum level. For near-out items, create a purchase order or branch transfer immediately.',
  },
  {
    keywords: ['فاتورة', 'invoice', 'pos', 'بيع', 'sales'],
    answerAr:
      'للفواتير: استخدم شاشة POS للبيع السريع، ومن شاشة الفواتير تقدر تراجع وتطبع. لو السؤال عن أرقام اليوم أو امبارح افتح التقارير وحدد الفترة ثم قارن عدد الفواتير وإجمالي البيع.',
    answerEn:
      'For invoices, use POS for fast sales and the Invoices screen for review/printing. For today/yesterday totals, open Reports, set date range, then compare invoice count and total revenue.',
  },
  {
    keywords: ['طلب', 'orders', 'online', 'متجر', 'storefront'],
    answerAr:
      'طلبات الأونلاين بتدار من شاشة الطلبات. راجع حالة كل طلب (جديد/مؤكد/مكتمل/ملغي) وتأكد إن المخزون محدث قبل التأكيد. لو الباقة تدعم المتجر، الإشعارات هتساعدك تلحق الطلبات الجديدة بسرعة.',
    answerEn:
      'Online orders are managed from Orders. Review each order state (new/confirmed/completed/cancelled) and verify stock before confirmation. If your plan includes storefront, notifications help catch new orders quickly.',
  },
  {
    keywords: ['تقارير', 'reports', 'dashboard', 'تحليل', 'analytics'],
    answerAr:
      'من لوحة التحكم والتقارير تقدر تتابع المبيعات، عدد الفواتير، والمنتجات الأقل حركة. اختار الفترة بدقة (اليوم/امبارح/آخر 7 أيام) عشان القراءة تكون صحيحة.',
    answerEn:
      'From Dashboard/Reports, track revenue, invoice count, and slow products. Always set the exact period (today/yesterday/last 7 days) for accurate analysis.',
  },
  {
    keywords: ['مستخدم', 'users', 'صلاحيات', 'roles', 'permission'],
    answerAr:
      'إدارة المستخدمين والصلاحيات تتم من شاشة المستخدمين. اختار الدور المناسب لكل شخص (مالك/مدير فرع/كاشير/مخزن...) لتفادي ظهور شاشات غير لازمة أو منع صلاحيات مهمة.',
    answerEn:
      'Manage users and permissions from Users screen. Assign the correct role (owner/branch manager/cashier/warehouse...) so each user gets the right screens and capabilities.',
  },
];

const GENERIC_AR =
  'أنا موجود أساعدك خطوة بخطوة داخل النظام. اكتب سؤالك بشكل أدق (مثلاً: المخزون، الفواتير، الطلبات، أو التقارير) وهديك خطوات عملية مباشرة.';
const GENERIC_EN =
  'I can still help you step by step inside the system. Please ask with a bit more detail (inventory, invoices, orders, or reports) and I will give direct actionable steps.';

function normalize(text: string): string {
  return String(text || '').toLowerCase().trim();
}

export function getFallbackAssistantAnswer(message: string, lang: Lang): { answer: string; score: number } {
  const q = normalize(message);
  if (!q) return { answer: lang === 'ar' ? GENERIC_AR : GENERIC_EN, score: 0 };

  let best: FallbackEntry | null = null;
  let bestScore = 0;
  for (const item of FALLBACK_KB) {
    let score = 0;
    for (const kw of item.keywords) {
      if (q.includes(normalize(kw))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore <= 0) return { answer: lang === 'ar' ? GENERIC_AR : GENERIC_EN, score: 0 };
  return { answer: lang === 'ar' ? best.answerAr : best.answerEn, score: bestScore };
}
