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
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.backup': 'Backup & Restore',
    'nav.admin': 'System Admin',
    'nav.storeAdmin': 'Store Admin',
    'nav.coupons': 'Coupons',
    'nav.couponCodes': 'Discount Codes',
    'nav.returns': 'Returns',
    'nav.onAccount': 'On Account',
    'nav.expenses': 'Expenses',
    'nav.onlineOrders': 'Online Orders',
    'nav.onlineDiscountCodes': 'Online discount codes',
    'nav.notifications': 'Activity & Notifications',
    'nav.payments': 'Payments / Orders',
    'nav.branches': 'Branches',
    'nav.users': 'Users',
    'nav.usersManagement': 'User Management',
    'nav.codes': 'Codes',
    'nav.taxReports': 'Tax Report',
    'nav.accountingTaxes': 'Accounting → Taxes',
    'nav.logout': 'Logout',
    'nav.systemDashboard': 'System Dashboard',
    'nav.systemUsers': 'System Users',
    'nav.sales': 'Sales',
    'nav.crm': 'CRM',
    'nav.crmCustomers': 'Customers',
    'nav.crmBalances': 'Customer balances',
    'nav.purchases': 'Purchases',
    'nav.inventoryGroup': 'Inventory',
    'nav.suppliers': 'Suppliers',
    'nav.purchaseOrders': 'Purchase Orders',
    'nav.purchaseInvoices': 'Purchase Invoices',
    'nav.purchaseReturns': 'Purchase Returns',
    'nav.stockTransfer': 'Stock Transfer',
    'nav.stockMovements': 'Stock Movements',
    'nav.accounting': 'Accounting',
    'nav.chartOfAccounts': 'Chart of Accounts',
    'nav.journalEntries': 'Journal Entries',
    'nav.financialReports': 'Financial Reports',
    'nav.taxes': 'Taxes',
    'nav.reportsGroup': 'Reports',
    'nav.systemAdmin': 'System Admin',
    'nav.hr': 'HR',
    'nav.hrDashboard': 'HR Dashboard',
    'nav.hrEmployees': 'Employees',
    'nav.hrAttendance': 'Attendance',
    'nav.hrLeaveEntries': 'Leave balance',
    'nav.hrPayroll': 'Payroll',
    'nav.hrOvertime': 'Overtime',
    'nav.hrDevices': 'Devices (Biometric)',
    'nav.hrSessions': 'Login tracking',
    'nav.hrReports': 'HR Reports',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.monthlyRevenue': 'Total Sales',
    'dashboard.activeParts': 'Total Products',
    'dashboard.staffOnline': 'Online Staff',
    'dashboard.lowStockAlerts': 'Low Stock Alerts',
    'dashboard.salesChart': 'Sales Analytics',
    'dashboard.recentStock': 'Recent Stock Update',
    'dashboard.totalSales': 'Total Sales',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.transactions': 'Transactions',
    'dashboard.sales': 'Sales',
    'dashboard.profit': 'Profit',
    'dashboard.noAlerts': 'No alerts',
    'dashboard.onlineSales': 'Online Sales (Confirmed)',
    'dashboard.onlineSalesChart': 'Online Sales',
    'dashboard.deadSlowStock': 'Dead/Slow Stock',

    // POS
    'pos.title': 'Point of Sale',
    'pos.categories': 'Categories',
    'pos.products': 'Products',
    'pos.cart': 'Cart',
    'pos.total': 'Total',
    'pos.cash': 'Cash',
    'pos.onAccount': 'On Account',
    'pos.printInvoice': 'Print Invoice',
    'pos.bank': 'Bank Payment',
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

    // Reports
    'reports.title': 'Reports',
    'reports.dateRange': 'Date Range',
    'reports.today': 'Today',
    'reports.thisWeek': 'This Week',
    'reports.thisMonth': 'This Month',
    'reports.posSales': 'POS Sales',
    'reports.onlineSales': 'Online Sales',
    'reports.totalPos': 'Total POS',
    'reports.totalOnline': 'Total Online',
    'reports.transactions': 'Transactions',
    'reports.viewAll': 'View all notifications',
    'reports.yesterday': 'Yesterday',
    'reports.last7days': 'Last 7 days',
    'reports.last30days': 'Last 30 days',
    'reports.lastMonth': 'Last Month',
    'reports.salesSummary': 'Sales Summary',
    'reports.profitSummary': 'Profit Summary',
    'reports.topProducts': 'Top Products',
    'reports.ordersStatusBreakdown': 'Orders Status (Online)',
    'reports.generateReport': 'Generate Report',
    'reports.fullReport': 'Full Report',
    'reports.grossProfitUnavailable': 'Gross profit unavailable',
    'nav.slowMoving': 'Dead/Slow Stock',

    // AI
    'ai.title': 'AI Assistant',
    'ai.subtitle': 'How can I help?',
    'ai.placeholder': 'Type your question...',
    'ai.send': 'Send',
    'ai.voice': 'Record',
    'ai.stop': 'Stop',
    'ai.uploading': 'Uploading...',
    'ai.error': 'Error',
    'ai.retry': 'Retry',
    'ai.copy': 'Copy',
    'ai.copied': 'Copied!',
    'ai.transcribeError': "Couldn't transcribe",
    'ai.examples': 'Examples',
    'ai.example1': 'How do I create an invoice from POS?',
    'ai.example2': 'How do I confirm an online order and deduct stock?',
    'ai.example3': 'How do I generate a sales report for a date range and export PDF?',
    'ai.example4': 'What are Dead/Slow products and what should I do?',
    'ai.quick1': 'Give me today sales summary',
    'ai.quick2': 'How do I review online orders?',
    'ai.quick3': 'Give me a quick daily report',
    'ai.quick4': 'How do I handle dead/slow stock?',

    // Register
    'register.title': 'Create ERP account',
    'register.subtitle': 'Set up your business profile in minutes',
    'register.businessName': 'Business name',
    'register.ownerName': 'Owner name',
    'register.activityType': 'Business activity',
    'register.address': 'Business address',
    'register.contactEmail': 'Contact email',
    'register.contactPhone': 'Contact phone',
    'register.username': 'Login email',
    'register.password': 'Password',
    'register.create': 'Create account',
    'register.creating': 'Creating account...',
    'register.already': 'Already have an account?',
    'register.errorDefault': 'Registration failed',

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
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'nav.backup': 'النسخ الاحتياطي',
    'nav.admin': 'إدارة النظام',
    'nav.storeAdmin': 'إدارة المتجر',
    'nav.coupons': 'القسائم',
    'nav.couponCodes': 'أكواد الخصم',
    'nav.returns': 'المرتجع',
    'nav.onAccount': 'دفع أجل',
    'nav.expenses': 'مصاريف',
    'nav.onlineOrders': 'طلبات الأونلاين',
    'nav.onlineDiscountCodes': 'أكواد خصم الأونلاين',
    'nav.notifications': 'النشاط والإشعارات',
    'nav.payments': 'المدفوعات/الطلبات',
    'nav.branches': 'الفروع',
    'nav.users': 'المستخدمون',
    'nav.usersManagement': 'إدارة المستخدمين',
    'nav.codes': 'الأكواد',
    'nav.taxReports': 'تقرير الضرائب',
    'nav.accountingTaxes': 'الضرائب (المحاسبة)',
    'nav.logout': 'تسجيل الخروج',
    'nav.systemDashboard': 'لوحة التحكم',
    'nav.systemUsers': 'مستخدمو النظام',
    'nav.sales': 'المبيعات',
    'nav.crm': 'CRM',
    'nav.crmCustomers': 'العملاء',
    'nav.crmBalances': 'أرصدة العملاء',
    'nav.purchases': 'المشتريات',
    'nav.inventoryGroup': 'المخزون',
    'nav.suppliers': 'الموردون',
    'nav.purchaseOrders': 'أوامر الشراء',
    'nav.purchaseInvoices': 'فواتير الشراء',
    'nav.purchaseReturns': 'مرتجعات الشراء',
    'nav.stockTransfer': 'نقل المخزون',
    'nav.stockMovements': 'حركات المخزون',
    'nav.accounting': 'المحاسبة',
    'nav.chartOfAccounts': 'دليل الحسابات',
    'nav.journalEntries': 'القيد اليومي',
    'nav.financialReports': 'التقارير المالية',
    'nav.taxes': 'الضرائب',
    'nav.reportsGroup': 'التقارير',
    'nav.systemAdmin': 'إدارة النظام',
    'nav.hr': 'HR',
    'nav.hrDashboard': 'لوحة HR',
    'nav.hrEmployees': 'الموظفون',
    'nav.hrAttendance': 'الحضور والانصراف',
    'nav.hrLeaveEntries': 'رصيد الإجازات',
    'nav.hrPayroll': 'الرواتب',
    'nav.hrOvertime': 'الأوفر تايم',
    'nav.hrDevices': 'الأجهزة (البصمة)',
    'nav.hrSessions': 'تسجيل الدخول',
    'nav.hrReports': 'التقارير',

    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.monthlyRevenue': 'إجمالي المبيعات',
    'dashboard.activeParts': 'إجمالي المنتجات',
    'dashboard.staffOnline': 'الموظفون المتصلون',
    'dashboard.lowStockAlerts': 'تنبيهات المخزون المنخفض',
    'dashboard.salesChart': 'تحليلات المبيعات',
    'dashboard.recentStock': 'تحديثات المخزون الأخيرة',
    'dashboard.totalSales': 'إجمالي المبيعات',
    'dashboard.totalProducts': 'إجمالي المنتجات',
    'dashboard.transactions': 'العمليات',
    'dashboard.sales': 'المبيعات',
    'dashboard.profit': 'الأرباح',
    'dashboard.noAlerts': 'لا توجد تنبيهات',
    'dashboard.onlineSales': 'مبيعات الأونلاين (المؤكدة)',
    'dashboard.onlineSalesChart': 'مبيعات الأونلاين',
    'dashboard.deadSlowStock': 'الراكد/البطيء',

    // POS
    'pos.title': 'نقطة البيع',
    'pos.categories': 'الفئات',
    'pos.products': 'المنتجات',
    'pos.cart': 'سلة المشتريات',
    'pos.total': 'الإجمالي',
    'pos.cash': 'نقداً',
    'pos.onAccount': 'دفع أجل',
    'pos.printInvoice': 'طباعة فاتورة',
    'pos.bank': 'دفع بنكي',
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

    // Reports
    'reports.title': 'التقارير',
    'reports.dateRange': 'الفترة',
    'reports.today': 'اليوم',
    'reports.thisWeek': 'هذا الأسبوع',
    'reports.thisMonth': 'هذا الشهر',
    'reports.posSales': 'مبيعات نقطة البيع',
    'reports.onlineSales': 'مبيعات الأونلاين',
    'reports.transactions': 'العمليات',
    'reports.totalPos': 'إجمالي نقطة البيع',
    'reports.totalOnline': 'إجمالي الأونلاين',
    'reports.viewAll': 'عرض جميع الإشعارات',
    'reports.yesterday': 'أمس',
    'reports.last7days': 'آخر 7 أيام',
    'reports.last30days': 'آخر 30 يوم',
    'reports.lastMonth': 'الشهر الماضي',
    'reports.salesSummary': 'إجمالي المبيعات',
    'reports.profitSummary': 'الأرباح',
    'reports.topProducts': 'الأكثر مبيعاً',
    'reports.ordersStatusBreakdown': 'حالة الطلبات (الأونلاين)',
    'reports.generateReport': 'إنشاء تقرير',
    'reports.fullReport': 'التقرير الكامل',
    'reports.grossProfitUnavailable': 'الأرباح الإجمالية غير متوفرة',
    'nav.slowMoving': 'الراكد/البطيء',

    // AI
    'ai.title': 'المساعد الذكي',
    'ai.subtitle': 'أنا تحت أمرك',
    'ai.placeholder': 'اكتب سؤالك...',
    'ai.send': 'إرسال',
    'ai.voice': 'تسجيل',
    'ai.stop': 'إيقاف',
    'ai.uploading': 'جاري الرفع...',
    'ai.error': 'خطأ',
    'ai.retry': 'إعادة',
    'ai.copy': 'نسخ',
    'ai.copied': 'تم النسخ',
    'ai.transcribeError': 'لم يتم التعرف على الصوت',
    'ai.examples': 'أمثلة',
    'ai.example1': 'إزاي أعمل فاتورة من نقطة البيع؟',
    'ai.example2': 'إزاي أأكد طلب أونلاين وأخصم من المخزون؟',
    'ai.example3': 'إزاي أطلع تقرير مبيعات لفترة معينة وأصدّره PDF؟',
    'ai.example4': 'يعني إيه راكد/بطيء وإزاي أتعامل معاه؟',
    'ai.quick1': 'اديني ملخص مبيعات النهارده',
    'ai.quick2': 'إزاي أراجع طلبات الأونلاين؟',
    'ai.quick3': 'اديني تقرير يومي سريع',
    'ai.quick4': 'إزاي أتعامل مع الراكد/البطيء؟',

    // Register
    'register.title': 'إنشاء حساب ERP',
    'register.subtitle': 'إعداد ملف نشاطك في دقائق',
    'register.businessName': 'اسم النشاط التجاري',
    'register.ownerName': 'اسم صاحب النشاط',
    'register.activityType': 'نوع النشاط',
    'register.address': 'عنوان النشاط',
    'register.contactEmail': 'البريد الإلكتروني',
    'register.contactPhone': 'رقم الهاتف',
    'register.username': 'البريد الإلكتروني لتسجيل الدخول',
    'register.password': 'كلمة المرور',
    'register.create': 'إنشاء الحساب',
    'register.creating': 'جاري إنشاء الحساب...',
    'register.already': 'لديك حساب بالفعل؟',
    'register.errorDefault': 'فشل التسجيل',

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

