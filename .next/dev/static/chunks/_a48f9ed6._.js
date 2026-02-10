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
"[project]/app/invoices/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>InvoicesPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/LanguageContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/AuthContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/contexts/CurrencyContext.tsx [app-client] (ecmascript)");
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
function InvoicesPageContent() {
    _s();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const focusId = searchParams.get('focus');
    const sourceParam = searchParams.get('source');
    const { t, direction, language } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"])();
    const { user, loading: authLoading, effectiveRole } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const { allowed } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$guards$2f$useRouteGuard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouteGuard"])(user, authLoading, {
        feature: 'invoices',
        effectiveRole,
        showDenied: true
    });
    const { symbol, currency } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCurrency"])();
    const [invoices, setInvoices] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [business, setBusiness] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [itemsMap, setItemsMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [printingId, setPrintingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sourceFilter, setSourceFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(sourceParam === 'online' ? 'online' : sourceParam === 'pos' ? 'pos' : 'all');
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const focusHandledRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InvoicesPageContent.useEffect": ()=>{
            if (sourceParam === 'online') setSourceFilter('online');
            else if (sourceParam === 'pos') setSourceFilter('pos');
        }
    }["InvoicesPageContent.useEffect"], [
        sourceParam
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InvoicesPageContent.useEffect": ()=>{
            if (!authLoading && !allowed) return;
            const handler = {
                "InvoicesPageContent.useEffect.handler": ()=>loadInvoices()
            }["InvoicesPageContent.useEffect.handler"];
            const delay = search.trim() ? 350 : 0;
            const timer = setTimeout(handler, delay);
            return ({
                "InvoicesPageContent.useEffect": ()=>clearTimeout(timer)
            })["InvoicesPageContent.useEffect"];
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["InvoicesPageContent.useEffect"], [
        authLoading,
        allowed,
        sourceFilter,
        search
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InvoicesPageContent.useEffect": ()=>{
            if (focusId && invoices.length > 0 && !focusHandledRef.current) {
                const id = parseInt(focusId, 10);
                if (Number.isFinite(id) && invoices.some({
                    "InvoicesPageContent.useEffect": (inv)=>inv.id === id
                }["InvoicesPageContent.useEffect"])) {
                    setExpanded(id);
                    focusHandledRef.current = true;
                }
            }
        }
    }["InvoicesPageContent.useEffect"], [
        focusId,
        invoices
    ]);
    const showToast = (msg)=>{
        setToast(msg);
        setTimeout(()=>setToast(null), 4000);
    };
    const loadInvoices = async ()=>{
        try {
            setLoading(true);
            setError(null);
            const [shopData, ...rest] = await Promise.all([
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/shops/profile')
            ]);
            setBusiness(shopData);
            if (sourceFilter === 'online') {
                const params = new URLSearchParams({
                    limit: '200'
                });
                if (search.trim()) params.set('query', search.trim());
                const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/admin/online-invoices?${params.toString()}`);
                setInvoices((data || []).map((r)=>({
                        ...r,
                        invoiceSource: 'online',
                        total_amount: r.total,
                        created_at: r.order_created_at || r.created_at,
                        print_count: r.printed_count,
                        customer_phone: r.phone
                    })));
            } else if (sourceFilter === 'pos') {
                const params = new URLSearchParams({
                    limit: '200',
                    source: 'pos'
                });
                if (search.trim()) params.set('search', search.trim());
                const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/sales?${params.toString()}`);
                setInvoices((data || []).map((r)=>({
                        ...r,
                        invoiceSource: 'pos'
                    })));
            } else {
                const [posData, onlineData] = await Promise.all([
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/sales?limit=200&source=pos'),
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])('/admin/online-invoices?limit=200')
                ]);
                const pos = (posData || []).map((r)=>({
                        ...r,
                        invoiceSource: 'pos'
                    }));
                const online = (onlineData || []).map((r)=>({
                        ...r,
                        invoiceSource: 'online',
                        total_amount: r.total,
                        created_at: r.order_created_at || r.created_at,
                        print_count: r.printed_count,
                        customer_phone: r.phone
                    }));
                setInvoices([
                    ...online,
                    ...pos
                ].sort((a, b)=>new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
            }
        } catch (err) {
            setError(err.message || 'Failed to load invoices');
        } finally{
            setLoading(false);
        }
    };
    const toggleInvoice = async (invoiceId, invoice)=>{
        if (expanded === invoiceId) {
            setExpanded(null);
            return;
        }
        setExpanded(invoiceId);
        if (!itemsMap[invoiceId]) {
            try {
                const isOnline = invoice?.invoiceSource === 'online';
                const items = isOnline ? (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/admin/online-invoices/${invoiceId}`))?.items || [] : await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/sales/${invoiceId}/items`);
                setItemsMap((prev)=>({
                        ...prev,
                        [invoiceId]: items
                    }));
            } catch (err) {
            // ignore
            }
        }
    };
    const printInvoice = async (invoice)=>{
        try {
            setPrintingId(invoice.id);
            setError(null);
            const isOnline = invoice.invoiceSource === 'online';
            let items = itemsMap[invoice.id];
            if (!items) {
                items = isOnline ? (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/admin/online-invoices/${invoice.id}`))?.items || [] : await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/sales/${invoice.id}/items`);
                setItemsMap((prev)=>({
                        ...prev,
                        [invoice.id]: items
                    }));
            }
            const prevCount = Number(invoice.print_count || invoice.printed_count || 0);
            let printCount = 0;
            let lastPrintedAt = null;
            try {
                if (isOnline) {
                    const printInfo = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/admin/online-invoices/${invoice.id}/print`, {
                        method: 'POST'
                    });
                    printCount = Number(printInfo?.printCount || 0);
                    lastPrintedAt = printInfo?.lastPrintedAt || null;
                } else {
                    const printInfo = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiRequest"])(`/sales/${invoice.id}/print`, {
                        method: 'POST'
                    });
                    printCount = Number(printInfo?.printCount || 0);
                    lastPrintedAt = printInfo?.lastPrintedAt || null;
                }
                setInvoices((prev)=>prev.map((row)=>row.id === invoice.id ? {
                            ...row,
                            print_count: printCount,
                            printed_count: printCount,
                            last_printed_at: lastPrintedAt
                        } : row));
            } catch  {
            // If print counter fails, still allow printing
            }
            if (prevCount > 0) {
                const lastPrinted = invoice.last_printed_at ? new Date(invoice.last_printed_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : '';
                showToast(language === 'ar' ? `تنبيه: تمت طباعة الفاتورة من قبل (آخر طباعة: ${lastPrinted})` : `Warning: invoice was printed before (last printed: ${lastPrinted})`);
            }
            const receiptWindow = window.open('', '_blank');
            if (!receiptWindow) return;
            const printInfoLabel = language === 'ar' ? `تمت الطباعة ${printCount} مرات (هذه الطباعة رقم ${printCount})` : `Printed ${printCount} times (this is print #${printCount})`;
            const itemsHtml = (items || []).map((item)=>{
                const name = item.name_snapshot || (language === 'ar' ? item.name_ar : item.name_en);
                const totalPrice = item.total_price ?? Number(item.price_snapshot || 0) * Number(item.quantity || 0);
                return `
            <div class="item">
              <span class="item-name">${name}</span>
              <span class="item-qty">${Number(item.quantity || 0)}x</span>
              <span class="item-price">${format(Number(totalPrice || 0))}</span>
            </div>
          `;
            }).join('');
            const receiptHTML = `
        <!DOCTYPE html>
        <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
          <head>
            <meta charset="UTF-8">
            <title>Receipt - ${invoice.invoice_number || invoice.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Orbitron', monospace;
                background: #ffffff;
                color: #111827;
                padding: 24px;
                line-height: 1.6;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                min-height: 70vh;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 20px;
              }
              .header h1 {
                font-size: 34px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 3px;
                margin-bottom: 10px;
              }
              .header p {
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              .copy-label {
                display: inline-block;
                margin-top: 10px;
                padding: 6px 12px;
                border-radius: 999px;
                border: 2px solid #ef4444;
                color: #991b1b;
                background: #fee2e2;
                font-weight: 900;
                font-size: 12px;
                letter-spacing: 1px;
                text-transform: uppercase;
              }
              .info {
                margin-bottom: 25px;
                font-size: 11px;
                color: #4b5563;
              }
              .items { margin-bottom: 25px; }
              .item {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
                font-size: 13px;
              }
              .item-name { flex: 1; color: #111827; }
              .item-qty { margin: 0 15px; color: #6b7280; }
              .item-price { color: #111827; font-weight: 700; }
              .total {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                font-size: 20px;
                font-weight: 700;
                text-transform: uppercase;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              @media print {
                @page { size: auto portrait; margin: 8mm; }
                body { padding: 0; }
                .receipt {
                  box-shadow: none;
                  border-color: #d1d5db;
                  width: 100%;
                  max-width: 210mm;
                  min-height: 100%;
                  page-break-inside: avoid;
                }
                .footer { margin-top: auto; }
              }
              @media print and (max-width: 90mm) {
                .receipt { max-width: 80mm; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="content">
                <div class="header">
                  ${business?.logo_url ? `<img src="${business.logo_url}" alt="Logo" style="height: 48px; margin-bottom: 8px;" />` : ''}
                  <h1>${business?.business_name || 'Crown Services'}</h1>
                  <p>${business?.activity_type || (language === 'ar' ? 'تاج الخدمات' : 'Services ERP')}</p>
                  <div class="copy-label">${printInfoLabel}</div>
                </div>
                <div class="info">
                  <p>Invoice # / رقم الفاتورة: ${invoice.invoiceSource === 'online' ? `ON-${invoice.invoice_number}` : invoice.invoice_serial || invoice.invoice_number || invoice.id}</p>
                  <p>Date / التاريخ: ${new Date(invoice.created_at ?? Date.now()).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                  <p>Cashier / الكاشير: ${invoice.cashier_name || 'N/A'}</p>
                  <p>Customer / العميل: ${invoice.customer_name || (language === 'ar' ? 'عميل مباشر' : 'Walk-in')}</p>
                  ${invoice.customer_phone || invoice.phone ? `<p>Phone / الهاتف: ${invoice.customer_phone || invoice.phone}</p>` : ''}
                  ${invoice.customer_address || invoice.address ? `<p>Address / العنوان: ${invoice.customer_address || invoice.address}</p>` : ''}
                  ${business?.address ? `<p>Shop Address: ${business.address}</p>` : ''}
                  ${business?.contact_phone ? `<p>Shop Phone: ${business.contact_phone}</p>` : ''}
                </div>
                <div class="items">
                  <div class="item" style="font-weight: 700;">
                    <span class="item-name">Item / الصنف</span>
                    <span class="item-qty">Qty / الكمية</span>
                  <span class="item-price">Price / السعر</span>
                  </div>
                  ${itemsHtml || ''}
                </div>
                <div class="total">
                  <span>Total / الإجمالي</span>
                  <span>${format(Number(invoice.total_amount ?? invoice.total ?? 0))}</span>
                </div>
              </div>
              <div class="footer">
                <p>Thank you for your visit! / شكراً لزيارتكم!</p>
                <p>Powered by Crown Services | www.crowncs.org</p>
              </div>
            </div>
          </body>
        </html>
      `;
            receiptWindow.document.write(receiptHTML);
            receiptWindow.document.close();
            setTimeout(()=>{
                receiptWindow.print();
            }, 500);
        } catch (err) {
            setError(err.message || 'Failed to print invoice');
        } finally{
            setPrintingId(null);
        }
    };
    if (authLoading || !allowed) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-black text-white flex",
        dir: direction,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
                fileName: "[project]/app/invoices/page.tsx",
                lineNumber: 407,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 p-8 pt-20 md:pt-8 overflow-y-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold text-cyan-200 mb-6",
                        children: t('invoices.title')
                    }, void 0, false, {
                        fileName: "[project]/app/invoices/page.tsx",
                        lineNumber: 409,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-2 mb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSourceFilter('all'),
                                className: `px-4 py-2 rounded-xl text-sm font-semibold transition ${sourceFilter === 'all' ? 'bg-cyan-600 text-white' : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'}`,
                                children: language === 'ar' ? 'الكل' : 'All'
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 411,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSourceFilter('pos'),
                                className: `px-4 py-2 rounded-xl text-sm font-semibold transition ${sourceFilter === 'pos' ? 'bg-cyan-600 text-white' : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'}`,
                                children: "POS"
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 421,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSourceFilter('online'),
                                className: `px-4 py-2 rounded-xl text-sm font-semibold transition ${sourceFilter === 'online' ? 'bg-cyan-600 text-white' : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'}`,
                                children: language === 'ar' ? 'أونلاين' : 'Online'
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 431,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "search",
                                value: search,
                                onChange: (e)=>setSearch(e.target.value),
                                placeholder: language === 'ar' ? 'ابحث برقم الفاتورة / الهاتف / اسم العميل...' : 'Search by invoice #, phone, customer name...',
                                className: "flex-1 min-w-[180px] px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-slate-100 placeholder:text-slate-500"
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 441,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/invoices/page.tsx",
                        lineNumber: 410,
                        columnNumber: 9
                    }, this),
                    toast && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200",
                        children: toast
                    }, void 0, false, {
                        fileName: "[project]/app/invoices/page.tsx",
                        lineNumber: 450,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "neon-card rounded-xl p-6",
                        children: [
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200",
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 456,
                                columnNumber: 13
                            }, this),
                            business && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-6 rounded-lg border border-cyan-500/20 p-4 text-sm text-slate-300 flex items-center gap-4",
                                children: [
                                    business.logo_url ? // eslint-disable-next-line @next/next/no-img-element
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: business.logo_url,
                                        alt: "Logo",
                                        className: "h-12 w-12 rounded-md object-cover border border-cyan-500/20"
                                    }, void 0, false, {
                                        fileName: "[project]/app/invoices/page.tsx",
                                        lineNumber: 464,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-12 w-12 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60",
                                        children: business.business_name?.[0] || 'C'
                                    }, void 0, false, {
                                        fileName: "[project]/app/invoices/page.tsx",
                                        lineNumber: 466,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "font-semibold text-cyan-200",
                                                children: business.business_name || business.owner_name
                                            }, void 0, false, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 471,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: business.activity_type || ''
                                            }, void 0, false, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 472,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: business.address || ''
                                            }, void 0, false, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 473,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: business.contact_phone || ''
                                            }, void 0, false, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 474,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: business.contact_email || ''
                                            }, void 0, false, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 475,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/invoices/page.tsx",
                                        lineNumber: 470,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 461,
                                columnNumber: 13
                            }, this),
                            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-slate-300",
                                children: t('common.loading')
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 480,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "w-full text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "text-cyan-400 border-b border-cyan-500/20",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "py-2 text-left",
                                                        children: "#"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/invoices/page.tsx",
                                                        lineNumber: 486,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "py-2 text-left",
                                                        children: language === 'ar' ? 'العميل' : 'Customer'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/invoices/page.tsx",
                                                        lineNumber: 487,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "py-2 text-left",
                                                        children: language === 'ar' ? 'التاريخ' : 'Date'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/invoices/page.tsx",
                                                        lineNumber: 488,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "py-2 text-left",
                                                        children: language === 'ar' ? 'الإجمالي' : 'Total'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/invoices/page.tsx",
                                                        lineNumber: 489,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "py-2 text-left",
                                                        children: language === 'ar' ? 'تفاصيل' : 'Details'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/invoices/page.tsx",
                                                        lineNumber: 490,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 485,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/invoices/page.tsx",
                                            lineNumber: 484,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "text-slate-200",
                                            children: invoices.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                    colSpan: 5,
                                                    className: "py-4 text-center text-slate-500",
                                                    children: language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'
                                                }, void 0, false, {
                                                    fileName: "[project]/app/invoices/page.tsx",
                                                    lineNumber: 496,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/invoices/page.tsx",
                                                lineNumber: 495,
                                                columnNumber: 21
                                            }, this) : invoices.map((invoice)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            className: "border-b border-cyan-500/10",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center gap-2 flex-wrap",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                children: invoice.invoiceSource === 'online' ? `ON-${invoice.invoice_number}` : invoice.invoice_serial || invoice.invoice_number || invoice.id
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 506,
                                                                                columnNumber: 31
                                                                            }, this),
                                                                            (invoice.source === 'online' || invoice.online_order_id) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200",
                                                                                children: language === 'ar' ? 'أونلاين' : 'Online'
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 508,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            (!invoice.source || invoice.source === 'pos') && !invoice.online_order_id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200",
                                                                                children: "POS"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 513,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            (invoice.print_count ?? invoice.printed_count ?? 0) >= 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-200",
                                                                                children: language === 'ar' ? `تمت الطباعة ${invoice.print_count ?? invoice.printed_count} مرات (الطباعة #${invoice.print_count ?? invoice.printed_count})` : `Printed ${invoice.print_count ?? invoice.printed_count} times (this is print #${invoice.print_count ?? invoice.printed_count})`
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 518,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                        lineNumber: 505,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                    lineNumber: 504,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            children: invoice.customer_name || (language === 'ar' ? 'عميل مباشر' : 'Walk-in')
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/invoices/page.tsx",
                                                                            lineNumber: 527,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "text-xs text-slate-400",
                                                                            children: invoice.customer_phone || ''
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/invoices/page.tsx",
                                                                            lineNumber: 528,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                    lineNumber: 526,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: new Date(invoice.created_at ?? Date.now()).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                    lineNumber: 530,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: [
                                                                        Number(invoice.total_amount ?? invoice.total ?? 0).toFixed(2),
                                                                        " ",
                                                                        symbol
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                    lineNumber: 533,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "py-2",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>toggleInvoice(invoice.id, invoice),
                                                                        className: "text-cyan-300 hover:text-cyan-200 text-xs",
                                                                        children: expanded === invoice.id ? language === 'ar' ? 'إخفاء التفاصيل' : 'Hide details' : language === 'ar' ? 'عرض التفاصيل' : 'View details'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                        lineNumber: 537,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                    lineNumber: 536,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/invoices/page.tsx",
                                                            lineNumber: 503,
                                                            columnNumber: 25
                                                        }, this),
                                                        expanded === invoice.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            className: "border-b border-cyan-500/10 bg-[#0f172a]",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                colSpan: 5,
                                                                className: "py-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-xs text-slate-400 mb-2 space-y-1",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: invoice.customer_address || ''
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 555,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    language === 'ar' ? 'الكاشير' : 'Cashier',
                                                                                    ": ",
                                                                                    invoice.cashier_name || '—'
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 556,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                children: [
                                                                                    language === 'ar' ? 'طريقة الدفع' : 'Payment',
                                                                                    ": ",
                                                                                    invoice.payment_method
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 557,
                                                                                columnNumber: 33
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                                className: "pt-2",
                                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                                    onClick: ()=>printInvoice(invoice),
                                                                                    disabled: printingId === invoice.id,
                                                                                    className: "text-cyan-300 hover:text-cyan-200 text-xs border border-cyan-500/30 rounded-md px-3 py-1",
                                                                                    children: printingId === invoice.id ? language === 'ar' ? 'جاري الطباعة...' : 'Printing...' : language === 'ar' ? 'طباعة' : 'Print'
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                                    lineNumber: 559,
                                                                                    columnNumber: 35
                                                                                }, this)
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                lineNumber: 558,
                                                                                columnNumber: 33
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                        lineNumber: 554,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "overflow-x-auto",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                                                            className: "w-full text-xs",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                                                    className: "text-cyan-300",
                                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                        children: [
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                className: "text-left py-1",
                                                                                                children: language === 'ar' ? 'المنتج' : 'Product'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                                lineNumber: 578,
                                                                                                columnNumber: 39
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                className: "text-left py-1",
                                                                                                children: language === 'ar' ? 'الكمية' : 'Qty'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                                lineNumber: 579,
                                                                                                columnNumber: 39
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                className: "text-left py-1",
                                                                                                children: language === 'ar' ? 'السعر' : 'Price'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                                lineNumber: 580,
                                                                                                columnNumber: 39
                                                                                            }, this),
                                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                                                className: "text-left py-1",
                                                                                                children: language === 'ar' ? 'الإجمالي' : 'Total'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                                lineNumber: 581,
                                                                                                columnNumber: 39
                                                                                            }, this)
                                                                                        ]
                                                                                    }, void 0, true, {
                                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                                        lineNumber: 577,
                                                                                        columnNumber: 37
                                                                                    }, this)
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                                    lineNumber: 576,
                                                                                    columnNumber: 35
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                                                    children: [
                                                                                        (itemsMap[invoice.id] || []).map((item, idx)=>{
                                                                                            const name = item.name_snapshot || (language === 'ar' ? item.name_ar : item.name_en);
                                                                                            const unitPrice = item.unit_price ?? item.price_snapshot ?? 0;
                                                                                            const totalPrice = item.total_price ?? Number(item.price_snapshot || 0) * Number(item.quantity || 0);
                                                                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                                children: [
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                        className: "py-1",
                                                                                                        children: name
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                                                        lineNumber: 591,
                                                                                                        columnNumber: 41
                                                                                                    }, this),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                        className: "py-1",
                                                                                                        children: item.quantity
                                                                                                    }, void 0, false, {
                                                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                                                        lineNumber: 592,
                                                                                                        columnNumber: 41
                                                                                                    }, this),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                        className: "py-1",
                                                                                                        children: [
                                                                                                            Number(unitPrice).toFixed(2),
                                                                                                            " ",
                                                                                                            symbol
                                                                                                        ]
                                                                                                    }, void 0, true, {
                                                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                                                        lineNumber: 593,
                                                                                                        columnNumber: 41
                                                                                                    }, this),
                                                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                        className: "py-1",
                                                                                                        children: [
                                                                                                            Number(totalPrice).toFixed(2),
                                                                                                            " ",
                                                                                                            symbol
                                                                                                        ]
                                                                                                    }, void 0, true, {
                                                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                                                        lineNumber: 594,
                                                                                                        columnNumber: 41
                                                                                                    }, this)
                                                                                                ]
                                                                                            }, item.id || idx, true, {
                                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                                lineNumber: 590,
                                                                                                columnNumber: 39
                                                                                            }, this);
                                                                                        }),
                                                                                        (itemsMap[invoice.id] || []).length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                                                colSpan: 4,
                                                                                                className: "py-2 text-slate-500",
                                                                                                children: language === 'ar' ? 'لا توجد عناصر' : 'No items found'
                                                                                            }, void 0, false, {
                                                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                                                lineNumber: 599,
                                                                                                columnNumber: 41
                                                                                            }, this)
                                                                                        }, void 0, false, {
                                                                                            fileName: "[project]/app/invoices/page.tsx",
                                                                                            lineNumber: 598,
                                                                                            columnNumber: 39
                                                                                        }, this)
                                                                                    ]
                                                                                }, void 0, true, {
                                                                                    fileName: "[project]/app/invoices/page.tsx",
                                                                                    lineNumber: 584,
                                                                                    columnNumber: 35
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/app/invoices/page.tsx",
                                                                            lineNumber: 575,
                                                                            columnNumber: 33
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/invoices/page.tsx",
                                                                        lineNumber: 574,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/invoices/page.tsx",
                                                                lineNumber: 553,
                                                                columnNumber: 29
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/invoices/page.tsx",
                                                            lineNumber: 552,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, invoice.id, true, {
                                                    fileName: "[project]/app/invoices/page.tsx",
                                                    lineNumber: 502,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/app/invoices/page.tsx",
                                            lineNumber: 493,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/invoices/page.tsx",
                                    lineNumber: 483,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/invoices/page.tsx",
                                lineNumber: 482,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/invoices/page.tsx",
                        lineNumber: 454,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/invoices/page.tsx",
                lineNumber: 408,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/invoices/page.tsx",
        lineNumber: 406,
        columnNumber: 5
    }, this);
}
_s(InvoicesPageContent, "fCPB0WgS9B5GPzK6m2ZXDaQEvIs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$LanguageContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLanguage"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$AuthContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$guards$2f$useRouteGuard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouteGuard"],
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$contexts$2f$CurrencyContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCurrency"]
    ];
});
_c = InvoicesPageContent;
function InvoicesPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen flex items-center justify-center text-gray-400",
            children: "Loading..."
        }, void 0, false, {
            fileName: "[project]/app/invoices/page.tsx",
            lineNumber: 625,
            columnNumber: 25
        }, void 0),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(InvoicesPageContent, {}, void 0, false, {
            fileName: "[project]/app/invoices/page.tsx",
            lineNumber: 626,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/invoices/page.tsx",
        lineNumber: 625,
        columnNumber: 5
    }, this);
}
_c1 = InvoicesPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "InvoicesPageContent");
__turbopack_context__.k.register(_c1, "InvoicesPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_a48f9ed6._.js.map