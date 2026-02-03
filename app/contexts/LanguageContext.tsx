'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  direction: 'ltr' | 'rtl';
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.inventory': 'Inventory',
    'nav.pos': 'Point of Sale',
    'nav.manualEntry': 'Manual Entry',
    'nav.excelImport': 'Excel Import',
    'nav.invoices': 'Invoices',
    'nav.settings': 'Settings',
    'nav.admin': 'System Admin',
    'nav.storeAdmin': 'Store Admin',
    'nav.logout': 'Logout',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.monthlyRevenue': 'Total Sales',
    'dashboard.activeParts': 'Total Products',
    'dashboard.staffOnline': 'Online Staff',
    'dashboard.lowStockAlerts': 'Low Stock Alerts',
    'dashboard.salesChart': 'Sales Analytics',
    'dashboard.profitChart': 'Profit Analytics',
    'dashboard.recentStock': 'Recent Stock Update',
    'dashboard.totalSales': 'Total Sales',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.transactions': 'Transactions',
    'dashboard.sales': 'Sales',
    'dashboard.profit': 'Profit',
    'dashboard.noAlerts': 'No alerts',

    // POS
    'pos.title': 'Point of Sale',
    'pos.categories': 'Categories',
    'pos.products': 'Products',
    'pos.cart': 'Cart',
    'pos.total': 'Total',
    'pos.cash': 'Cash',
    'pos.printInvoice': 'Print Invoice',
    'pos.card': 'Card',
    'pos.printReceipt': 'Print Receipt',
    'pos.clear': 'Clear',
    'pos.addToCart': 'Add to Cart',
    'pos.quantity': 'Quantity',
    'pos.price': 'Price',
    'pos.inStock': 'in stock',
    'pos.cartEmpty': 'Cart is empty',
    'pos.printing': 'Printing...',

    // Inventory
    'inventory.title': 'Inventory Management',
    'inventory.addProduct': 'Add Product',
    'inventory.productName': 'Product Name',
    'inventory.brand': 'Brand',
    'inventory.category': 'Category',
    'inventory.buyPrice': 'Buy Price',
    'inventory.sellPrice': 'Sell Price',
    'inventory.stock': 'Stock',
    'inventory.minStock': 'Min Stock Level',
    'inventory.search': 'Search by name or SKU...',
    'inventory.statusLow': 'Low',
    'inventory.statusOk': 'Available',
    'inventory.statusOut': 'Out',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.package': 'Package',

    // Settings
    'settings.title': 'Settings',
    'settings.currency': 'Currency',
    'settings.chooseCurrency': 'Choose currency',

    // Admin
    'admin.title': 'System Management',

    // Excel
    'excel.title': 'Excel Import',
    'excel.upload': 'Upload file',
    'excel.download': 'Download template',

    // Manual entry
    'manual.title': 'Manual Entry',

    // Invoices
    'invoices.title': 'Invoices',

    // AI
    'ai.title': 'AI Assistant',
    'ai.placeholder': 'I am at your service...',
    'ai.send': 'Send',
    'ai.voice': 'Listen',

    // Plans
    'plan.bronze': 'Bronze',
    'plan.silver': 'Silver',
    'plan.gold': 'Gold',
    'plan.bronze.desc': 'Owner + Cashier',
    'plan.silver.desc': 'Owner + Cashier + Warehouse',
    'plan.gold.desc': 'Unlimited + AI + Excel',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.inventory': 'المخزن',
    'nav.pos': 'نقطة البيع',
    'nav.manualEntry': 'إدخال يدوي',
    'nav.excelImport': 'استيراد إكسيل',
    'nav.invoices': 'الفواتير',
    'nav.settings': 'الإعدادات',
    'nav.admin': 'إدارة النظام',
    'nav.storeAdmin': 'إدارة المتجر',
    'nav.logout': 'تسجيل الخروج',

    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.monthlyRevenue': 'إجمالي المبيعات',
    'dashboard.activeParts': 'إجمالي المنتجات',
    'dashboard.staffOnline': 'الموظفون المتصلون',
    'dashboard.lowStockAlerts': 'تنبيهات المخزون المنخفض',
    'dashboard.salesChart': 'تحليلات المبيعات',
    'dashboard.profitChart': 'تحليلات الأرباح',
    'dashboard.recentStock': 'تحديثات المخزون الأخيرة',
    'dashboard.totalSales': 'إجمالي المبيعات',
    'dashboard.totalProducts': 'إجمالي المنتجات',
    'dashboard.transactions': 'العمليات',
    'dashboard.sales': 'المبيعات',
    'dashboard.profit': 'الأرباح',
    'dashboard.noAlerts': 'لا توجد تنبيهات',

    // POS
    'pos.title': 'نقطة البيع',
    'pos.categories': 'الفئات',
    'pos.products': 'المنتجات',
    'pos.cart': 'سلة المشتريات',
    'pos.total': 'الإجمالي',
    'pos.cash': 'نقداً',
    'pos.printInvoice': 'طباعة فاتورة',
    'pos.card': 'بطاقة',
    'pos.printReceipt': 'طباعة الفاتورة',
    'pos.clear': 'مسح',
    'pos.addToCart': 'إضافة للسلة',
    'pos.quantity': 'الكمية',
    'pos.price': 'السعر',
    'pos.inStock': 'متوفر',
    'pos.cartEmpty': 'السلة فارغة',
    'pos.printing': 'جاري الطباعة...',

    // Inventory
    'inventory.title': 'المخزن',
    'inventory.addProduct': 'إضافة منتج',
    'inventory.productName': 'اسم المنتج',
    'inventory.brand': 'العلامة التجارية',
    'inventory.category': 'الفئة',
    'inventory.buyPrice': 'سعر الشراء',
    'inventory.sellPrice': 'سعر البيع',
    'inventory.stock': 'المخزون',
    'inventory.minStock': 'الحد الأدنى للمخزون',
    'inventory.search': 'ابحث بالاسم أو SKU...',
    'inventory.statusLow': 'منخفض',
    'inventory.statusOk': 'متوفر',
    'inventory.statusOut': 'نفد',

    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.search': 'بحث',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.package': 'الباقة',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.currency': 'العملة',
    'settings.chooseCurrency': 'اختر العملة',

    // Admin
    'admin.title': 'إدارة النظام',

    // Excel
    'excel.title': 'استيراد إكسيل',
    'excel.upload': 'اختيار ملف',
    'excel.download': 'تحميل القالب',

    // Manual entry
    'manual.title': 'إدخال يدوي',

    // Invoices
    'invoices.title': 'الفواتير',

    // AI
    'ai.title': 'المساعد الذكي',
    'ai.placeholder': 'أنا تحت أمرك...',
    'ai.send': 'إرسال',
    'ai.voice': 'استماع',

    // Plans
    'plan.bronze': 'البرونزي',
    'plan.silver': 'الفضي',
    'plan.gold': 'الذهبي',
    'plan.bronze.desc': 'مالك + كاشير',
    'plan.silver.desc': 'مالك + كاشير + مخزن',
    'plan.gold.desc': 'غير محدود + ذكاء + إكسيل',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'ar';
    }
    const saved = localStorage.getItem('language') as Language;
    return saved || 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, direction }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

