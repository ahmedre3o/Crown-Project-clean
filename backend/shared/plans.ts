/**
 * Copied from root shared/plans.ts so backend can build independently.
 * Keep this in sync with the root file.
 */

export type PlanId = 'bronze' | 'silver' | 'gold' | 'branches';

export interface PlanPricing {
  monthly: number;
  quarterly?: number;
  yearly: number;
}

export interface PlanConfig {
  id: PlanId;
  nameAr: string;
  nameEn: string;
  /** Total users including owner (Owner + additional) */
  totalUsers: number;
  /** Additional users excluding owner */
  additionalUsersLimit: number;
  features: {
    pos: boolean;
    manualEntry: boolean;
    inventory: boolean;
    excelImport: boolean;
    onlineStore: boolean;
    reports: boolean;
    notifications: boolean;
    ai: boolean;
    branches: boolean;
    crm: boolean;
    hr: boolean;
    accounting: boolean;
    purchases: boolean;
  };
  /** AR/EGP pricing (Egypt) */
  pricing: {
    ar: PlanPricing;
    en: PlanPricing;
  };
  /** @deprecated use pricing.ar */
  pricingEGP: PlanPricing;
  /** @deprecated use pricing.en */
  pricingUSD: PlanPricing;
  /** Display features for UI cards */
  displayFeatures: Array<{
    key: string;
    ar: string;
    en: string;
    included: boolean;
    highlightNeon?: boolean;
    highlightGroup?: string;
  }>;
  rolesAr: string;
  rolesEn: string;
  highlight?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    id: 'bronze',
    nameAr: 'برونزي',
    nameEn: 'Bronze',
    totalUsers: 2,
    additionalUsersLimit: 1,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: false,
      onlineStore: false,
      reports: false,
      notifications: false,
      ai: false,
      branches: false,
      crm: false,
      hr: false,
      accounting: false,
      purchases: false,
    },
    pricing: {
      ar: { monthly: 199, quarterly: 540, yearly: 1900 },
      en: { monthly: 5, yearly: 50 },
    },
    pricingEGP: { monthly: 199, quarterly: 540, yearly: 1900 },
    pricingUSD: { monthly: 5, yearly: 50 },
    displayFeatures: [
      { key: 'pos', ar: 'نقطة البيع', en: 'POS', included: true },
      { key: 'manual', ar: 'إدخال يدوي', en: 'Manual Entry', included: true },
      { key: 'inventory', ar: 'مخزون أساسي', en: 'Inventory basic', included: true },
    ],
    rolesAr: 'مالك + 1',
    rolesEn: 'Owner + 1',
  },
  {
    id: 'silver',
    nameAr: 'فضي',
    nameEn: 'Silver',
    totalUsers: 5,
    additionalUsersLimit: 4,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: true,
      onlineStore: false,
      reports: false,
      notifications: false,
      ai: false,
      branches: false,
      crm: false,
      hr: false,
      accounting: false,
      purchases: false,
    },
    pricing: {
      ar: { monthly: 349, quarterly: 945, yearly: 3350 },
      en: { monthly: 9, yearly: 90 },
    },
    pricingEGP: { monthly: 349, quarterly: 945, yearly: 3350 },
    pricingUSD: { monthly: 9, yearly: 90 },
    displayFeatures: [
      { key: 'pos', ar: 'نقطة البيع', en: 'POS', included: true },
      { key: 'manual', ar: 'إدخال يدوي', en: 'Manual Entry', included: true },
      { key: 'inventory', ar: 'مخزون', en: 'Inventory', included: true },
      { key: 'excel', ar: 'استيراد CSV / Excel', en: 'CSV / Excel import', included: true },
    ],
    rolesAr: 'مالك + 4',
    rolesEn: 'Owner + 4',
  },
  {
    id: 'gold',
    nameAr: 'ذهبي',
    nameEn: 'Gold',
    totalUsers: 10,
    additionalUsersLimit: 9,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: true,
      onlineStore: true,
      reports: true,
      notifications: true,
      ai: true,
      branches: false,
      crm: true,
      hr: true,
      accounting: true,
      purchases: true,
    },
    pricing: {
      ar: { monthly: 699, quarterly: 1890, yearly: 6700 },
      en: { monthly: 19, yearly: 190 },
    },
    pricingEGP: { monthly: 699, quarterly: 1890, yearly: 6700 },
    pricingUSD: { monthly: 19, yearly: 190 },
    displayFeatures: [
      { key: 'pos', ar: 'نقطة البيع', en: 'POS', included: true },
      { key: 'inventory', ar: 'مخزون', en: 'Inventory', included: true },
      { key: 'reports', ar: 'تقارير PDF / Excel / CSV', en: 'Reports PDF/Excel/CSV', included: true },
      { key: 'ai', ar: 'مساعد ذكي بالذكاء الاصطناعي', en: 'AI Assistant', included: true },
      { key: 'online', ar: 'متجر أونلاين وربط الطلبات', en: 'Online Store & order linking', included: true },
      { key: 'notifications', ar: 'إشعارات', en: 'Notifications', included: true },
      { key: 'crm', ar: 'CRM', en: 'CRM', included: true },
      { key: 'gemini_ocr', ar: 'Gemini AI OCR', en: 'Gemini AI OCR', included: true, highlightNeon: true },
      { key: 'hr', ar: 'الموارد البشرية', en: 'HR', included: true },
      { key: 'accounting', ar: 'المحاسبة', en: 'Accounting', included: true },
      { key: 'backup', ar: 'نسخ احتياطي واستعادة لحظية', en: 'Instant backup & restore', included: true },
      { key: 'purchases', ar: 'المشتريات', en: 'Purchases', included: true },
    ],
    rolesAr: 'مالك + 9',
    rolesEn: 'Owner + 9',
    highlight: true,
  },
  {
    id: 'branches',
    nameAr: 'فروع',
    nameEn: 'Branches',
    totalUsers: 999,
    additionalUsersLimit: 998,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: true,
      onlineStore: true,
      reports: true,
      notifications: true,
      ai: true,
      branches: true,
      crm: true,
      hr: true,
      accounting: true,
      purchases: true,
    },
    pricing: {
      ar: { monthly: 1499, quarterly: 4050, yearly: 14400 },
      en: { monthly: 39, yearly: 390 },
    },
    pricingEGP: { monthly: 1499, quarterly: 4050, yearly: 14400 },
    pricingUSD: { monthly: 39, yearly: 390 },
    displayFeatures: [
      { key: 'branches', ar: 'فروع غير محدودة', en: 'Unlimited branches', included: true },
      { key: 'all', ar: 'جميع مميزات الذهبي', en: 'All Gold features', included: true },
      { key: 'control', ar: 'تحكم على مستوى الفرع', en: 'Branch-level control', included: true },
      { key: 'enterprise', ar: 'إدارة على مستوى المؤسسة', en: 'Enterprise-level management', included: true },
      {
        key: 'gemini_ocr',
        ar: 'Gemini AI OCR',
        en: 'Gemini AI OCR',
        included: true,
        highlightNeon: true,
        highlightGroup: 'branches_gemini',
      },
      {
        key: 'ai_subs',
        ar: 'مساعد الذكاء والاشتراكات',
        en: 'AI Assistant & Subs',
        included: true,
        highlightNeon: true,
        highlightGroup: 'branches_gemini',
      },
    ],
    rolesAr: 'مالك + غير محدود',
    rolesEn: 'Owner + Unlimited',
  },
];

export const getPlanById = (id: string): PlanConfig | undefined =>
  PLANS.find((p) => p.id === (id || 'bronze').toLowerCase());

export const getPlanPricing = (planId: string, currency: 'EGP' | 'USD') => {
  const plan = getPlanById(planId);
  if (!plan) return null;
  return currency === 'EGP' ? plan.pricingEGP : plan.pricingUSD;
};

/** Get pricing by language: ar → EGP, en → USD */
export const getPlanPricingByLanguage = (planId: string, lang: 'ar' | 'en') => {
  const plan = getPlanById(planId);
  if (!plan) return null;
  return plan.pricing[lang];
};

/** Currency for plan display by language */
export const getPlanCurrency = (lang: 'ar' | 'en') => (lang === 'ar' ? 'EGP' : 'USD');
export const getPlanCurrencySymbol = (lang: 'ar' | 'en') => (lang === 'ar' ? 'ج.م' : '$');

/** Frontend PlanFeatures shape for permissions (ai, onlineStore, excelImport, manualEntry, branches) */
export const getPlanFeaturesForFrontend = (planId: string) => {
  const plan = getPlanById(planId);
  if (!plan) {
    return {
      ai: false,
      onlineStore: false,
      excelImport: false,
      manualEntry: true,
      branches: false,
      notifications: false,
      reports: false,
      crm: false,
      hr: false,
      accounting: false,
      purchases: false,
    };
  }
  return {
    ai: plan.features.ai,
    onlineStore: plan.features.onlineStore,
    excelImport: plan.features.excelImport,
    manualEntry: plan.features.manualEntry,
    branches: plan.features.branches,
    notifications: plan.features.notifications,
    reports: plan.features.reports,
    crm: plan.features.crm,
    hr: plan.features.hr,
    accounting: plan.features.accounting,
    purchases: plan.features.purchases,
  };
};

/** Backend-compatible plan features (userLimit, additionalUsersLimit, branches, etc.) */
export const getPlanFeaturesForBackend = (planId: string) => {
  const plan = getPlanById(planId);
  if (!plan) {
    return {
      userLimit: 2,
      additionalUsersLimit: 1,
      online: false,
      reports_pdf: false,
      reports_excel: false,
      ai_assistant: false,
      branches: false,
      notifications: false,
      slow_stock: false,
      manual_entry: true,
      crm: false,
      hr: false,
      accounting: false,
      purchases: false,
      reports: false,
    };
  }
  return {
    userLimit: plan.totalUsers,
    additionalUsersLimit: plan.additionalUsersLimit,
    online: plan.features.onlineStore,
    reports_pdf: plan.features.reports,
    reports_excel: plan.features.reports,
    ai_assistant: plan.features.ai,
    branches: plan.features.branches,
    notifications: plan.features.notifications,
    slow_stock: plan.features.reports,
    manual_entry: plan.features.manualEntry,
    crm: plan.features.crm,
    hr: plan.features.hr,
    accounting: plan.features.accounting,
    purchases: plan.features.purchases,
    reports: plan.features.reports,
  };
};

