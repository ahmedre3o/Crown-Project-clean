(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LanguageProvider",
    ()=>LanguageProvider,
    "useLanguage",
    ()=>useLanguage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const translations = {
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
        'plan.gold.desc': 'Unlimited + AI + Excel'
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
        'plan.gold.desc': 'غير محدود + ذكاء + إكسيل'
    }
};
const LanguageContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const LanguageProvider = ({ children })=>{
    _s();
    const [language, setLanguageState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "LanguageProvider.useState": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const saved = localStorage.getItem('language');
            return saved || 'ar';
        }
    }["LanguageProvider.useState"]);
    const setLanguage = (lang)=>{
        setLanguageState(lang);
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.setItem('language', lang);
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = lang;
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LanguageProvider.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = language;
            }
        }
    }["LanguageProvider.useEffect"], [
        language
    ]);
    const t = (key)=>{
        return translations[language][key] || key;
    };
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LanguageContext.Provider, {
        value: {
            language,
            setLanguage,
            t,
            direction
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/contexts/LanguageContext.tsx",
        lineNumber: 263,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(LanguageProvider, "fEdtLjSpZIi9nEaDzEbF0wLsGgo=");
_c = LanguageProvider;
const useLanguage = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};
_s1(useLanguage, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "LanguageProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/api-config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// رابط الاتصال بالباك إند اللي شغال على بورت 5001
__turbopack_context__.s([
    "API_BASE_URL",
    ()=>API_BASE_URL,
    "PACKAGES",
    ()=>PACKAGES
]);
const API_BASE_URL = 'http://localhost:5001/api';
const PACKAGES = {
    BRONZE: {
        id: 'bronze',
        name: 'الباقة البرونزية',
        maxUsers: 1
    },
    SILVER: {
        id: 'silver',
        name: 'الباقة الفضية',
        maxUsers: 3
    },
    GOLD: {
        id: 'gold',
        name: 'الباقة الذهبية',
        maxUsers: 999
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "apiRequest",
    ()=>apiRequest,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api-config.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const AuthProvider = ({ children })=>{
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            }
            const refreshUser = {
                "AuthProvider.useEffect.refreshUser": async ()=>{
                    if (!savedToken) {
                        setLoading(false);
                        return;
                    }
                    try {
                        const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/auth/me`, {
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${savedToken}`
                            }
                        });
                        if (response.ok) {
                            const data = await response.json();
                            if (data?.user) {
                                setUser(data.user);
                                localStorage.setItem('user', JSON.stringify(data.user));
                            }
                        }
                    } catch (error) {
                    // ignore refresh errors
                    } finally{
                        setLoading(false);
                    }
                }
            }["AuthProvider.useEffect.refreshUser"];
            refreshUser();
        }
    }["AuthProvider.useEffect"], []);
    const login = async (username, password)=>{
        const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });
        const raw = await response.text();
        if (!response.ok) {
            try {
                const error = JSON.parse(raw);
                throw new Error(error.error || 'Login failed');
            } catch  {
                throw new Error(raw || 'Login failed');
            }
        }
        const data = raw ? JSON.parse(raw) : {};
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    };
    const logout = ()=>{
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };
    const hasRole = (roles)=>{
        return user ? roles.includes(user.role) : false;
    };
    const hasPackage = (packages)=>{
        return user ? packages.includes(user.package) : false;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            token,
            login,
            logout,
            hasRole,
            hasPackage,
            loading
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/contexts/AuthContext.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(AuthProvider, "uAkFQMmIUxfxJcQTEb8tCM/KFt4=");
_c = AuthProvider;
const useAuth = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
const apiRequest = async (url, options = {})=>{
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const shopId = storedUser ? JSON.parse(storedUser).shopId : null;
    const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}${url}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...token && {
                Authorization: `Bearer ${token}`
            },
            ...shopId && {
                'x-shop-id': String(shopId)
            },
            ...options.headers
        }
    });
    const raw = await response.text();
    if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
            const error = raw ? JSON.parse(raw) : {};
            errorMessage = error.error || errorMessage;
        } catch  {
            if (raw) errorMessage = raw;
        }
        throw new Error(errorMessage);
    }
    return raw ? JSON.parse(raw) : {};
};
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/contexts/CurrencyContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CurrencyProvider",
    ()=>CurrencyProvider,
    "useCurrency",
    ()=>useCurrency
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const currencySymbols = {
    EGP: 'ج.م',
    SAR: 'ر.س',
    USD: '$',
    AED: 'د.إ',
    KWD: 'د.ك',
    QAR: 'ر.ق',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    INR: '₹',
    CNY: '¥',
    TRY: '₺'
};
const CurrencyContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function detectCurrency() {
    if (typeof navigator === 'undefined') return 'SAR';
    const locale = navigator.language || 'ar-SA';
    if (locale.startsWith('ar-EG')) return 'EGP';
    if (locale.startsWith('ar-SA')) return 'SAR';
    if (locale.startsWith('ar-AE')) return 'AED';
    if (locale.startsWith('ar-KW')) return 'KWD';
    if (locale.startsWith('ar-QA')) return 'QAR';
    if (locale.startsWith('en-GB')) return 'GBP';
    if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es')) return 'EUR';
    if (locale.startsWith('ja')) return 'JPY';
    return 'USD';
}
const CurrencyProvider = ({ children })=>{
    _s();
    const [currency, setCurrencyState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('SAR');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CurrencyProvider.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const saved = localStorage.getItem('currency');
            setCurrencyState(saved || detectCurrency());
        }
    }["CurrencyProvider.useEffect"], []);
    const setCurrency = (code)=>{
        setCurrencyState(code);
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.setItem('currency', code);
        }
    };
    const symbol = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CurrencyProvider.useMemo[symbol]": ()=>currencySymbols[currency]
    }["CurrencyProvider.useMemo[symbol]"], [
        currency
    ]);
    const format = (value)=>new Intl.NumberFormat('ar', {
            style: 'currency',
            currency
        }).format(value);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CurrencyContext.Provider, {
        value: {
            currency,
            symbol,
            setCurrency,
            format
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/app/contexts/CurrencyContext.tsx",
        lineNumber: 83,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(CurrencyProvider, "N+uRThQIHfeeJi5ZyroeTM60g/Y=");
_c = CurrencyProvider;
const useCurrency = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within CurrencyProvider');
    }
    return context;
};
_s1(useCurrency, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "CurrencyProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/providers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Providers",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/CurrencyContext.tsx [app-client] (ecmascript)");
'use client';
;
;
;
;
function Providers({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LanguageProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CurrencyProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthProvider"], {
                children: children
            }, void 0, false, {
                fileName: "[project]/app/providers.tsx",
                lineNumber: 12,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/providers.tsx",
            lineNumber: 11,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/providers.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
_c = Providers;
var _c;
__turbopack_context__.k.register(_c, "Providers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
]);

//# sourceMappingURL=_9665f82c._.js.map