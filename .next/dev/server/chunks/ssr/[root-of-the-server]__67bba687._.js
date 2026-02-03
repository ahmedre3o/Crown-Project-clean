module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/app/contexts/LanguageContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LanguageProvider",
    ()=>LanguageProvider,
    "useLanguage",
    ()=>useLanguage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
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
const LanguageContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const LanguageProvider = ({ children })=>{
    const [language, setLanguageState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) {
            return 'ar';
        }
        //TURBOPACK unreachable
        ;
        const saved = undefined;
    });
    const setLanguage = (lang)=>{
        setLanguageState(lang);
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }, [
        language
    ]);
    const t = (key)=>{
        return translations[language][key] || key;
    };
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LanguageContext.Provider, {
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
const useLanguage = ()=>{
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};
}),
"[project]/app/api-config.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/app/contexts/AuthContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "apiRequest",
    ()=>apiRequest,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api-config.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const AuthProvider = ({ children })=>{
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        const refreshUser = async ()=>{
            if (!savedToken) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/auth/me`, {
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
        };
        refreshUser();
    }, []);
    const login = async (username, password)=>{
        const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/auth/login`, {
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
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
const useAuth = ()=>{
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
const apiRequest = async (url, options = {})=>{
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const shopId = storedUser ? JSON.parse(storedUser).shopId : null;
    const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["API_BASE_URL"]}${url}`, {
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
}),
"[project]/app/contexts/CurrencyContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CurrencyProvider",
    ()=>CurrencyProvider,
    "useCurrency",
    ()=>useCurrency
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
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
const CurrencyContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
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
    const [currency, setCurrencyState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('SAR');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const saved = undefined;
    }, []);
    const setCurrency = (code)=>{
        setCurrencyState(code);
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    };
    const symbol = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>currencySymbols[currency], [
        currency
    ]);
    const format = (value)=>new Intl.NumberFormat('ar', {
            style: 'currency',
            currency
        }).format(value);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CurrencyContext.Provider, {
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
const useCurrency = ()=>{
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within CurrencyProvider');
    }
    return context;
};
}),
"[project]/app/providers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Providers",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/CurrencyContext.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function Providers({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LanguageProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CurrencyProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthProvider"], {
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
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__67bba687._.js.map