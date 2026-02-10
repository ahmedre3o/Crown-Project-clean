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
"[project]/app/components/NotificationsBell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NotificationsBell",
    ()=>NotificationsBell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function NotificationsBell() {
    _s();
    const { language } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [unreadCount, setUnreadCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [notifications, setNotifications] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loadError, setLoadError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const prevCountRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationsBell.useEffect": ()=>{
            let alive = true;
            const poll = {
                "NotificationsBell.useEffect.poll": async ()=>{
                    if (!alive) return;
                    try {
                        const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/notifications/unread-count');
                        const n = Number(res?.count ?? 0) || 0;
                        if (n > prevCountRef.current && prevCountRef.current > 0) {
                            setToast({
                                msg: language === 'ar' ? 'نشاط جديد!' : 'New activity!'
                            });
                            setTimeout({
                                "NotificationsBell.useEffect.poll": ()=>setToast(null)
                            }["NotificationsBell.useEffect.poll"], 4000);
                        }
                        prevCountRef.current = n;
                        setUnreadCount(n);
                    } catch  {
                    // ignore
                    }
                }
            }["NotificationsBell.useEffect.poll"];
            void poll();
            const t = setInterval(poll, 10000);
            return ({
                "NotificationsBell.useEffect": ()=>{
                    alive = false;
                    clearInterval(t);
                }
            })["NotificationsBell.useEffect"];
        }
    }["NotificationsBell.useEffect"], [
        language
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NotificationsBell.useEffect": ()=>{
            if (open) {
                setLoadError(false);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/notifications?limit=10').then({
                    "NotificationsBell.useEffect": (res)=>{
                        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
                        setNotifications(items);
                        if (res?.ok === false) setLoadError(true);
                    }
                }["NotificationsBell.useEffect"]).catch({
                    "NotificationsBell.useEffect": ()=>{
                        setNotifications([]);
                        setLoadError(true);
                    }
                }["NotificationsBell.useEffect"]);
            }
        }
    }["NotificationsBell.useEffect"], [
        open
    ]);
    const markRead = async (id, navTo)=>{
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/notifications/${id}/read`, {
                method: 'PATCH'
            });
            setNotifications((prev)=>prev.map((n)=>n.id === id ? {
                        ...n,
                        is_read: 1
                    } : n));
            setUnreadCount((c)=>Math.max(0, c - 1));
            prevCountRef.current = Math.max(0, prevCountRef.current - 1);
            if (navTo) {
                router.push(navTo);
                setOpen(false);
            }
        } catch  {
        // ignore
        }
    };
    const title = (n)=>(language === 'ar' ? n.title_ar || n.title_en : n.title_en || n.title_ar) || '';
    const body = (n)=>(language === 'ar' ? n.body_ar || n.body_en : n.body_en || n.body_ar) || '';
    const meta = (n)=>{
        const m = n.meta;
        if (typeof m === 'object' && m) {
            return {
                orderId: m.orderId != null ? Number(m.orderId) : undefined,
                invoiceId: m.invoiceId != null ? Number(m.invoiceId) : m.saleId != null ? Number(m.saleId) : undefined
            };
        }
        if (typeof m === 'string') try {
            const p = JSON.parse(m);
            return {
                orderId: p?.orderId,
                invoiceId: p?.invoiceId ?? p?.saleId
            };
        } catch  {
            return {};
        }
        return {};
    };
    const getNavLink = (n)=>{
        const { orderId, invoiceId } = meta(n);
        if (orderId) return `/store-admin/orders?focus=${orderId}`;
        if (invoiceId) return `/invoices?focus=${invoiceId}&source=${n.source === 'online' ? 'online' : 'pos'}`;
        return null;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setOpen((o)=>!o),
                        className: "relative p-2 rounded-xl border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 transition",
                        "aria-label": language === 'ar' ? 'الإشعارات' : 'Notifications',
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                className: "h-5 w-5"
                            }, void 0, false, {
                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                lineNumber: 118,
                                columnNumber: 11
                            }, this),
                            unreadCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1",
                                children: unreadCount > 99 ? '99+' : unreadCount
                            }, void 0, false, {
                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                lineNumber: 120,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/components/NotificationsBell.tsx",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this),
                    open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "fixed inset-0 z-40",
                                onClick: ()=>setOpen(false),
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                lineNumber: 127,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute top-full mt-2 right-0 z-50 w-80 max-h-80 overflow-y-auto rounded-xl border border-cyan-500/25 bg-[#0a0f18] shadow-[0_0_24px_rgba(34,211,238,0.2)]",
                                dir: language === 'ar' ? 'rtl' : 'ltr',
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "px-4 py-3 border-b border-cyan-500/15 text-sm font-bold text-cyan-100",
                                        children: language === 'ar' ? 'الإشعارات' : 'Notifications'
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/NotificationsBell.tsx",
                                        lineNumber: 136,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "max-h-64 overflow-y-auto",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/store-admin/notifications",
                                                onClick: ()=>setOpen(false),
                                                className: "block px-4 py-2 text-xs text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/5 border-b border-cyan-500/10",
                                                children: language === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                                lineNumber: 140,
                                                columnNumber: 17
                                            }, this),
                                            loadError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "px-4 py-6 text-amber-300 text-sm text-center",
                                                children: language === 'ar' ? 'فشل تحميل الإشعارات' : 'Failed to load notifications'
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                                lineNumber: 148,
                                                columnNumber: 19
                                            }, this) : notifications.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "px-4 py-6 text-slate-400 text-sm text-center",
                                                children: language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                                lineNumber: 152,
                                                columnNumber: 19
                                            }, this) : notifications.map((n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `w-full text-start px-4 py-3 border-b border-cyan-500/10 hover:bg-cyan-500/5 transition ${n.is_read ? 'text-slate-400' : 'text-slate-100 bg-cyan-500/5'}`,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>markRead(n.id, getNavLink(n) || undefined),
                                                            className: "w-full text-start",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-sm font-semibold",
                                                                    children: title(n)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/components/NotificationsBell.tsx",
                                                                    lineNumber: 167,
                                                                    columnNumber: 25
                                                                }, this),
                                                                body(n) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-slate-500 mt-1",
                                                                    children: body(n)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/components/NotificationsBell.tsx",
                                                                    lineNumber: 168,
                                                                    columnNumber: 36
                                                                }, this) : null,
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-slate-500 mt-1",
                                                                    children: new Date(n.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/components/NotificationsBell.tsx",
                                                                    lineNumber: 169,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/components/NotificationsBell.tsx",
                                                            lineNumber: 163,
                                                            columnNumber: 23
                                                        }, this),
                                                        getNavLink(n) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                            href: getNavLink(n),
                                                            onClick: ()=>{
                                                                setOpen(false);
                                                            },
                                                            className: "mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200 underline",
                                                            children: meta(n).orderId ? language === 'ar' ? 'عرض الطلب' : 'View order' : language === 'ar' ? 'عرض الفاتورة' : 'View invoice'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/components/NotificationsBell.tsx",
                                                            lineNumber: 174,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, n.id, true, {
                                                    fileName: "[project]/app/components/NotificationsBell.tsx",
                                                    lineNumber: 157,
                                                    columnNumber: 21
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/components/NotificationsBell.tsx",
                                        lineNumber: 139,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/components/NotificationsBell.tsx",
                                lineNumber: 132,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/NotificationsBell.tsx",
                lineNumber: 112,
                columnNumber: 7
            }, this),
            toast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan-500/25 bg-black/90 backdrop-blur text-cyan-100 text-sm shadow-[0_0_24px_rgba(34,211,238,0.25)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: toast.msg
                    }, void 0, false, {
                        fileName: "[project]/app/components/NotificationsBell.tsx",
                        lineNumber: 194,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>{
                            router.push('/store-admin/notifications');
                            setToast(null);
                        },
                        className: "px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs",
                        children: language === 'ar' ? 'فتح' : 'Open'
                    }, void 0, false, {
                        fileName: "[project]/app/components/NotificationsBell.tsx",
                        lineNumber: 195,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/NotificationsBell.tsx",
                lineNumber: 193,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true);
}
_s(NotificationsBell, "c+NcAhvPgN1WIaRhzGsohF18zvw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = NotificationsBell;
var _c;
__turbopack_context__.k.register(_c, "NotificationsBell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/ShopSwitcher.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ShopSwitcher",
    ()=>ShopSwitcher,
    "getActiveShopId",
    ()=>getActiveShopId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$bag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingBag$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shopping-bag.js [app-client] (ecmascript) <export default as ShoppingBag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const STORAGE_KEY = 'crown-active-shop-id';
function ShopSwitcher() {
    _s();
    const { language } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const [shops, setShops] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [activeShopId, setActiveShopId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ShopSwitcher.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            setActiveShopId(localStorage.getItem(STORAGE_KEY));
            const handler = {
                "ShopSwitcher.useEffect.handler": ()=>setActiveShopId(localStorage.getItem(STORAGE_KEY))
            }["ShopSwitcher.useEffect.handler"];
            window.addEventListener('crown-shop-changed', handler);
            return ({
                "ShopSwitcher.useEffect": ()=>window.removeEventListener('crown-shop-changed', handler)
            })["ShopSwitcher.useEffect"];
        }
    }["ShopSwitcher.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ShopSwitcher.useEffect": ()=>{
            let cancelled = false;
            ({
                "ShopSwitcher.useEffect": async ()=>{
                    try {
                        const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/admin/shops');
                        if (!cancelled && Array.isArray(data)) setShops(data);
                    } catch  {
                        if (!cancelled) setShops([]);
                    } finally{
                        if (!cancelled) setLoading(false);
                    }
                }
            })["ShopSwitcher.useEffect"]();
            return ({
                "ShopSwitcher.useEffect": ()=>{
                    cancelled = true;
                }
            })["ShopSwitcher.useEffect"];
        }
    }["ShopSwitcher.useEffect"], []);
    const selectShop = (id)=>{
        const idStr = String(id);
        setActiveShopId(idStr);
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.setItem(STORAGE_KEY, idStr);
        }
        setOpen(false);
        window.dispatchEvent(new Event('crown-shop-changed'));
    };
    const clearShop = ()=>{
        setActiveShopId(null);
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.removeItem(STORAGE_KEY);
        }
        setOpen(false);
        window.dispatchEvent(new Event('crown-shop-changed'));
    };
    const displayName = (s)=>s.business_name || s.name || s.domain || `#${s.id}`;
    const activeShop = shops.find((s)=>String(s.id) === activeShopId);
    if (loading || shops.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>setOpen((v)=>!v),
                className: "inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-black/25 px-3 py-1.5 text-[11px] text-cyan-200 shadow-[0_0_14px_rgba(0,243,255,0.10)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$bag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingBag$3e$__["ShoppingBag"], {
                        className: "h-3.5 w-3.5"
                    }, void 0, false, {
                        fileName: "[project]/app/components/ShopSwitcher.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "max-w-[120px] truncate",
                        children: activeShop ? displayName(activeShop) : language === 'ar' ? 'اختر المتجر' : 'Select shop'
                    }, void 0, false, {
                        fileName: "[project]/app/components/ShopSwitcher.tsx",
                        lineNumber: 81,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                        className: "h-3 w-3"
                    }, void 0, false, {
                        fileName: "[project]/app/components/ShopSwitcher.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/ShopSwitcher.tsx",
                lineNumber: 75,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "fixed inset-0 z-10",
                        onClick: ()=>setOpen(false)
                    }, void 0, false, {
                        fileName: "[project]/app/components/ShopSwitcher.tsx",
                        lineNumber: 92,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-full left-0 mt-1 z-20 min-w-[180px] max-h-[220px] overflow-y-auto rounded-lg border border-cyan-500/30 bg-[#0b1220] py-1 shadow-xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: clearShop,
                                className: `w-full text-left px-3 py-2 text-xs ${!activeShopId ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`,
                                children: language === 'ar' ? '— بدون متجر —' : '— No shop —'
                            }, void 0, false, {
                                fileName: "[project]/app/components/ShopSwitcher.tsx",
                                lineNumber: 94,
                                columnNumber: 13
                            }, this),
                            shops.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>selectShop(s.id),
                                    className: `w-full text-left px-3 py-2 text-xs ${activeShopId === String(s.id) ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`,
                                    children: displayName(s)
                                }, s.id, false, {
                                    fileName: "[project]/app/components/ShopSwitcher.tsx",
                                    lineNumber: 102,
                                    columnNumber: 15
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/components/ShopSwitcher.tsx",
                        lineNumber: 93,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/app/components/ShopSwitcher.tsx",
        lineNumber: 74,
        columnNumber: 5
    }, this);
}
_s(ShopSwitcher, "+PqPyQo9JVTyPGFqHWzbd5z4lF4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"]
    ];
});
_c = ShopSwitcher;
function getActiveShopId() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem(STORAGE_KEY);
}
var _c;
__turbopack_context__.k.register(_c, "ShopSwitcher");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/shared/plans.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Single source of truth for Crown ERP plans.
 * Used by: Admin, Settings, Login, backend API, AI knowledge.
 * All pricing, limits, and features must match exactly.
 */ __turbopack_context__.s([
    "PLANS",
    ()=>PLANS,
    "getPlanById",
    ()=>getPlanById,
    "getPlanCurrency",
    ()=>getPlanCurrency,
    "getPlanCurrencySymbol",
    ()=>getPlanCurrencySymbol,
    "getPlanFeaturesForBackend",
    ()=>getPlanFeaturesForBackend,
    "getPlanFeaturesForFrontend",
    ()=>getPlanFeaturesForFrontend,
    "getPlanPricing",
    ()=>getPlanPricing,
    "getPlanPricingByLanguage",
    ()=>getPlanPricingByLanguage
]);
const PLANS = [
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
            branches: false
        },
        pricing: {
            ar: {
                monthly: 199,
                quarterly: 540,
                yearly: 1900
            },
            en: {
                monthly: 5,
                yearly: 50
            }
        },
        pricingEGP: {
            monthly: 199,
            quarterly: 540,
            yearly: 1900
        },
        pricingUSD: {
            monthly: 5,
            yearly: 50
        },
        displayFeatures: [
            {
                key: 'pos',
                ar: 'نقطة البيع',
                en: 'POS',
                included: true
            },
            {
                key: 'manual',
                ar: 'إدخال يدوي',
                en: 'Manual Entry',
                included: true
            },
            {
                key: 'inventory',
                ar: 'مخزون أساسي',
                en: 'Inventory basic',
                included: true
            },
            {
                key: 'online',
                ar: 'متجر أونلاين',
                en: 'Online Store',
                included: false
            },
            {
                key: 'ai',
                ar: 'مساعد ذكاء اصطناعي',
                en: 'AI Assistant',
                included: false
            },
            {
                key: 'reports',
                ar: 'تقارير PDF/Excel',
                en: 'Reports PDF/Excel',
                included: false
            }
        ],
        rolesAr: 'مالك + 1',
        rolesEn: 'Owner + 1'
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
            branches: false
        },
        pricing: {
            ar: {
                monthly: 349,
                quarterly: 945,
                yearly: 3350
            },
            en: {
                monthly: 9,
                yearly: 90
            }
        },
        pricingEGP: {
            monthly: 349,
            quarterly: 945,
            yearly: 3350
        },
        pricingUSD: {
            monthly: 9,
            yearly: 90
        },
        displayFeatures: [
            {
                key: 'pos',
                ar: 'نقطة البيع',
                en: 'POS',
                included: true
            },
            {
                key: 'manual',
                ar: 'إدخال يدوي',
                en: 'Manual Entry',
                included: true
            },
            {
                key: 'inventory',
                ar: 'مخزون',
                en: 'Inventory',
                included: true
            },
            {
                key: 'excel',
                ar: 'استيراد CSV / Excel',
                en: 'CSV / Excel import',
                included: true
            },
            {
                key: 'ai',
                ar: 'مساعد ذكاء اصطناعي',
                en: 'AI Assistant',
                included: false
            },
            {
                key: 'online',
                ar: 'متجر أونلاين',
                en: 'Online Store',
                included: false
            }
        ],
        rolesAr: 'مالك + 4',
        rolesEn: 'Owner + 4'
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
            branches: false
        },
        pricing: {
            ar: {
                monthly: 699,
                quarterly: 1890,
                yearly: 6700
            },
            en: {
                monthly: 19,
                yearly: 190
            }
        },
        pricingEGP: {
            monthly: 699,
            quarterly: 1890,
            yearly: 6700
        },
        pricingUSD: {
            monthly: 19,
            yearly: 190
        },
        displayFeatures: [
            {
                key: 'pos',
                ar: 'نقطة البيع',
                en: 'POS',
                included: true
            },
            {
                key: 'inventory',
                ar: 'مخزون',
                en: 'Inventory',
                included: true
            },
            {
                key: 'reports',
                ar: 'تقارير PDF / Excel / CSV',
                en: 'Reports PDF/Excel/CSV',
                included: true
            },
            {
                key: 'ai',
                ar: 'مساعد ذكاء اصطناعي',
                en: 'AI Assistant',
                included: true
            },
            {
                key: 'online',
                ar: 'متجر أونلاين',
                en: 'Online Store',
                included: true
            },
            {
                key: 'notifications',
                ar: 'إشعارات',
                en: 'Notifications',
                included: true
            }
        ],
        rolesAr: 'مالك + 9',
        rolesEn: 'Owner + 9',
        highlight: true
    },
    {
        id: 'branches',
        nameAr: 'فروع',
        nameEn: 'Branches',
        totalUsers: 30,
        additionalUsersLimit: 29,
        features: {
            pos: true,
            manualEntry: true,
            inventory: true,
            excelImport: true,
            onlineStore: true,
            reports: true,
            notifications: true,
            ai: true,
            branches: true
        },
        pricing: {
            ar: {
                monthly: 1499,
                quarterly: 4050,
                yearly: 14400
            },
            en: {
                monthly: 39,
                yearly: 390
            }
        },
        pricingEGP: {
            monthly: 1499,
            quarterly: 4050,
            yearly: 14400
        },
        pricingUSD: {
            monthly: 39,
            yearly: 390
        },
        displayFeatures: [
            {
                key: 'branches',
                ar: 'فروع غير محدودة',
                en: 'Unlimited branches',
                included: true
            },
            {
                key: 'all',
                ar: 'جميع مميزات الذهبي',
                en: 'All Gold features',
                included: true
            },
            {
                key: 'control',
                ar: 'تحكم على مستوى الفرع',
                en: 'Branch-level control',
                included: true
            },
            {
                key: 'enterprise',
                ar: 'إدارة على مستوى المؤسسة',
                en: 'Enterprise-level management',
                included: true
            }
        ],
        rolesAr: 'مالك + 29',
        rolesEn: 'Owner + 29'
    }
];
const getPlanById = (id)=>PLANS.find((p)=>p.id === (id || 'bronze').toLowerCase());
const getPlanPricing = (planId, currency)=>{
    const plan = getPlanById(planId);
    if (!plan) return null;
    return currency === 'EGP' ? plan.pricingEGP : plan.pricingUSD;
};
const getPlanPricingByLanguage = (planId, lang)=>{
    const plan = getPlanById(planId);
    if (!plan) return null;
    return plan.pricing[lang];
};
const getPlanCurrency = (lang)=>lang === 'ar' ? 'EGP' : 'USD';
const getPlanCurrencySymbol = (lang)=>lang === 'ar' ? 'ج.م' : '$';
const getPlanFeaturesForFrontend = (planId)=>{
    const plan = getPlanById(planId);
    if (!plan) {
        return {
            ai: false,
            onlineStore: false,
            excelImport: false,
            manualEntry: true,
            branches: false
        };
    }
    return {
        ai: plan.features.ai,
        onlineStore: plan.features.onlineStore,
        excelImport: plan.features.excelImport,
        manualEntry: plan.features.manualEntry,
        branches: plan.features.branches
    };
};
const getPlanFeaturesForBackend = (planId)=>{
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
            manual_entry: true
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
        manual_entry: plan.features.manualEntry
    };
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/permissions.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Single source of truth for role-based permissions and navigation.
 * Use canAccess() and getAllowedNav() everywhere - never duplicate role logic.
 */ __turbopack_context__.s([
    "ROUTE_FEATURE_MAP",
    ()=>ROUTE_FEATURE_MAP,
    "SECTION_LABELS",
    ()=>SECTION_LABELS,
    "canAccess",
    ()=>canAccess,
    "canSeeDomainSection",
    ()=>canSeeDomainSection,
    "getAllowedNav",
    ()=>getAllowedNav,
    "getDefaultRedirect",
    ()=>getDefaultRedirect,
    "getPlanFeatures",
    ()=>getPlanFeatures
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$plans$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/plans.ts [app-client] (ecmascript)");
;
function getPlanFeatures(pkg = 'bronze') {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$plans$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPlanFeaturesForFrontend"])(pkg || 'bronze');
}
const ROUTE_FEATURE_MAP = {
    '/dashboard': 'dashboard',
    '/pos': 'pos',
    '/inventory': 'inventory',
    '/manual-entry': 'manual_entry',
    '/excel-import': 'excel_import',
    '/invoices': 'invoices',
    '/settings': 'settings',
    '/admin': 'admin',
    '/admin/codes': 'admin_codes',
    '/store-admin/reports': 'reports',
    '/store-admin/orders': 'online_orders',
    '/store-admin/payments': 'payments_admin',
    '/store-admin/notifications': 'notifications',
    '/store-admin/branches': 'branches',
    '/store-admin/users': 'users',
    '/store-admin/domains': 'domains',
    '/store-admin/store': 'store_management',
    '/store-admin/inventory/slow-moving': 'inventory_slow'
};
function getDefaultRedirect(role) {
    if (!role) return '/login';
    if (role === 'cashier') return '/pos';
    if (role === 'warehouse') return '/inventory';
    if (role === 'branch_manager' || role === 'multi_branch_manager') return '/pos';
    return '/dashboard';
}
function canAccess(role, feature, planFeatures, _context) {
    if (!role) return false;
    // Super admin sees everything
    if (role === 'super_admin') return true;
    const { ai, onlineStore, excelImport, manualEntry, branches } = planFeatures;
    switch(feature){
        case 'dashboard':
            return [
                'shop_owner',
                'multi_branch_manager'
            ].includes(role);
        case 'ai':
            return ai && role === 'shop_owner'; // only owner; branch_manager, cashier NOT included
        case 'pos':
            return [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier'
            ].includes(role);
        case 'inventory':
        case 'inventory_read':
            return [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier',
                'warehouse'
            ].includes(role);
        case 'inventory_edit':
            return [
                'shop_owner',
                'warehouse'
            ].includes(role);
        case 'inventory_slow':
            return [
                'shop_owner',
                'warehouse',
                'branch_manager',
                'multi_branch_manager'
            ].includes(role);
        case 'excel_import':
            return excelImport && [
                'shop_owner',
                'warehouse'
            ].includes(role);
        case 'manual_entry':
            return manualEntry && [
                'shop_owner',
                'warehouse'
            ].includes(role);
        case 'reports':
            return [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager'
            ].includes(role);
        case 'reports_profit':
            return role === 'shop_owner';
        case 'invoices':
            return [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier'
            ].includes(role);
        case 'online_orders':
            return onlineStore && [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier'
            ].includes(role);
        case 'online_orders_read':
            return onlineStore && [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier'
            ].includes(role);
        case 'payments_admin':
            return [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager'
            ].includes(role); // cashier, warehouse NO access
        case 'notifications':
            return onlineStore && [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier'
            ].includes(role) || role === 'shop_owner';
        case 'branches':
            return role === 'shop_owner' || branches && [
                'branch_manager',
                'multi_branch_manager'
            ].includes(role);
        case 'users':
            return [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager'
            ].includes(role); // cashier, warehouse NO access
        case 'settings':
            return role === 'shop_owner';
        case 'domains':
        case 'domains_full':
            return role === 'shop_owner' && onlineStore;
        case 'store_management':
        case 'store_preview':
            return onlineStore && [
                'shop_owner',
                'branch_manager',
                'cashier',
                'multi_branch_manager'
            ].includes(role); // warehouse NO access
        case 'admin':
        case 'admin_codes':
            return role === 'super_admin';
        case 'branch_availability':
            return branches && [
                'shop_owner',
                'branch_manager',
                'multi_branch_manager',
                'cashier',
                'warehouse'
            ].includes(role);
        default:
            return false;
    }
}
function canSeeDomainSection(role) {
    return role === 'super_admin' || role === 'shop_owner';
}
function getAllowedNav(role, planFeatures, t, language) {
    if (!role) return [];
    const items = [];
    const push = (item)=>{
        if (canAccess(role, item.id, planFeatures)) {
            items.push({
                ...item,
                label: t(item.labelKey) || item.labelKey
            });
        }
    };
    // Operations
    if (canAccess(role, 'dashboard', planFeatures)) {
        push({
            id: 'dashboard',
            href: '/dashboard',
            labelKey: 'nav.dashboard',
            icon: 'LayoutDashboard',
            section: 'operations'
        });
    }
    if (canAccess(role, 'ai', planFeatures)) {
        items.push({
            id: 'ai',
            href: '/dashboard?ai=1',
            labelKey: 'ai.title',
            icon: 'MessageCircle',
            section: 'operations',
            glow: true,
            label: t('ai.title') || 'AI'
        });
    }
    if (canAccess(role, 'pos', planFeatures)) {
        push({
            id: 'pos',
            href: '/pos',
            labelKey: 'nav.pos',
            icon: 'ShoppingCart',
            section: 'operations'
        });
    }
    // Inventory
    if (canAccess(role, 'inventory', planFeatures)) {
        push({
            id: 'inventory',
            href: '/inventory',
            labelKey: 'nav.inventory',
            icon: 'Package',
            section: 'inventory'
        });
    }
    if (canAccess(role, 'inventory_slow', planFeatures)) {
        push({
            id: 'inventory_slow',
            href: '/store-admin/inventory/slow-moving',
            labelKey: 'nav.slowMoving',
            icon: 'AlertTriangle',
            section: 'inventory'
        });
    }
    if (canAccess(role, 'manual_entry', planFeatures)) {
        push({
            id: 'manual_entry',
            href: '/manual-entry',
            labelKey: 'nav.manualEntry',
            icon: 'FilePlus2',
            section: 'inventory'
        });
    }
    if (canAccess(role, 'excel_import', planFeatures)) {
        push({
            id: 'excel_import',
            href: '/excel-import',
            labelKey: 'nav.excelImport',
            icon: 'FileSpreadsheet',
            section: 'inventory'
        });
    }
    // Reports
    if (canAccess(role, 'invoices', planFeatures)) {
        push({
            id: 'invoices',
            href: '/invoices',
            labelKey: 'nav.invoices',
            icon: 'FileText',
            section: 'reports'
        });
    }
    if (canAccess(role, 'reports', planFeatures)) {
        push({
            id: 'reports',
            href: '/store-admin/reports',
            labelKey: 'nav.reports',
            icon: 'BarChart2',
            section: 'reports'
        });
    }
    if (canAccess(role, 'online_orders', planFeatures)) {
        push({
            id: 'online_orders',
            href: '/store-admin/orders',
            labelKey: 'nav.onlineOrders',
            icon: 'ShoppingBag',
            section: 'reports'
        });
    }
    if (canAccess(role, 'payments_admin', planFeatures)) {
        push({
            id: 'payments_admin',
            href: '/store-admin/payments',
            labelKey: 'nav.payments',
            icon: 'CreditCard',
            section: 'reports'
        });
    }
    if (canAccess(role, 'notifications', planFeatures)) {
        push({
            id: 'notifications',
            href: '/store-admin/notifications',
            labelKey: 'nav.notifications',
            icon: 'Bell',
            section: 'reports'
        });
    }
    // Admin (store-admin: branches, users, domains)
    if (canAccess(role, 'branches', planFeatures)) {
        push({
            id: 'branches',
            href: '/store-admin/branches',
            labelKey: 'nav.branches',
            icon: 'GitBranch',
            section: 'admin'
        });
    }
    if (canAccess(role, 'users', planFeatures)) {
        push({
            id: 'users',
            href: '/store-admin/users',
            labelKey: 'nav.users',
            icon: 'Users',
            section: 'admin'
        });
    }
    if (canAccess(role, 'store_management', planFeatures)) {
        push({
            id: 'store_management',
            href: '/store-admin/store',
            labelKey: 'nav.storeAdmin',
            icon: 'Shield',
            section: 'admin'
        });
    }
    if (canAccess(role, 'settings', planFeatures)) {
        push({
            id: 'settings',
            href: '/settings',
            labelKey: 'nav.settings',
            icon: 'Settings',
            section: 'admin'
        });
    }
    // System (super_admin only)
    if (canAccess(role, 'admin', planFeatures)) {
        push({
            id: 'admin',
            href: '/admin',
            labelKey: 'nav.admin',
            icon: 'Shield',
            section: 'system'
        });
    }
    if (canAccess(role, 'admin_codes', planFeatures)) {
        push({
            id: 'admin_codes',
            href: '/admin/codes',
            labelKey: 'nav.codes',
            icon: 'Key',
            section: 'system'
        });
    }
    return items;
}
const SECTION_LABELS = {
    operations: {
        en: 'Operations',
        ar: 'العمليات'
    },
    inventory: {
        en: 'Inventory',
        ar: 'المخزون'
    },
    reports: {
        en: 'Reports & Orders',
        ar: 'التقارير والطلبات'
    },
    admin: {
        en: 'Store Admin',
        ar: 'إدارة المتجر'
    },
    system: {
        en: 'System Admin',
        ar: 'إدارة النظام'
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Sidebar",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shopping-cart.js [app-client] (ecmascript) <export default as ShoppingCart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/package.js [app-client] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-spreadsheet.js [app-client] (ecmascript) <export default as FileSpreadsheet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/message-circle.js [app-client] (ecmascript) <export default as MessageCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$plus$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FilePlus2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-plus-2.js [app-client] (ecmascript) <export default as FilePlus2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-client] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$bag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingBag$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shopping-bag.js [app-client] (ecmascript) <export default as ShoppingBag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$no$2d$axes$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-no-axes-column.js [app-client] (ecmascript) <export default as BarChart2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$git$2d$branch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GitBranch$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/git-branch.js [app-client] (ecmascript) <export default as GitBranch>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-client] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Key$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/key.js [app-client] (ecmascript) <export default as Key>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-client] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$NeonCrownIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/NeonCrownIcon.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$BranchContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/BranchContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$NotificationsBell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/NotificationsBell.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShopSwitcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/ShopSwitcher.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/permissions.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
;
const ICON_MAP = {
    LayoutDashboard: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"],
    MessageCircle: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageCircle$3e$__["MessageCircle"],
    ShoppingCart: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$cart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingCart$3e$__["ShoppingCart"],
    Package: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"],
    AlertTriangle: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"],
    FilePlus2: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$plus$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FilePlus2$3e$__["FilePlus2"],
    FileSpreadsheet: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__["FileSpreadsheet"],
    FileText: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
    BarChart2: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$no$2d$axes$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart2$3e$__["BarChart2"],
    ShoppingBag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shopping$2d$bag$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShoppingBag$3e$__["ShoppingBag"],
    CreditCard: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"],
    Bell: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"],
    GitBranch: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$git$2d$branch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GitBranch$3e$__["GitBranch"],
    Users: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
    Shield: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"],
    Settings: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
    Key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$key$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Key$3e$__["Key"]
};
function Sidebar() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const { t, direction, language, setLanguage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const { logout, user, effectiveRole } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const branchContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$BranchContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBranch"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [collapsed, setCollapsed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [branchDropdownOpen, setBranchDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [now, setNow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "Sidebar.useState": ()=>new Date()
    }["Sidebar.useState"]);
    const isRtl = direction === 'rtl';
    const branches = branchContext?.branches ?? [];
    const activeBranch = branchContext?.activeBranch ?? null;
    const setActiveBranchId = branchContext?.setActiveBranchId;
    const planFeatures = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Sidebar.useMemo[planFeatures]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPlanFeatures"])(user?.package)
    }["Sidebar.useMemo[planFeatures]"], [
        user?.package
    ]);
    const role = effectiveRole ?? user?.role;
    const canSeeOnlineOrders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canAccess"])(role, 'online_orders', planFeatures);
    const canSeeSystemAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canAccess"])(role, 'admin', planFeatures);
    const navItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Sidebar.useMemo[navItems]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAllowedNav"])(role, planFeatures, t, language)
    }["Sidebar.useMemo[navItems]"], [
        role,
        planFeatures,
        t,
        language
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Sidebar.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const saved = localStorage.getItem('sidebar-collapsed') === 'true';
            setCollapsed(saved);
        }
    }["Sidebar.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Sidebar.useEffect": ()=>{
            const interval = window.setInterval({
                "Sidebar.useEffect.interval": ()=>setNow(new Date())
            }["Sidebar.useEffect.interval"], 1000);
            return ({
                "Sidebar.useEffect": ()=>window.clearInterval(interval)
            })["Sidebar.useEffect"];
        }
    }["Sidebar.useEffect"], []);
    const toggleCollapsed = ()=>{
        const next = !collapsed;
        setCollapsed(next);
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.setItem('sidebar-collapsed', String(next));
        }
    };
    const handleAiClick = ()=>{
        try {
            localStorage.setItem('crown-open-ai', 'true');
        } catch  {
        // ignore
        }
        if ("TURBOPACK compile-time truthy", 1) {
            window.dispatchEvent(new Event('crown:open-ai'));
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setOpen(true),
                className: `md:hidden fixed top-4 ${isRtl ? 'right-4' : 'left-4'} z-50 h-10 w-10 rounded-xl bg-cyan-600 text-white shadow-[0_0_16px_rgba(0,243,255,0.4)] flex items-center justify-center`,
                "aria-label": "Open menu",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                    className: "h-5 w-5"
                }, void 0, false, {
                    fileName: "[project]/app/components/Sidebar.tsx",
                    lineNumber: 122,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/components/Sidebar.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-40 bg-black/60 md:hidden",
                onClick: ()=>setOpen(false)
            }, void 0, false, {
                fileName: "[project]/app/components/Sidebar.tsx",
                lineNumber: 126,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: `fixed top-0 ${isRtl ? 'right-0' : 'left-0'} z-50 h-full bg-[#0a0f18] border-cyan-500/40 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${collapsed ? 'md:w-20' : 'md:w-64'} w-64 ${isRtl ? 'border-l' : 'border-r'} ${open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `border-b border-cyan-500/20 ${collapsed ? 'px-4 py-6' : 'px-6 py-6'}`,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `flex ${collapsed ? 'justify-center' : 'items-start gap-3'}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-10 w-10 rounded-xl border border-cyan-500/30 bg-black/30 flex items-center justify-center shadow-[0_0_18px_rgba(0,243,255,0.22)]",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$NeonCrownIcon$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NeonCrownIcon"], {
                                                size: 24
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                lineNumber: 144,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/Sidebar.tsx",
                                            lineNumber: 143,
                                            columnNumber: 15
                                        }, this),
                                        !collapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0 flex-1",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "leading-none",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[12px] font-black tracking-[0.28em] uppercase text-fuchsia-200",
                                                        children: [
                                                            "CROWN ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-100",
                                                                children: "SERVICES"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 151,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                        lineNumber: 150,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-3 flex flex-col items-start gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/25 px-3 py-1.5 shadow-[0_0_14px_rgba(0,243,255,0.12)]",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "relative flex h-2 w-2",
                                                                                children: [
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                                        lineNumber: 158,
                                                                                        columnNumber: 27
                                                                                    }, this),
                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                        className: "relative inline-flex rounded-full h-2 w-2 bg-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.65)]"
                                                                                    }, void 0, false, {
                                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                                        lineNumber: 159,
                                                                                        columnNumber: 27
                                                                                    }, this)
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 157,
                                                                                columnNumber: 25
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                                                                                className: "h-3.5 w-3.5 text-cyan-300"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 161,
                                                                                columnNumber: 25
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "font-mono text-xs text-cyan-200",
                                                                                children: now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 162,
                                                                                columnNumber: 25
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                        lineNumber: 156,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    canSeeOnlineOrders && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$NotificationsBell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationsBell"], {}, void 0, false, {
                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                        lineNumber: 169,
                                                                        columnNumber: 48
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 155,
                                                                columnNumber: 23
                                                            }, this),
                                                            user?.role === 'super_admin' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShopSwitcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShopSwitcher"], {}, void 0, false, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 173,
                                                                columnNumber: 56
                                                            }, this),
                                                            branches.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "relative",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>setBranchDropdownOpen((v)=>!v),
                                                                        className: "inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-black/25 px-3 py-1.5 text-[11px] text-cyan-200",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$git$2d$branch$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GitBranch$3e$__["GitBranch"], {
                                                                                className: "h-3.5 w-3.5"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 182,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "max-w-[100px] truncate",
                                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$BranchContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getBranchDisplayName"])(activeBranch, language)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 183,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                                                                className: "h-3 w-3"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 184,
                                                                                columnNumber: 29
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                        lineNumber: 177,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    branchDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "fixed inset-0 z-10",
                                                                                onClick: ()=>setBranchDropdownOpen(false)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 188,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "absolute top-full left-0 mt-1 z-20 min-w-[160px] rounded-lg border border-cyan-500/30 bg-[#0b1220] py-1 shadow-xl",
                                                                                children: branches.map((b)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                        type: "button",
                                                                                        onClick: ()=>{
                                                                                            setActiveBranchId?.(b.id);
                                                                                            setBranchDropdownOpen(false);
                                                                                        },
                                                                                        className: `w-full text-left px-3 py-2 text-xs ${activeBranch?.id === b.id ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`,
                                                                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$BranchContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getBranchDisplayName"])(b, language)
                                                                                    }, b.id, false, {
                                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                                        lineNumber: 191,
                                                                                        columnNumber: 35
                                                                                    }, this))
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                                lineNumber: 189,
                                                                                columnNumber: 31
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 176,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-black/25 p-1 shadow-[0_0_14px_rgba(0,243,255,0.10)]",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>setLanguage('ar'),
                                                                        className: `px-3 py-1 rounded-full text-[11px] font-extrabold transition ${language === 'ar' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'}`,
                                                                        children: "AR"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                        lineNumber: 210,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>setLanguage('en'),
                                                                        className: `px-3 py-1 rounded-full text-[11px] font-extrabold transition ${language === 'en' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'}`,
                                                                        children: "EN"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                                        lineNumber: 219,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 209,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                        lineNumber: 153,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                lineNumber: 149,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/Sidebar.tsx",
                                            lineNumber: 148,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/components/Sidebar.tsx",
                                    lineNumber: 142,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/components/Sidebar.tsx",
                                lineNumber: 141,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-4 py-3 hidden md:flex items-center justify-between",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: toggleCollapsed,
                                    className: "h-9 w-9 rounded-lg border border-cyan-500/30 text-cyan-300 flex items-center justify-center",
                                    "aria-label": "Toggle sidebar size",
                                    children: collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                        className: "h-4 w-4"
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/Sidebar.tsx",
                                        lineNumber: 242,
                                        columnNumber: 28
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                                        className: "h-4 w-4"
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/Sidebar.tsx",
                                        lineNumber: 242,
                                        columnNumber: 67
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/components/Sidebar.tsx",
                                    lineNumber: 237,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/components/Sidebar.tsx",
                                lineNumber: 236,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                className: "px-4 py-4 space-y-4",
                                children: [
                                    'operations',
                                    'inventory',
                                    'reports',
                                    'admin',
                                    'system'
                                ].map((section)=>{
                                    const items = navItems.filter((x)=>x.section === section);
                                    if (items.length === 0) return null;
                                    const sectionLabel = __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_LABELS"][section][language];
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            !collapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500",
                                                children: sectionLabel
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                lineNumber: 254,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2",
                                                children: items.map((item)=>{
                                                    const Icon = ICON_MAP[item.icon] ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"];
                                                    const active = pathname === item.href || item.href === '/dashboard?ai=1' && pathname === '/dashboard';
                                                    const onClick = item.id === 'ai' ? handleAiClick : undefined;
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        href: item.href,
                                                        onClick: ()=>{
                                                            onClick?.();
                                                            setOpen(false);
                                                        },
                                                        className: `flex items-center gap-3 px-4 py-3 rounded-xl transition ${item.glow ? 'bg-fuchsia-500/10 border border-fuchsia-500/40 text-fuchsia-200 shadow-[0_0_16px_rgba(236,72,153,0.35)] hover:bg-fuchsia-500/10' : active ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-[0_0_14px_rgba(0,243,255,0.35)]' : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10'}`,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                                className: `h-5 w-5 shrink-0 ${item.glow ? 'text-fuchsia-300' : 'text-cyan-300'}`
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 279,
                                                                columnNumber: 27
                                                            }, this),
                                                            !collapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-sm font-semibold",
                                                                children: item.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                                lineNumber: 280,
                                                                columnNumber: 42
                                                            }, this)
                                                        ]
                                                    }, item.href + item.id, true, {
                                                        fileName: "[project]/app/components/Sidebar.tsx",
                                                        lineNumber: 264,
                                                        columnNumber: 25
                                                    }, this);
                                                })
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/Sidebar.tsx",
                                                lineNumber: 258,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, section, true, {
                                        fileName: "[project]/app/components/Sidebar.tsx",
                                        lineNumber: 252,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/app/components/Sidebar.tsx",
                                lineNumber: 246,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/components/Sidebar.tsx",
                        lineNumber: 139,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 pb-6 space-y-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    logout();
                                    router.replace('/login');
                                },
                                className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 transition border border-cyan-500/20",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                        className: "h-5 w-5 text-cyan-300"
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/Sidebar.tsx",
                                        lineNumber: 299,
                                        columnNumber: 13
                                    }, this),
                                    !collapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm font-semibold",
                                        children: t('nav.logout')
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/Sidebar.tsx",
                                        lineNumber: 300,
                                        columnNumber: 28
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/components/Sidebar.tsx",
                                lineNumber: 292,
                                columnNumber: 11
                            }, this),
                            !collapsed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xs text-slate-500 text-center",
                                children: "Crown Services — By Ahmed 2025"
                            }, void 0, false, {
                                fileName: "[project]/app/components/Sidebar.tsx",
                                lineNumber: 303,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/components/Sidebar.tsx",
                        lineNumber: 291,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/Sidebar.tsx",
                lineNumber: 132,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(Sidebar, "jdwmf2Q+a33+3j6AqRTcuEfw8VM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$BranchContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBranch"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/PlanCards.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlanCards",
    ()=>PlanCards
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$plans$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/plans.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function PlanCards() {
    _s();
    const { language } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const t = (ar, en)=>language === 'ar' ? ar : en;
    const lang = language === 'ar' ? 'ar' : 'en';
    const symbol = (0, __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$plans$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPlanCurrencySymbol"])(lang);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 text-sm text-slate-400",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: t('العملة:', 'Currency:')
                    }, void 0, false, {
                        fileName: "[project]/app/components/PlanCards.tsx",
                        lineNumber: 17,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "px-2 py-1 rounded bg-cyan-500/20 text-cyan-300",
                        children: lang === 'ar' ? 'EGP (ج.م)' : 'USD ($)'
                    }, void 0, false, {
                        fileName: "[project]/app/components/PlanCards.tsx",
                        lineNumber: 18,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/PlanCards.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
                children: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$plans$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLANS"].map((plan)=>{
                    const pricing = plan.pricing[lang];
                    const priceMonthly = pricing?.monthly ?? 0;
                    const priceYearly = pricing?.yearly ?? 0;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `rounded-xl border p-5 ${plan.highlight ? 'border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_24px_rgba(0,243,255,0.15)]' : 'border-cyan-500/20 bg-[#0a0f18]'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-bold text-cyan-200 capitalize",
                                        children: t(plan.nameAr, plan.nameEn)
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/PlanCards.tsx",
                                        lineNumber: 37,
                                        columnNumber: 17
                                    }, this),
                                    plan.highlight && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300",
                                        children: t('الأكثر شيوعًا', 'Most Popular')
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/PlanCards.tsx",
                                        lineNumber: 39,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/components/PlanCards.tsx",
                                lineNumber: 36,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-2xl font-bold text-cyan-300",
                                        children: [
                                            symbol,
                                            priceMonthly
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/components/PlanCards.tsx",
                                        lineNumber: 45,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm text-slate-500 ml-1",
                                        children: [
                                            "/ ",
                                            t('شهريًا', 'mo')
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/components/PlanCards.tsx",
                                        lineNumber: 48,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/components/PlanCards.tsx",
                                lineNumber: 44,
                                columnNumber: 15
                            }, this),
                            priceYearly > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xs text-slate-500 mb-3",
                                children: [
                                    t('سنويًا:', 'Yearly:'),
                                    " ",
                                    symbol,
                                    priceYearly
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/components/PlanCards.tsx",
                                lineNumber: 53,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-slate-400 mb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-cyan-300",
                                        children: plan.totalUsers
                                    }, void 0, false, {
                                        fileName: "[project]/app/components/PlanCards.tsx",
                                        lineNumber: 58,
                                        columnNumber: 17
                                    }, this),
                                    ' ',
                                    t('مستخدمين', 'users'),
                                    " (",
                                    t(plan.rolesAr, plan.rolesEn),
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/components/PlanCards.tsx",
                                lineNumber: 57,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: "space-y-2",
                                children: plan.displayFeatures.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        className: "flex items-center gap-2 text-sm",
                                        children: [
                                            f.included ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                className: "h-4 w-4 text-green-500 flex-shrink-0"
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/PlanCards.tsx",
                                                lineNumber: 65,
                                                columnNumber: 23
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                className: "h-4 w-4 text-slate-600 flex-shrink-0"
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/PlanCards.tsx",
                                                lineNumber: 67,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: f.included ? 'text-slate-300' : 'text-slate-500',
                                                children: t(f.ar, f.en)
                                            }, void 0, false, {
                                                fileName: "[project]/app/components/PlanCards.tsx",
                                                lineNumber: 69,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, f.key, true, {
                                        fileName: "[project]/app/components/PlanCards.tsx",
                                        lineNumber: 63,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/components/PlanCards.tsx",
                                lineNumber: 61,
                                columnNumber: 15
                            }, this)
                        ]
                    }, plan.id, true, {
                        fileName: "[project]/app/components/PlanCards.tsx",
                        lineNumber: 28,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/app/components/PlanCards.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/components/PlanCards.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_s(PlanCards, "d1ORxvPBup+C3Qetit/BVjvgCJk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"]
    ];
});
_c = PlanCards;
var _c;
__turbopack_context__.k.register(_c, "PlanCards");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/guards/useRouteGuard.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAccessDeniedMessage",
    ()=>getAccessDeniedMessage,
    "useRouteGuard",
    ()=>useRouteGuard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/permissions.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const ACCESS_DENIED_MESSAGE_AR = 'ليس لديك صلاحية للوصول إلى هذه الصفحة.';
const ACCESS_DENIED_MESSAGE_EN = "You don't have permission to access this page.";
function getAccessDeniedMessage(lang = 'en') {
    return lang === 'ar' ? ACCESS_DENIED_MESSAGE_AR : ACCESS_DENIED_MESSAGE_EN;
}
/**
 * Resolve the feature for a pathname (handles partial matches for nested routes)
 */ function resolveFeature(pathname) {
    // Exact match first
    if (__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROUTE_FEATURE_MAP"][pathname]) return __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROUTE_FEATURE_MAP"][pathname];
    // Nested routes: /store-admin/orders/123 -> online_orders, /inventory/import-fixes/1 -> excel_import
    if (pathname.startsWith('/store-admin/orders')) return 'online_orders';
    if (pathname.startsWith('/store-admin/payments')) return 'payments_admin';
    if (pathname.startsWith('/store-admin/reports')) return 'reports';
    if (pathname.startsWith('/store-admin/notifications')) return 'notifications';
    if (pathname.startsWith('/store-admin/branches')) return 'branches';
    if (pathname.startsWith('/store-admin/users')) return 'users';
    if (pathname.startsWith('/store-admin/domains')) return 'domains';
    if (pathname.startsWith('/store-admin/store')) return 'store_management';
    if (pathname.startsWith('/store-admin/inventory')) return 'inventory_slow';
    if (pathname.startsWith('/inventory/import-fixes')) return 'excel_import';
    if (pathname.startsWith('/admin/codes')) return 'admin_codes';
    if (pathname.startsWith('/admin')) return 'admin';
    return __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROUTE_FEATURE_MAP"][pathname];
}
function useRouteGuard(user, loading, options = {}) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { feature: explicitFeature, showDenied = false, effectiveRole: effectiveRoleOpt } = options;
    const feature = explicitFeature ?? resolveFeature(pathname);
    const planFeatures = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPlanFeatures"])(user?.package);
    const role = effectiveRoleOpt !== undefined ? effectiveRoleOpt : user?.role;
    const allowed = !!(role && feature && (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canAccess"])(role, feature, planFeatures));
    const redirect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$permissions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaultRedirect"])(role ?? null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRouteGuard.useEffect": ()=>{
            if (loading) return;
            if (!user) {
                router.replace('/login');
                return;
            }
            if (!allowed) {
                if (showDenied) {
                    router.replace(`/access-denied?from=${encodeURIComponent(pathname)}`);
                } else {
                    router.replace(redirect);
                }
            }
        }
    }["useRouteGuard.useEffect"], [
        loading,
        user,
        allowed,
        redirect,
        showDenied,
        pathname,
        router
    ]);
    return {
        allowed,
        redirect,
        showDenied
    };
}
_s(useRouteGuard, "qIbXzL/glMgPmW/TFWAi/FqCkIk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/admin/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/copy.js [app-client] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$PlanCards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/PlanCards.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShopSwitcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/ShopSwitcher.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$OfflineContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/OfflineContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$guards$2f$useRouteGuard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/guards/useRouteGuard.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
function AdminPage() {
    _s();
    const { t, direction, language } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const { isOnline } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$OfflineContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOffline"])();
    const { user, loading: authLoading, effectiveRole, setRoleOverride, clearRoleOverride } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const { allowed } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$guards$2f$useRouteGuard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouteGuard"])(user, authLoading, {
        feature: 'admin',
        effectiveRole,
        showDenied: true
    });
    const [roleTesterValue, setRoleTesterValue] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState('');
    const [users, setUsers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        username: '',
        password: '',
        role: 'cashier'
    });
    const [licenseForm, setLicenseForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        plan: 'bronze',
        duration: 'monthly',
        count: '1'
    });
    const [generatedCodes, setGeneratedCodes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            if (authLoading || !allowed) return;
            if (!user || user.role !== 'super_admin') return;
            loadUsers();
        }
    }["AdminPage.useEffect"], [
        authLoading,
        allowed,
        user
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AdminPage.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const sync = {
                "AdminPage.useEffect.sync": ()=>setRoleTesterValue(sessionStorage.getItem('crown-role-override') || '')
            }["AdminPage.useEffect.sync"];
            sync();
            window.addEventListener('crown-role-override-changed', sync);
            return ({
                "AdminPage.useEffect": ()=>window.removeEventListener('crown-role-override-changed', sync)
            })["AdminPage.useEffect"];
        }
    }["AdminPage.useEffect"], []);
    const loadUsers = async ()=>{
        try {
            setLoading(true);
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/users');
            setUsers(data);
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally{
            setLoading(false);
        }
    };
    const createUser = async ()=>{
        setError(null);
        if (form.role === 'shop_owner' && user?.role === 'super_admin' && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShopSwitcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getActiveShopId"])()) {
            const msg = language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(msg);
            return;
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/users', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            setForm({
                username: '',
                password: '',
                role: 'cashier'
            });
            await loadUsers();
        } catch (err) {
            const msg = err?.message || '';
            if (msg === 'SHOP_ID_REQUIRED') {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
                return;
            }
            setError(msg === 'PLAN_USER_LIMIT_REACHED' ? language === 'ar' ? 'لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك. قم بالترقية أو احذف مستخدمًا.' : "You have reached your plan's user limit. Upgrade your plan or remove a user." : msg || 'Failed to create user');
        }
    };
    const deleteUser = async (id)=>{
        setError(null);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/users/${id}`, {
                method: 'DELETE'
            });
            await loadUsers();
        } catch (err) {
            const msg = err?.message || '';
            setError(msg === 'OWNER_CANNOT_BE_DELETED' ? language === 'ar' ? 'لا يمكن حذف حساب المالك' : 'Owner account cannot be deleted' : msg || 'Failed to delete user');
        }
    };
    const generateCodes = async ()=>{
        setError(null);
        try {
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/licenses/generate', {
                method: 'POST',
                body: JSON.stringify({
                    plan: licenseForm.plan,
                    duration: licenseForm.duration,
                    count: parseInt(licenseForm.count || '1', 10)
                })
            });
            setGeneratedCodes(result.codes || []);
        } catch (err) {
            setError(err.message || 'Failed to generate codes');
        }
    };
    if (authLoading || !allowed) return null;
    if (!isOnline) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-black text-white flex",
            dir: direction,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 118,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 p-8 pt-20 md:pt-8 overflow-y-auto flex items-center justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "neon-card rounded-xl p-8 max-w-md w-full text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-xl font-bold text-amber-300 mb-3",
                                children: language === 'ar' ? 'يتطلب اتصالاً بالإنترنت' : 'Requires Internet Connection'
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 121,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-slate-400",
                                children: language === 'ar' ? 'هذه الصفحة تحتاج إلى اتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.' : 'This page requires an internet connection. Check your connection and try again.'
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 124,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 120,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/admin/page.tsx",
                    lineNumber: 119,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/admin/page.tsx",
            lineNumber: 117,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-black text-white flex",
        dir: direction,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 135,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 p-8 pt-20 md:pt-8 overflow-y-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold text-cyan-200 mb-6",
                        children: t('admin.title')
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 137,
                        columnNumber: 9
                    }, this),
                    user?.role !== 'super_admin' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "neon-card rounded-xl p-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200",
                            children: language === 'ar' ? 'هذه الصفحة خاصة بالمدير العام للنظام فقط.' : 'This page is for system administrators only.'
                        }, void 0, false, {
                            fileName: "[project]/app/admin/page.tsx",
                            lineNumber: 140,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 139,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "neon-card rounded-xl p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap items-center gap-4 mb-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShopSwitcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ShopSwitcher"], {}, void 0, false, {
                                    fileName: "[project]/app/admin/page.tsx",
                                    lineNumber: 147,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 146,
                                columnNumber: 13
                            }, this),
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200",
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 150,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-center gap-4 mb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-wrap items-center gap-4 text-sm text-slate-300",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "https://wa.me/201202620913",
                                                        target: "_blank",
                                                        rel: "noopener noreferrer",
                                                        className: "flex items-center gap-2 text-green-400 hover:text-green-300",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: language === 'ar' ? 'واتساب:' : 'WhatsApp:'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 158,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: "+01202620913"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 159,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 157,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "tel:+01070045116",
                                                        className: "flex items-center gap-2 text-cyan-400 hover:text-cyan-300",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: language === 'ar' ? 'فودافون:' : 'Vodafone Call:'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 162,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: "+01070045116"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 163,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 161,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 156,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-lg font-bold text-cyan-200",
                                                children: language === 'ar' ? 'الباقات' : 'Plans'
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 166,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 155,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$PlanCards$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlanCards"], {}, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 168,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 154,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-8",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-lg font-bold text-cyan-200 mb-4",
                                        children: language === 'ar' ? 'إدارة المستخدمين' : 'User Management'
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 172,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-1 md:grid-cols-3 gap-3 mb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                placeholder: "Email / Username",
                                                value: form.username,
                                                onChange: (e)=>setForm((prev)=>({
                                                            ...prev,
                                                            username: e.target.value
                                                        }))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 176,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "password",
                                                className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                placeholder: "Password",
                                                value: form.password,
                                                onChange: (e)=>setForm((prev)=>({
                                                            ...prev,
                                                            password: e.target.value
                                                        }))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 182,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                value: form.role,
                                                onChange: (e)=>setForm((prev)=>({
                                                            ...prev,
                                                            role: e.target.value
                                                        })),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "shop_owner",
                                                        children: language === 'ar' ? 'مالك' : 'Owner'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 194,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "cashier",
                                                        children: language === 'ar' ? 'كاشير' : 'Cashier'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 195,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: "warehouse",
                                                        children: language === 'ar' ? 'مخزن' : 'Warehouse'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 189,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 175,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: createUser,
                                        disabled: form.role === 'shop_owner' && user?.role === 'super_admin' && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShopSwitcher$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getActiveShopId"])(),
                                        className: "px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed",
                                        children: language === 'ar' ? 'إضافة مستخدم' : 'Add User'
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 199,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 overflow-x-auto",
                                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-sm text-slate-300",
                                            children: t('common.loading')
                                        }, void 0, false, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 209,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                            className: "w-full text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                    className: "text-cyan-400 border-b border-cyan-500/20",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "py-2 text-left",
                                                                children: "Email"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 214,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "py-2 text-left",
                                                                children: language === 'ar' ? 'الدور' : 'Role'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 215,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "py-2 text-left",
                                                                children: language === 'ar' ? 'تاريخ الإنشاء' : 'Created'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 216,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "py-2 text-left",
                                                                children: language === 'ar' ? 'إجراء' : 'Action'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 217,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 213,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 212,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                    children: users.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            className: "border-b border-cyan-500/10",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: item.username
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 223,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: item.role
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 224,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 225,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: item.role !== 'shop_owner' && item.id !== user?.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>deleteUser(item.id),
                                                                        className: "text-red-400 hover:text-red-300 text-xs",
                                                                        children: language === 'ar' ? 'حذف' : 'Delete'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/admin/page.tsx",
                                                                        lineNumber: 230,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 228,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, item.id, true, {
                                                            fileName: "[project]/app/admin/page.tsx",
                                                            lineNumber: 222,
                                                            columnNumber: 23
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/admin/page.tsx",
                                                    lineNumber: 220,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/admin/page.tsx",
                                            lineNumber: 211,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 207,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/admin/page.tsx",
                                lineNumber: 171,
                                columnNumber: 11
                            }, this),
                            user?.role === 'super_admin' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-10 border-t border-cyan-500/20 pt-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-lg font-bold text-cyan-200 mb-3",
                                                children: language === 'ar' ? 'مختبر الأدوار' : 'Session Role Tester'
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 249,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-slate-400 mb-3",
                                                children: language === 'ar' ? 'لاختبار القائمة الجانبية لكل دور (للمدير العام فقط)' : 'Test sidebar visibility per role (super_admin only)'
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 252,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-wrap items-center gap-3 mb-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                        value: roleTesterValue,
                                                        onChange: (e)=>setRoleTesterValue(e.target.value),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: language === 'ar' ? '— بدون تجربة —' : '— No override —'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 261,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "super_admin",
                                                                children: language === 'ar' ? 'مدير النظام (كامل)' : 'Full Access (super_admin)'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 262,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "shop_owner",
                                                                children: language === 'ar' ? 'مالك متجر' : 'Shop Owner'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 263,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "branch_manager",
                                                                children: language === 'ar' ? 'مدير فرع' : 'Branch Manager'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 264,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "cashier",
                                                                children: language === 'ar' ? 'كاشير' : 'Cashier'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 265,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "warehouse",
                                                                children: language === 'ar' ? 'مخزن' : 'Warehouse'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 266,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 256,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>{
                                                            if (roleTesterValue) setRoleOverride(roleTesterValue);
                                                            else clearRoleOverride();
                                                        },
                                                        className: "px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold",
                                                        children: language === 'ar' ? 'حفظ' : 'Save'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 268,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        type: "button",
                                                        onClick: ()=>{
                                                            clearRoleOverride();
                                                            setRoleTesterValue('');
                                                        },
                                                        className: "px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300",
                                                        children: language === 'ar' ? 'إلغاء التجربة' : 'Clear Override'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 278,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 255,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 248,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-10 border-t border-cyan-500/20 pt-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between mb-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                        className: "text-lg font-bold text-cyan-200",
                                                        children: language === 'ar' ? 'مولد الأكواد' : 'Activation Code Generator'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 289,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        href: "/admin/codes",
                                                        className: "text-sm text-cyan-400 hover:text-cyan-300 underline",
                                                        children: language === 'ar' ? 'عرض قائمة الأكواد' : 'View Codes List'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 292,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 288,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-1 md:grid-cols-3 gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                        value: licenseForm.plan,
                                                        onChange: (e)=>setLicenseForm((prev)=>({
                                                                    ...prev,
                                                                    plan: e.target.value
                                                                })),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "bronze",
                                                                children: "Bronze"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 305,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "silver",
                                                                children: "Silver"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 306,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "gold",
                                                                children: "Gold"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 307,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "branches",
                                                                children: "Branches"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 308,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 300,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                        value: licenseForm.duration,
                                                        onChange: (e)=>setLicenseForm((prev)=>({
                                                                    ...prev,
                                                                    duration: e.target.value
                                                                })),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "monthly",
                                                                children: "Monthly"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 315,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "quarterly",
                                                                children: "Quarterly"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 316,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "yearly",
                                                                children: "Yearly"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 317,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "lifetime",
                                                                children: "Lifetime"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 318,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 310,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",
                                                        placeholder: "Count",
                                                        value: licenseForm.count,
                                                        onChange: (e)=>setLicenseForm((prev)=>({
                                                                    ...prev,
                                                                    count: e.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 320,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 299,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: generateCodes,
                                                className: "mt-4 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold",
                                                children: language === 'ar' ? 'توليد الأكواد' : 'Generate Codes'
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 327,
                                                columnNumber: 15
                                            }, this),
                                            generatedCodes.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-4 space-y-2",
                                                children: generatedCodes.map((code)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#0f172a] px-3 py-2 text-sm text-cyan-200",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                                className: "flex-1 font-mono",
                                                                children: code
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 337,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                onClick: ()=>{
                                                                    navigator.clipboard.writeText(code);
                                                                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                                                                },
                                                                className: "p-1.5 rounded border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300",
                                                                title: language === 'ar' ? 'نسخ' : 'Copy',
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                                                                    className: "w-4 h-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/admin/page.tsx",
                                                                    lineNumber: 347,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/admin/page.tsx",
                                                                lineNumber: 338,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, code, true, {
                                                        fileName: "[project]/app/admin/page.tsx",
                                                        lineNumber: 336,
                                                        columnNumber: 21
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/admin/page.tsx",
                                                lineNumber: 334,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/admin/page.tsx",
                                        lineNumber: 287,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/admin/page.tsx",
                        lineNumber: 145,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/admin/page.tsx",
                lineNumber: 136,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/admin/page.tsx",
        lineNumber: 134,
        columnNumber: 5
    }, this);
}
_s(AdminPage, "xKdf/1K4O5L3NzyA9tsmB+j6I84=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$OfflineContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOffline"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$guards$2f$useRouteGuard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouteGuard"]
    ];
});
_c = AdminPage;
var _c;
__turbopack_context__.k.register(_c, "AdminPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0251bebf._.js.map