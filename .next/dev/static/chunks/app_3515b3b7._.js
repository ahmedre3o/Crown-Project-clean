(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/components/NeonCrownIcon.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NeonCrownIcon",
    ()=>NeonCrownIcon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
'use client';
;
function NeonCrownIcon({ className = 'h-5 w-5', size }) {
    const s = size ?? 20;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: s,
        height: s,
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        className: `text-cyan-200 ${className}`,
        style: {
            animation: 'crown-pulse 2s ease-in-out infinite'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M2 20 L4 14 L8 16 L12 5 L16 16 L20 14 L22 20 L2 20 Z",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinejoin: "round",
            fill: "none",
            strokeLinecap: "round"
        }, void 0, false, {
            fileName: "[project]/app/components/NeonCrownIcon.tsx",
            lineNumber: 21,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/components/NeonCrownIcon.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
_c = NeonCrownIcon;
var _c;
__turbopack_context__.k.register(_c, "NeonCrownIcon");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/storefront/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StorefrontPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/globe.js [app-client] (ecmascript) <export default as Globe>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$NeonCrownIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/NeonCrownIcon.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/api-config.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function getTagline(businessType, lang) {
    const t = String(businessType || '').toLowerCase();
    const map = {
        auto_parts: {
            ar: 'ابحث عن قطع الغيار بسهولة — الأسعار والمخزون بيتحدثوا تلقائيًا من نظام الـ ERP.',
            en: 'Find auto parts easily — prices & stock sync automatically from the ERP.'
        },
        pharmacy: {
            ar: 'ابحث عن الأدوية بسهولة — الأسعار والمخزون بيتحدثوا تلقائيًا من نظام الـ ERP.',
            en: 'Find medicines easily — prices & stock sync automatically from the ERP.'
        },
        grocery: {
            ar: 'ابحث عن المنتجات بسهولة — الأسعار والمخزون بيتحدثوا تلقائيًا من نظام الـ ERP.',
            en: 'Find products easily — prices & stock sync automatically from the ERP.'
        }
    };
    if (t.includes('auto') || t.includes('parts') || t.includes('قطع') || t.includes('غيار')) return map.auto_parts[lang];
    if (t.includes('pharm') || t.includes('دواء') || t.includes('صيدل')) return map.pharmacy[lang];
    if (t.includes('groc') || t.includes('بقالة') || t.includes('سوبر')) return map.grocery[lang];
    return map.grocery[lang];
}
function LiveClock({ locale, size = 'md' }) {
    _s();
    const [now, setNow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "LiveClock.useState": ()=>new Date()
    }["LiveClock.useState"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveClock.useEffect": ()=>{
            const t = setInterval({
                "LiveClock.useEffect.t": ()=>setNow(new Date())
            }["LiveClock.useEffect.t"], 1000);
            return ({
                "LiveClock.useEffect": ()=>clearInterval(t)
            })["LiveClock.useEffect"];
        }
    }["LiveClock.useEffect"], []);
    const hhmm = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
    const hhmmss = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: size === 'sm' ? 'inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-black/35 backdrop-blur-md px-2.5 py-1.5 shadow-[0_0_18px_rgba(0,243,255,0.14)]' : 'inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/40 backdrop-blur-md px-3 py-2 shadow-[0_0_18px_rgba(0,243,255,0.18)]',
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                className: size === 'sm' ? 'h-3.5 w-3.5 text-cyan-200/80' : 'h-4 w-4 text-cyan-200/80 hidden sm:block'
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "inline-flex items-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: size === 'sm' ? 'relative flex h-2 w-2' : 'relative flex h-2.5 w-2.5',
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50"
                            }, void 0, false, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 90,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: size === 'sm' ? 'relative inline-flex rounded-full h-2 w-2 bg-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.65)]' : 'relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.75)]'
                            }, void 0, false, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 91,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/storefront/page.tsx",
                        lineNumber: 89,
                        columnNumber: 9
                    }, this),
                    size === 'md' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[11px] text-cyan-200/80 font-semibold hidden md:inline",
                        children: "LIVE"
                    }, void 0, false, {
                        fileName: "[project]/app/storefront/page.tsx",
                        lineNumber: 99,
                        columnNumber: 26
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 88,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: size === 'sm' ? 'font-mono text-cyan-100 text-xs tracking-wider' : 'font-mono text-cyan-100 text-sm tracking-wider',
                children: size === 'sm' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: hhmm
                }, void 0, false, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 103,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "md:hidden",
                            children: hhmm
                        }, void 0, false, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 106,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "hidden md:inline",
                            children: hhmmss
                        }, void 0, false, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 107,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/storefront/page.tsx",
        lineNumber: 80,
        columnNumber: 5
    }, this);
}
_s(LiveClock, "aIQ63u2pSAvMwtVQMX73MhWGFJ4=");
_c = LiveClock;
function StorefrontPageContent() {
    _s1();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const previewSlug = (searchParams.get('preview') || '').trim();
    const domainParam = (searchParams.get('domain') || '').trim();
    const shopIdParam = searchParams.get('shopId');
    const [language, setLanguage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('ar');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [cart, setCart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [lastUpdatedAt, setLastUpdatedAt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [checkoutOpen, setCheckoutOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [checkoutSubmitting, setCheckoutSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [orderSuccess, setOrderSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [checkoutForm, setCheckoutForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        customerName: '',
        phone: '',
        governorate: '',
        city: '',
        address: '',
        notes: '',
        paymentMethod: 'cash_on_delivery'
    });
    const toastTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const showToast = (message)=>{
        setToast(message);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(()=>setToast(null), 2200);
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StorefrontPageContent.useEffect": ()=>{
            return ({
                "StorefrontPageContent.useEffect": ()=>{
                    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                }
            })["StorefrontPageContent.useEffect"];
        }
    }["StorefrontPageContent.useEffect"], []);
    const loadStorefront = async (silent = false)=>{
        try {
            setError(null);
            const host = ("TURBOPACK compile-time truthy", 1) ? window.location.host : "TURBOPACK unreachable";
            let url;
            const headers = {};
            if (domainParam) {
                url = `${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/public/storefront/by-domain?domain=${encodeURIComponent(domainParam)}`;
            } else if (shopIdParam && /^\d+$/.test(String(shopIdParam))) {
                url = `${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/public/storefront/preview/${encodeURIComponent(String(shopIdParam))}-shop`;
            } else if (previewSlug) {
                url = `${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/public/storefront/preview/${encodeURIComponent(previewSlug)}`;
            } else {
                url = `${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/public/storefront`;
                headers['x-shop-domain'] = host;
            }
            const response = await fetch(url, {
                headers
            });
            const raw = await response.text();
            let payload = null;
            try {
                payload = raw ? JSON.parse(raw) : {};
            } catch  {
                payload = null;
            }
            if (!response.ok) {
                throw new Error(payload?.error || 'Storefront not available');
            }
            if (!payload || typeof payload !== 'object') {
                throw new Error('Invalid storefront response');
            }
            setData(payload);
            setLastUpdatedAt(Date.now());
        } catch (e) {
            setData(null);
            setError(e?.message || 'Storefront not available');
        } finally{
            setLoading(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StorefrontPageContent.useEffect": ()=>{
            void loadStorefront(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["StorefrontPageContent.useEffect"], [
        previewSlug,
        domainParam,
        shopIdParam
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StorefrontPageContent.useEffect": ()=>{
            // Real-time sync (poll inventory directly, no sync jobs)
            let alive = true;
            const t = window.setInterval({
                "StorefrontPageContent.useEffect.t": ()=>{
                    if (!alive) return;
                    if (document.visibilityState !== 'visible') return;
                    void loadStorefront(true);
                }
            }["StorefrontPageContent.useEffect.t"], 8000);
            return ({
                "StorefrontPageContent.useEffect": ()=>{
                    alive = false;
                    window.clearInterval(t);
                }
            })["StorefrontPageContent.useEffect"];
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["StorefrontPageContent.useEffect"], [
        previewSlug,
        domainParam,
        shopIdParam
    ]);
    const shopName = data?.shop?.business_name || data?.shop?.name || 'Crown Store';
    const currency = data?.shop?.currency_symbol || (language === 'ar' ? 'ج.م' : 'EGP');
    const filteredProducts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StorefrontPageContent.useMemo[filteredProducts]": ()=>{
            const list = data?.products || [];
            const q = query.trim().toLowerCase();
            if (!q) return list;
            return list.filter({
                "StorefrontPageContent.useMemo[filteredProducts]": (p)=>{
                    const hay = [
                        p.name_en,
                        p.name_ar,
                        p.brand || '',
                        p.sku || '',
                        p.category_name_en || '',
                        p.category_name_ar || ''
                    ].join(' ').toLowerCase();
                    return hay.includes(q);
                }
            }["StorefrontPageContent.useMemo[filteredProducts]"]);
        }
    }["StorefrontPageContent.useMemo[filteredProducts]"], [
        data?.products,
        query
    ]);
    const cartItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StorefrontPageContent.useMemo[cartItems]": ()=>{
            const ids = Object.keys(cart).map({
                "StorefrontPageContent.useMemo[cartItems].ids": (k)=>Number(k)
            }["StorefrontPageContent.useMemo[cartItems].ids"]);
            return (data?.products || []).filter({
                "StorefrontPageContent.useMemo[cartItems]": (p)=>ids.includes(p.id)
            }["StorefrontPageContent.useMemo[cartItems]"]);
        }
    }["StorefrontPageContent.useMemo[cartItems]"], [
        cart,
        data?.products
    ]);
    const cartCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StorefrontPageContent.useMemo[cartCount]": ()=>Object.values(cart).reduce({
                "StorefrontPageContent.useMemo[cartCount]": (s, n)=>s + Number(n || 0)
            }["StorefrontPageContent.useMemo[cartCount]"], 0)
    }["StorefrontPageContent.useMemo[cartCount]"], [
        cart
    ]);
    const cartTotal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StorefrontPageContent.useMemo[cartTotal]": ()=>cartItems.reduce({
                "StorefrontPageContent.useMemo[cartTotal]": (sum, p)=>sum + Number(p.sell_price || 0) * (cart[p.id] || 0)
            }["StorefrontPageContent.useMemo[cartTotal]"], 0)
    }["StorefrontPageContent.useMemo[cartTotal]"], [
        cartItems,
        cart
    ]);
    const addToCart = (product)=>{
        const stock = Number(product.available_stock ?? product.stock_quantity ?? 0);
        if (stock <= 0) {
            showToast(language === 'ar' ? 'المنتج غير متوفر حالياً' : 'Out of stock');
            return;
        }
        setCart((prev)=>{
            const current = prev[product.id] || 0;
            const nextQty = Math.min(current + 1, stock);
            return {
                ...prev,
                [product.id]: nextQty
            };
        });
        showToast(language === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart');
    };
    const removeFromCart = (productId)=>{
        setCart((prev)=>{
            const next = {
                ...prev
            };
            delete next[productId];
            return next;
        });
    };
    const clearCart = ()=>setCart({});
    const lastUpdatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US') : '';
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[#06070b] text-white flex items-center justify-center relative overflow-hidden",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.14),transparent_55%)]"
                }, void 0, false, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 286,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative text-cyan-200 text-sm border border-cyan-500/30 bg-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]",
                    children: language === 'ar' ? 'جاري تحميل المتجر...' : 'Loading storefront...'
                }, void 0, false, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 287,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/storefront/page.tsx",
            lineNumber: 285,
            columnNumber: 7
        }, this);
    }
    if (!data) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[#06070b] text-white flex items-center justify-center relative overflow-hidden",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.14),transparent_55%)]"
                }, void 0, false, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 297,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative max-w-lg w-[92vw] border border-red-500/30 bg-red-500/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.12)]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-red-200 font-bold text-xl mb-2",
                            children: language === 'ar' ? 'المتجر غير متاح' : 'Storefront Not Available'
                        }, void 0, false, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 299,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-slate-300 text-sm",
                            children: error || (language === 'ar' ? 'حاول مرة تانية.' : 'Please try again.')
                        }, void 0, false, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 302,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 flex flex-wrap items-center gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>void loadStorefront(false),
                                    className: "px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-[0_0_18px_rgba(34,211,238,0.35)]",
                                    children: language === 'ar' ? 'إعادة المحاولة' : 'Retry'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 304,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>window.location.assign('/storefront?shopId=1'),
                                    className: "px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/10",
                                    children: language === 'ar' ? 'فتح متجر تجريبي' : 'Open demo store'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 310,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setLanguage(language === 'en' ? 'ar' : 'en'),
                                    className: "px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/10",
                                    children: language === 'en' ? 'AR' : 'EN'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 316,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 303,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 298,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/storefront/page.tsx",
            lineNumber: 296,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[#06070b] text-white",
        dir: language === 'ar' ? 'rtl' : 'ltr',
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.14),transparent_55%)]"
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 330,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 -z-10 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 331,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "fixed top-4 right-4 z-40 pointer-events-auto w-[calc(100vw-2rem)] max-w-[200px] sm:max-w-[220px]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-cyan-500/25 bg-black/40 backdrop-blur-md shadow-[0_0_28px_rgba(0,243,255,0.14)]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-10 w-10 rounded-xl border border-cyan-500/30 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-[0_0_18px_rgba(0,243,255,0.22)]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$NeonCrownIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NeonCrownIcon"], {
                                            size: 24
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 340,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 339,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[12px] font-black tracking-[0.28em] uppercase leading-none",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-fuchsia-200",
                                                    children: "CROWN"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 344,
                                                    columnNumber: 19
                                                }, this),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-100",
                                                    children: "SERVICES"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 344,
                                                    columnNumber: 67
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 343,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 342,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 338,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3 flex flex-col items-start gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LiveClock, {
                                        locale: language === 'ar' ? 'ar-EG' : 'en-US',
                                        size: "sm"
                                    }, void 0, false, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 351,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-black/35 backdrop-blur-md p-1 shadow-[0_0_18px_rgba(0,243,255,0.10)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>setLanguage('ar'),
                                                className: `px-3 py-1 rounded-full text-[11px] font-extrabold transition ${language === 'ar' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'}`,
                                                children: "AR"
                                            }, void 0, false, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 353,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>setLanguage('en'),
                                                className: `px-3 py-1 rounded-full text-[11px] font-extrabold transition ${language === 'en' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'}`,
                                                children: "EN"
                                            }, void 0, false, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 362,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 352,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 350,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/storefront/page.tsx",
                        lineNumber: 336,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 335,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 334,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "pt-28 md:pt-32 pr-44 sm:pr-52 md:pr-56",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "max-w-7xl mx-auto px-4 md:px-6 pb-8",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-6 md:p-10 shadow-[0_0_40px_rgba(34,211,238,0.12)]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute -top-32 -right-32 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl"
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 381,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 382,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap items-center justify-between gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "min-w-0",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "inline-flex items-center gap-2 text-xs text-cyan-200/80 border border-cyan-500/20 bg-black/20 px-3 py-1 rounded-full",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                                    className: "h-3.5 w-3.5"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/storefront/page.tsx",
                                                                    lineNumber: 388,
                                                                    columnNumber: 19
                                                                }, this),
                                                                language === 'ar' ? `متجر ${shopName} — متزامن مع المخزن` : `${shopName} Store — Live Inventory Sync`
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 387,
                                                            columnNumber: 17
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                            className: "mt-4 text-3xl md:text-5xl font-black tracking-tight",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-purple-200",
                                                                children: shopName
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 392,
                                                                columnNumber: 19
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 391,
                                                            columnNumber: 17
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mt-3 text-sm md:text-base text-slate-300 max-w-2xl",
                                                            children: getTagline(data?.shop?.activity_type, language)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 396,
                                                            columnNumber: 17
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 386,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "inline-flex items-center gap-2 text-xs text-slate-200/80 border border-cyan-500/20 bg-black/20 px-3 py-1 rounded-full",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                                                    className: "h-4 w-4 text-cyan-200"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/storefront/page.tsx",
                                                                    lineNumber: 403,
                                                                    columnNumber: 19
                                                                }, this),
                                                                language === 'ar' ? 'عزل بيانات لكل متجر' : 'Strict tenant isolation'
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 402,
                                                            columnNumber: 17
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "hidden md:inline-flex items-center gap-2 text-xs text-slate-200/80 border border-cyan-500/20 bg-black/20 px-3 py-1 rounded-full",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "inline-block h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/storefront/page.tsx",
                                                                    lineNumber: 407,
                                                                    columnNumber: 19
                                                                }, this),
                                                                language === 'ar' ? `آخر تحديث: ${lastUpdatedLabel}` : `Updated: ${lastUpdatedLabel}`
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 406,
                                                            columnNumber: 17
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 401,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 385,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-6 md:mt-8 flex flex-col md:flex-row gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex-1 relative",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                            className: "absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-cyan-200/70"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 416,
                                                            columnNumber: 17
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            value: query,
                                                            onChange: (e)=>setQuery(e.target.value),
                                                            placeholder: language === 'ar' ? 'ابحث باسم القطعة / الماركة / SKU...' : 'Search by part name / brand / SKU...',
                                                            className: "w-full h-12 pl-10 pr-4 rounded-2xl border border-cyan-500/25 bg-black/30 backdrop-blur-xl text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/storefront/page.tsx",
                                                            lineNumber: 417,
                                                            columnNumber: 17
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 415,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>{
                                                        setQuery('');
                                                        showToast(language === 'ar' ? 'تم مسح البحث' : 'Search cleared');
                                                    },
                                                    className: "h-12 px-5 rounded-2xl border border-purple-500/30 bg-white/5 hover:bg-white/10 text-purple-100 text-sm font-semibold",
                                                    children: language === 'ar' ? 'مسح' : 'Clear'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 414,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 384,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 380,
                            columnNumber: 9
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/storefront/page.tsx",
                        lineNumber: 379,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "max-w-7xl mx-auto px-4 md:px-6 pb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between gap-4 mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs text-slate-400",
                                                children: language === 'ar' ? 'الكتالوج' : 'Catalog'
                                            }, void 0, false, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 442,
                                                columnNumber: 13
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xl md:text-2xl font-extrabold text-cyan-100",
                                                children: language === 'ar' ? 'قطع الغيار' : 'Spare Parts'
                                            }, void 0, false, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 443,
                                                columnNumber: 13
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 441,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-xs text-slate-300 border border-cyan-500/20 bg-white/5 backdrop-blur-xl rounded-full px-3 py-1",
                                        children: language === 'ar' ? `${filteredProducts.length} منتج` : `${filteredProducts.length} items`
                                    }, void 0, false, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 447,
                                        columnNumber: 11
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 440,
                                columnNumber: 9
                            }, this),
                            filteredProducts.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-2xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-8 text-slate-300 text-sm",
                                children: language === 'ar' ? 'مفيش نتائج مطابقة للبحث.' : 'No products match your search.'
                            }, void 0, false, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 453,
                                columnNumber: 11
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6",
                                children: filteredProducts.map((product)=>{
                                    const stock = Number(product.available_stock ?? product.stock_quantity ?? 0);
                                    const inStock = stock > 0;
                                    const qtyInCart = cart[product.id] || 0;
                                    const name = language === 'ar' ? product.name_ar : product.name_en;
                                    const category = language === 'ar' ? product.category_name_ar : product.category_name_en;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "group relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-white/5 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.06)] hover:border-cyan-400/35 transition",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.16),transparent_45%)]"
                                            }, void 0, false, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 470,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative h-40 sm:h-44 bg-black/30 border-b border-cyan-500/10 flex items-center justify-center overflow-hidden",
                                                children: [
                                                    product.image_url && String(product.image_url).trim().length > 3 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: product.image_url,
                                                        alt: language === 'ar' ? product.name_ar : product.name_en,
                                                        className: "w-full h-full object-contain",
                                                        onError: (e)=>{
                                                            const el = e.target;
                                                            el.style.display = 'none';
                                                            el.nextElementSibling?.classList.remove('hidden');
                                                        }
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/storefront/page.tsx",
                                                        lineNumber: 475,
                                                        columnNumber: 23
                                                    }, this) : null,
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `flex flex-col items-center justify-center gap-1 text-slate-500 ${product.image_url && String(product.image_url).trim().length > 3 ? 'hidden' : ''}`,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                                                className: "h-12 w-12 text-cyan-500/40"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 489,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-xs",
                                                                children: language === 'ar' ? 'لا توجد صورة' : 'No image'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 490,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/storefront/page.tsx",
                                                        lineNumber: 486,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 473,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative p-5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-start justify-between gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "min-w-0",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] tracking-widest uppercase text-purple-200/80",
                                                                        children: category || (language === 'ar' ? 'قطع غيار' : 'Spare Part')
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/storefront/page.tsx",
                                                                        lineNumber: 497,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-1 font-extrabold text-white truncate",
                                                                        children: name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/storefront/page.tsx",
                                                                        lineNumber: 500,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-1 text-xs text-slate-300 truncate",
                                                                        children: product.brand || '—'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/storefront/page.tsx",
                                                                        lineNumber: 501,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    product.sku ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "mt-2 text-[11px] text-slate-400",
                                                                        children: [
                                                                            "SKU: ",
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-slate-200",
                                                                                children: product.sku
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                                lineNumber: 504,
                                                                                columnNumber: 34
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/storefront/page.tsx",
                                                                        lineNumber: 503,
                                                                        columnNumber: 27
                                                                    }, this) : null
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 496,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-col items-end gap-2 shrink-0",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-lg font-black text-cyan-200",
                                                                        children: [
                                                                            Number(product.sell_price || 0).toFixed(2),
                                                                            ' ',
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-xs text-cyan-200/80",
                                                                                children: currency
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                                lineNumber: 512,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/storefront/page.tsx",
                                                                        lineNumber: 510,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: `text-[10px] px-2 py-1 rounded-full border ${inStock ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`,
                                                                        children: inStock ? language === 'ar' ? `متوفر (${stock})` : `In stock (${stock})` : language === 'ar' ? 'غير متوفر' : 'Out of stock'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/storefront/page.tsx",
                                                                        lineNumber: 514,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 509,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/storefront/page.tsx",
                                                        lineNumber: 495,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-5 flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>addToCart(product),
                                                                disabled: !inStock,
                                                                className: "flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(236,72,153,0.2)] disabled:opacity-40 disabled:cursor-not-allowed",
                                                                children: language === 'ar' ? 'اشتري دلوقتي' : 'Buy Now'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 533,
                                                                columnNumber: 23
                                                            }, this),
                                                            qtyInCart > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>removeFromCart(product.id),
                                                                className: "h-11 px-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-red-100 text-xs font-semibold",
                                                                title: language === 'ar' ? 'إزالة من السلة' : 'Remove from cart',
                                                                children: language === 'ar' ? 'إزالة' : 'Remove'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 542,
                                                                columnNumber: 25
                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>addToCart(product),
                                                                disabled: !inStock,
                                                                className: "h-11 px-3 rounded-xl border border-cyan-500/25 bg-white/5 hover:bg-white/10 text-cyan-100 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed",
                                                                title: language === 'ar' ? 'إضافة للسلة' : 'Add to cart',
                                                                children: [
                                                                    "+",
                                                                    language === 'ar' ? 'سلة' : 'Cart'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/storefront/page.tsx",
                                                                lineNumber: 550,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/storefront/page.tsx",
                                                        lineNumber: 532,
                                                        columnNumber: 21
                                                    }, this),
                                                    qtyInCart > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-3 text-[11px] text-slate-300",
                                                        children: language === 'ar' ? `في السلة: ${qtyInCart}` : `In cart: ${qtyInCart}`
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/storefront/page.tsx",
                                                        lineNumber: 562,
                                                        columnNumber: 23
                                                    }, this) : null
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/storefront/page.tsx",
                                                lineNumber: 494,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, product.id, true, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 466,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/app/storefront/page.tsx",
                                lineNumber: 457,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/storefront/page.tsx",
                        lineNumber: 439,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 377,
                columnNumber: 7
            }, this),
            cartCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-2xl border border-cyan-500/25 bg-black/35 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.18)] overflow-hidden",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-5 py-4 border-b border-cyan-500/15 flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "font-extrabold text-cyan-100 flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"], {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 581,
                                            columnNumber: 17
                                        }, this),
                                        language === 'ar' ? 'السلة' : 'Cart',
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-cyan-200/80",
                                            children: [
                                                "(",
                                                cartCount,
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 582,
                                            columnNumber: 56
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 580,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: clearCart,
                                    className: "text-xs text-red-200 border border-red-500/25 bg-red-500/10 px-3 py-1 rounded-full hover:bg-red-500/15",
                                    children: language === 'ar' ? 'مسح' : 'Clear'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 584,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 579,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-h-64 overflow-y-auto px-5 py-4 space-y-2",
                            children: cartItems.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "truncate text-slate-100 font-semibold",
                                                    children: language === 'ar' ? p.name_ar : p.name_en
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 595,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[11px] text-slate-400",
                                                    children: [
                                                        language === 'ar' ? 'الكمية' : 'Qty',
                                                        ": ",
                                                        cart[p.id] || 0
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 598,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 594,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-cyan-200 font-bold",
                                            children: [
                                                (Number(p.sell_price || 0) * (cart[p.id] || 0)).toFixed(2),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs",
                                                    children: currency
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 603,
                                                    columnNumber: 82
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 602,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, p.id, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 593,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 591,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-5 py-4 border-t border-cyan-500/15 flex flex-col gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-sm text-slate-300",
                                            children: language === 'ar' ? 'الإجمالي' : 'Total'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 610,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-xl font-black text-cyan-100",
                                            children: [
                                                cartTotal.toFixed(2),
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs text-cyan-200/80",
                                                    children: currency
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 612,
                                                    columnNumber: 42
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 611,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 609,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setCheckoutOpen(true),
                                    className: "w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(236,72,153,0.2)]",
                                    children: language === 'ar' ? 'اطلب الآن' : 'Order Now'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 615,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 608,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 578,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 577,
                columnNumber: 9
            }, this),
            checkoutOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/25 bg-[#0a0f18] shadow-[0_0_40px_rgba(34,211,238,0.15)]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-[#0a0f18]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-lg font-bold text-cyan-100",
                                    children: language === 'ar' ? 'بيانات الطلب' : 'Order Details'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 631,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setCheckoutOpen(false),
                                    className: "p-2 rounded-lg border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "h-5 w-5"
                                    }, void 0, false, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 638,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 634,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 630,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: async (e)=>{
                                e.preventDefault();
                                if (!data?.shop?.id) return;
                                setCheckoutSubmitting(true);
                                try {
                                    const payload = {
                                        shopId: data.shop.id,
                                        customerName: checkoutForm.customerName.trim(),
                                        phone: checkoutForm.phone.trim(),
                                        governorate: checkoutForm.governorate.trim(),
                                        city: checkoutForm.city.trim(),
                                        address: checkoutForm.address.trim(),
                                        notes: checkoutForm.notes.trim() || undefined,
                                        paymentMethod: checkoutForm.paymentMethod,
                                        items: cartItems.map((p)=>({
                                                productId: p.id,
                                                id: p.id,
                                                nameSnapshot: language === 'ar' ? p.name_ar : p.name_en,
                                                quantity: cart[p.id] || 1
                                            }))
                                    };
                                    const res = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$api$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE_URL"]}/storefront/orders`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(payload)
                                    });
                                    const json = await res.json();
                                    if (!res.ok) throw new Error(json?.ar || json?.error || 'Failed');
                                    setCheckoutOpen(false);
                                    setCart({});
                                    setCheckoutForm({
                                        customerName: '',
                                        phone: '',
                                        governorate: '',
                                        city: '',
                                        address: '',
                                        notes: '',
                                        paymentMethod: 'cash_on_delivery'
                                    });
                                    setOrderSuccess({
                                        orderId: json.orderId,
                                        publicCode: json.publicCode || json.public_code || '',
                                        phone: checkoutForm.phone.trim()
                                    });
                                } catch (err) {
                                    showToast(err?.message || (language === 'ar' ? 'حدث خطأ' : 'Something went wrong'));
                                } finally{
                                    setCheckoutSubmitting(false);
                                }
                            },
                            className: "p-5 space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'الاسم *' : 'Name *'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 687,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            required: true,
                                            value: checkoutForm.customerName,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        customerName: e.target.value
                                                    })),
                                            className: "w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 690,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 686,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'رقم الهاتف *' : 'Phone *'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 698,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            required: true,
                                            type: "tel",
                                            pattern: "[\\d\\s\\+\\-\\(\\)]{8,20}",
                                            value: checkoutForm.phone,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        phone: e.target.value
                                                    })),
                                            className: "w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100",
                                            placeholder: language === 'ar' ? 'مثال: 01012345678' : 'e.g. 01012345678'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 701,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 697,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'المحافظة *' : 'Governorate *'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 712,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            required: true,
                                            value: checkoutForm.governorate,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        governorate: e.target.value
                                                    })),
                                            className: "w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 715,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 711,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'المدينة/المنطقة *' : 'City/Area *'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 723,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            required: true,
                                            value: checkoutForm.city,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        city: e.target.value
                                                    })),
                                            className: "w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 726,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 722,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'العنوان بالتفصيل *' : 'Address *'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 734,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            required: true,
                                            rows: 3,
                                            value: checkoutForm.address,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        address: e.target.value
                                                    })),
                                            className: "w-full rounded-xl border border-cyan-500/25 bg-black/30 px-3 py-2 text-slate-100"
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 737,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 733,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'ملاحظات' : 'Notes'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 746,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                            rows: 2,
                                            value: checkoutForm.notes,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        notes: e.target.value
                                                    })),
                                            className: "w-full rounded-xl border border-cyan-500/25 bg-black/30 px-3 py-2 text-slate-100"
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 749,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 745,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-xs text-cyan-200/80 mb-1",
                                            children: language === 'ar' ? 'طريقة الدفع' : 'Payment'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 757,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: checkoutForm.paymentMethod,
                                            onChange: (e)=>setCheckoutForm((f)=>({
                                                        ...f,
                                                        paymentMethod: e.target.value
                                                    })),
                                            className: "w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "cash_on_delivery",
                                                    children: language === 'ar' ? 'عند الاستلام' : 'Cash on delivery'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 765,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "transfer",
                                                    children: language === 'ar' ? 'تحويل بنكي' : 'Bank transfer'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 768,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "other",
                                                    children: language === 'ar' ? 'أخرى' : 'Other'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/storefront/page.tsx",
                                                    lineNumber: 769,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 760,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 756,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-3 pt-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setCheckoutOpen(false),
                                            className: "flex-1 h-12 rounded-xl border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10",
                                            children: language === 'ar' ? 'إلغاء' : 'Cancel'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 773,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: checkoutSubmitting,
                                            className: "flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold disabled:opacity-60",
                                            children: checkoutSubmitting ? language === 'ar' ? 'جاري الإرسال...' : 'Submitting...' : language === 'ar' ? 'تأكيد الطلب' : 'Confirm Order'
                                        }, void 0, false, {
                                            fileName: "[project]/app/storefront/page.tsx",
                                            lineNumber: 780,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 772,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 641,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 629,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 628,
                columnNumber: 9
            }, this),
            orderSuccess && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative w-full max-w-md rounded-2xl border border-green-500/30 bg-[#0a0f18] p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "inline-flex h-16 w-16 rounded-full bg-green-500/20 items-center justify-center mb-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"], {
                                        className: "h-8 w-8 text-green-300"
                                    }, void 0, false, {
                                        fileName: "[project]/app/storefront/page.tsx",
                                        lineNumber: 805,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 804,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-xl font-bold text-green-200 mb-2",
                                    children: language === 'ar' ? 'تم إنشاء طلبك بنجاح' : 'Your order was created successfully'
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 807,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-slate-300 text-sm mb-2",
                                    children: language === 'ar' ? `رقم الطلب: #${orderSuccess.orderId}` : `Order #: ${orderSuccess.orderId}`
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 810,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-cyan-200 font-mono font-bold text-lg",
                                    children: language === 'ar' ? `كود التتبع: ${orderSuccess.publicCode}` : `Tracking code: ${orderSuccess.publicCode}`
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 813,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 803,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: `/track?code=${encodeURIComponent(orderSuccess.publicCode)}&phone=${encodeURIComponent(orderSuccess.phone)}`,
                            className: "w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold mb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                    className: "h-4 w-4"
                                }, void 0, false, {
                                    fileName: "[project]/app/storefront/page.tsx",
                                    lineNumber: 821,
                                    columnNumber: 15
                                }, this),
                                language === 'ar' ? 'تتبع الطلب' : 'Track Order'
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 817,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setOrderSuccess(null),
                            className: "w-full h-11 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm font-semibold",
                            children: language === 'ar' ? 'إغلاق' : 'Close'
                        }, void 0, false, {
                            fileName: "[project]/app/storefront/page.tsx",
                            lineNumber: 824,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 802,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 801,
                columnNumber: 9
            }, this),
            toast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-6 left-6 z-50",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-4 py-3 rounded-2xl border border-cyan-500/25 bg-black/35 backdrop-blur-xl text-cyan-100 text-sm shadow-[0_0_18px_rgba(34,211,238,0.18)]",
                    children: toast
                }, void 0, false, {
                    fileName: "[project]/app/storefront/page.tsx",
                    lineNumber: 837,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/storefront/page.tsx",
                lineNumber: 836,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/storefront/page.tsx",
        lineNumber: 329,
        columnNumber: 5
    }, this);
}
_s1(StorefrontPageContent, "Drg7ETRnGZoQskQMQSjB508lm34=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c1 = StorefrontPageContent;
function StorefrontPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center text-gray-400",
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/app/storefront/page.tsx",
            lineNumber: 848,
            columnNumber: 25
        }, void 0),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StorefrontPageContent, {}, void 0, false, {
            fileName: "[project]/app/storefront/page.tsx",
            lineNumber: 849,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/storefront/page.tsx",
        lineNumber: 848,
        columnNumber: 5
    }, this);
}
_c2 = StorefrontPage;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "LiveClock");
__turbopack_context__.k.register(_c1, "StorefrontPageContent");
__turbopack_context__.k.register(_c2, "StorefrontPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app_3515b3b7._.js.map