'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Clock, Globe, Search, ShoppingCart, Package, X, ExternalLink, MapPin } from 'lucide-react';
import { NeonCrownIcon } from '../components/NeonCrownIcon';
import { apiFetch, apiRequest } from '../contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { getDisplayStock } from '@/lib/stock';

type Category = {
  id: number;
  name_en: string;
  name_ar: string;
};

type Product = {
  id: number;
  name_en: string;
  name_ar: string;
  brand?: string | null;
  sku?: string | null;
  sell_price: number;
  stock_quantity?: number;
  available_stock?: number;
  image_url?: string | null;
  category_name_en?: string | null;
  category_name_ar?: string | null;
  description_short?: string | null;
  description_long?: string | null;
  warranty_text?: string | null;
  return_policy_text?: string | null;
  specs_json?: string | null;
  gallery_urls_json?: string | null;
};

type Shop = {
  id: number;
  name: string;
  business_name?: string | null;
  business_name_ar?: string | null;
  business_name_en?: string | null;
  activity_type?: string | null;
  package?: string | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
};

type StorefrontContext = {
  storeName?: string | null;
  ownerName?: string | null;
  activityType?: string | null;
  language?: string | null;
  planFeatures?: Record<string, boolean>;
};

function normalizeActivityKey(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveActivityLabel(value: string | null | undefined, lang: 'ar' | 'en'): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = normalizeActivityKey(raw);
  const map: Array<{ keys: string[]; ar: string; en: string }> = [
    { keys: ['spare parts', 'spare part', 'auto parts', 'auto part', 'auto parts store', 'auto parts shop', 'auto_parts', 'spare_parts', 'قطع غيار', 'قطع الغيار'], ar: 'قطع غيار', en: 'Spare Parts' },
    { keys: ['makeup and perfume', 'makeup & perfume', 'makeup perfume', 'perfume', 'cosmetics', 'makeup', 'عطور', 'ميكاب وعطور', 'مكياج وعطور', 'makeup and perfumes'], ar: 'مكياج وعطور', en: 'Makeup & Perfume' },
    { keys: ['pharmacy', 'drugstore', 'صيدلية'], ar: 'صيدلية', en: 'Pharmacy' },
    { keys: ['supermarket', 'grocery', 'grocery store', 'سوبر ماركت', 'بقالة'], ar: 'سوبر ماركت', en: 'Supermarket' },
    { keys: ['decor', 'furniture', 'ديكور', 'مفروشات'], ar: 'ديكور ومفروشات', en: 'Decor & Furniture' },
  ];
  const hit = map.find((row) => row.keys.some((k) => normalizeActivityKey(k) === key));
  if (hit) return lang === 'ar' ? hit.ar : hit.en;
  return raw;
}

function getTagline(businessType: string | null | undefined, lang: 'ar' | 'en'): string {
  const label = String(businessType || '').trim();
  if (label) {
    return lang === 'ar'
      ? `ابحث عن ${label} بسهولة — الأسعار والمخزون بيتحدثوا تلقائيًا من نظام الـ ERP.`
      : `Find ${label} easily — prices & stock sync automatically from the ERP.`;
  }
  return lang === 'ar'
    ? 'ابحث عن المنتجات بسهولة — الأسعار والمخزون بيتحدثوا تلقائيًا من نظام الـ ERP.'
    : 'Find products easily — prices & stock sync automatically from the ERP.';
}

type StorefrontData = {
  preview?: boolean;
  domain?: string | null;
  shop: Shop;
  categories?: Category[];
  products: Product[];
};

function LiveClock({ locale, size = 'md' }: { locale: string; size?: 'sm' | 'md' }) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hhmm = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const hhmmss = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div
      className={
        size === 'sm'
          ? 'inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-black/35 backdrop-blur-md px-2.5 py-1.5 shadow-[0_0_18px_rgba(0,243,255,0.14)]'
          : 'inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/40 backdrop-blur-md px-3 py-2 shadow-[0_0_18px_rgba(0,243,255,0.18)]'
      }
    >
      <Clock className={size === 'sm' ? 'h-3.5 w-3.5 text-cyan-200/80' : 'h-4 w-4 text-cyan-200/80 hidden sm:block'} />
      <span className="inline-flex items-center gap-2">
        <span className={size === 'sm' ? 'relative flex h-2 w-2' : 'relative flex h-2.5 w-2.5'}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50" />
          <span
            className={
              size === 'sm'
                ? 'relative inline-flex rounded-full h-2 w-2 bg-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.65)]'
                : 'relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.75)]'
            }
          />
        </span>
        {size === 'md' ? <span className="text-[11px] text-cyan-200/80 font-semibold hidden md:inline">LIVE</span> : null}
      </span>
      <span className={size === 'sm' ? 'font-mono text-cyan-100 text-xs tracking-wider' : 'font-mono text-cyan-100 text-sm tracking-wider'}>
        {size === 'sm' ? (
          <span>{hhmm}</span>
        ) : (
          <>
            <span className="md:hidden">{hhmm}</span>
            <span className="hidden md:inline">{hhmmss}</span>
          </>
        )}
      </span>
    </div>
  );
}

function StorefrontPageContent() {
  const searchParams = useSearchParams();
  const previewSlug = (searchParams.get('preview') || '').trim();
  const domainParam = (searchParams.get('domain') || '').trim();
  const shopIdParam = searchParams.get('shopId');

  const [language, setLanguage] = useState<'en' | 'ar'>('ar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<StorefrontData | null>(null);
  const [storeContext, setStoreContext] = useState<StorefrontContext | null>(null);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: number; publicCode: string; phone: string } | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    phone: '',
    governorate: '',
    city: '',
    address: '',
    notes: '',
    paymentMethod: 'cash_on_delivery',
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    valid: boolean;
    discountTotal: number;
    totalBeforeDiscount: number;
    totalAfterDiscount: number;
    coupon?: { id: number; code: string; type: string; value: number };
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadStorefront = async (silent = false) => {
    try {
      setError(null);

      const host = typeof window !== 'undefined' ? window.location.host : '';
      let url: string;
      const headers: Record<string, string> = {};

      if (domainParam) {
        url = `/public/storefront/by-domain?domain=${encodeURIComponent(domainParam)}`;
      } else if (shopIdParam && /^\d+$/.test(String(shopIdParam))) {
        url = `/public/storefront/preview/${encodeURIComponent(String(shopIdParam))}-shop`;
      } else if (previewSlug) {
        url = `/public/storefront/preview/${encodeURIComponent(previewSlug)}`;
      } else {
        url = `/public/storefront`;
        headers['x-shop-domain'] = host;
      }

      const response = await apiFetch(url, { headers });

      const raw = await response.text();
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = null;
      }
      if (!response.ok) {
        throw new Error(payload?.error || 'Storefront not available');
      }
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid storefront response');
      }

      setData(payload as StorefrontData);
      setLastUpdatedAt(Date.now());
    } catch (e: any) {
      setData(null);
      setError(e?.message || 'Storefront not available');
    } finally {
      setLoading(false);
    }
  };

  const loadStoreContext = async (shopId: number, domain?: string | null) => {
    try {
      const q = new URLSearchParams();
      q.set('shopId', String(shopId));
      if (domain) q.set('domain', domain);
      q.set('lang', language);
      const ctx = await apiRequest(`/storefront/shop?${q.toString()}`);
      setStoreContext(ctx || null);
    } catch {
      setStoreContext(null);
    }
  };

  useEffect(() => {
    void loadStorefront(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSlug, domainParam, shopIdParam]);

  useEffect(() => {
    if (!data?.shop?.id) return;
    void loadStoreContext(data.shop.id, data?.domain || domainParam || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.shop?.id, data?.domain, domainParam, language]);

  useEffect(() => {
    // Real-time sync (poll inventory directly, no sync jobs)
    let alive = true;
    const t = window.setInterval(() => {
      if (!alive) return;
      if (document.visibilityState !== 'visible') return;
      void loadStorefront(true);
    }, 8000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSlug, domainParam, shopIdParam]);

  const shopName =
    language === 'ar'
      ? storeContext?.storeName ||
        data?.shop?.business_name_ar ||
        data?.shop?.business_name ||
        data?.shop?.business_name_en ||
        data?.shop?.name ||
        'Crown Store'
      : storeContext?.storeName ||
        data?.shop?.business_name_en ||
        data?.shop?.business_name ||
        data?.shop?.business_name_ar ||
        data?.shop?.name ||
        'Crown Store';
  const currencyCode = data?.shop?.currency_code || 'EGP';
  const currencySymbol = data?.shop?.currency_symbol || null;
  const rawBusinessType =
    storeContext?.activityType ||
    data?.shop?.activity_type ||
    (data?.shop as any)?.businessType ||
    (data?.shop as any)?.category ||
    '';
  const defaultBusinessLabel = language === 'ar' ? 'المنتجات' : 'Products';
  const businessTypeLabel = resolveActivityLabel(rawBusinessType, language) || defaultBusinessLabel;

  const products = Array.isArray(data?.products) ? data.products : [];

  const filteredProducts = useMemo(() => {
    const list = products;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const hay = [
        p.name_en,
        p.name_ar,
        p.brand || '',
        p.sku || '',
        p.category_name_en || '',
        p.category_name_ar || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, query]);
  const emptyStateText = query.trim()
    ? language === 'ar'
      ? 'مفيش نتائج مطابقة للبحث.'
      : 'No products match your search.'
    : language === 'ar'
      ? businessTypeLabel === defaultBusinessLabel
        ? 'لا توجد منتجات حالياً.'
        : `لا توجد منتجات ${businessTypeLabel} حالياً.`
      : businessTypeLabel === defaultBusinessLabel
        ? 'No products available.'
        : `No ${businessTypeLabel} available.`;

  const cartItems = useMemo(() => {
    const ids = Object.keys(cart).map((k) => Number(k));
    return products.filter((p) => ids.includes(p.id));
  }, [cart, products]);

  const cartCount = useMemo(() => Object.values(cart).reduce((s, n) => s + Number(n || 0), 0), [cart]);
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, p) => sum + Number(p.sell_price || 0) * (cart[p.id] || 0), 0),
    [cartItems, cart]
  );
  const checkoutTotal = appliedCoupon?.valid ? appliedCoupon.totalAfterDiscount : cartTotal;

  const addToCart = (product: Product) => {
    const stock = getDisplayStock(product);
    if (stock <= 0) {
      showToast(language === 'ar' ? 'المنتج غير متوفر حالياً' : 'Out of stock');
      return;
    }
    setCart((prev) => {
      const current = prev[product.id] || 0;
      const nextQty = Math.min(current + 1, stock);
      return { ...prev, [product.id]: nextQty };
    });
    showToast(language === 'ar' ? 'تمت الإضافة للسلة' : 'Added to cart');
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clearCart = () => setCart({});

  const lastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US')
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06070b] text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.14),transparent_55%)]" />
        <div className="relative text-cyan-200 text-sm border border-cyan-500/30 bg-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
          {language === 'ar' ? 'جاري تحميل المتجر...' : 'Loading storefront...'}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#06070b] text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.14),transparent_55%)]" />
        <div className="relative max-w-lg w-[92vw] border border-red-500/30 bg-red-500/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_30px_rgba(239,68,68,0.12)]">
          <div className="text-red-200 font-bold text-xl mb-2">
            {language === 'ar' ? 'المتجر غير متاح' : 'Storefront Not Available'}
          </div>
          <div className="text-slate-300 text-sm">{error || (language === 'ar' ? 'حاول مرة تانية.' : 'Please try again.')}</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void loadStorefront(false)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-[0_0_18px_rgba(34,211,238,0.35)]"
            >
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
            <button
              onClick={() => window.location.assign('/storefront?shopId=1')}
              className="px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/10"
            >
              {language === 'ar' ? 'فتح متجر تجريبي' : 'Open demo store'}
            </button>
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/10"
            >
              {language === 'en' ? 'AR' : 'EN'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070b] text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(34,211,238,0.22),transparent_45%),radial-gradient(circle_at_50%_95%,rgba(236,72,153,0.14),transparent_55%)]" />
      <div className="fixed inset-0 -z-10 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* CROWN SERVICES widget - right side, fixed, safe margins */}
      <header className="fixed top-4 right-4 z-40 pointer-events-auto w-[calc(100vw-2rem)] max-w-[200px] sm:max-w-[220px]">
        <div className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-cyan-500/25 bg-black/40 backdrop-blur-md shadow-[0_0_28px_rgba(0,243,255,0.14)]">
          <div className="px-4 py-3">
            {/* Top: Crown Icon + Brand */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-cyan-500/30 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-[0_0_18px_rgba(0,243,255,0.22)]">
                  <NeonCrownIcon size={24} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-black tracking-[0.28em] uppercase leading-none">
                  <span className="text-fuchsia-200">CROWN</span> <span className="text-slate-100">SERVICES</span>
                </div>
              </div>
            </div>

            {/* Bottom: Live Clock + Language Switcher */}
            <div className="mt-3 flex flex-col items-start gap-2">
              <LiveClock locale={language === 'ar' ? 'ar-EG' : 'en-US'} size="sm" />
              <div className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-black/35 backdrop-blur-md p-1 shadow-[0_0_18px_rgba(0,243,255,0.10)]">
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                    language === 'ar' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'
                  }`}
                >
                  AR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                    language === 'en' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Order tracking: physical left so RTL does not stack with top-right header */}
      <aside className="hidden md:flex fixed z-[35] top-24 left-4 w-[min(220px,calc(100vw-2rem))] flex-col gap-3 pointer-events-auto">
        <div className="rounded-2xl border border-cyan-500/25 bg-black/45 backdrop-blur-xl p-4 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
          <div className="flex items-center gap-2 text-cyan-200 font-bold text-sm mb-2">
            <MapPin className="h-4 w-4 shrink-0" />
            {language === 'ar' ? 'متابعة الطلبات' : 'Order tracking'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            {language === 'ar'
              ? 'ادخل كود التتبع ورقم الهاتف لمتابعة حالة الطلب في أي وقت.'
              : 'Enter your tracking code and phone to see order status anytime.'}
          </p>
          <Link
            href={`/track?shopId=${data.shop.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/90 to-fuchsia-600/90 text-white text-sm font-semibold hover:opacity-95 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
          >
            <Package className="h-4 w-4" />
            {language === 'ar' ? 'تتبع الطلب' : 'Track order'}
          </Link>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-cyan-500/20 bg-[#06070b]/95 backdrop-blur-md px-3 py-2.5 safe-area-pb">
        <Link
          href={`/track?shopId=${data.shop.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/90 to-fuchsia-600/90 text-white text-sm font-semibold"
        >
          <Package className="h-4 w-4" />
          {language === 'ar' ? 'متابعة الطلب' : 'Track order'}
        </Link>
      </div>

      <main className="pt-28 md:pt-32 pr-44 sm:pr-52 md:pr-56 md:pl-[240px] pb-20 md:pb-16">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-6 md:p-10 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-xs text-cyan-200/80 border border-cyan-500/20 bg-black/20 px-3 py-1 rounded-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  {language === 'ar' ? `متجر ${shopName} — متزامن مع المخزن` : `${shopName} Store — Live Inventory Sync`}
                </div>
                <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-purple-200">
                    {shopName}
                  </span>
                </h1>
                <p className="mt-3 text-sm md:text-base text-slate-300 max-w-2xl">
                  {getTagline(businessTypeLabel, language)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 text-xs text-slate-200/80 border border-cyan-500/20 bg-black/20 px-3 py-1 rounded-full">
                  <Globe className="h-4 w-4 text-cyan-200" />
                  {language === 'ar' ? 'عزل بيانات لكل متجر' : 'Strict tenant isolation'}
                </div>
                <div className="hidden md:inline-flex items-center gap-2 text-xs text-slate-200/80 border border-cyan-500/20 bg-black/20 px-3 py-1 rounded-full">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse" />
                  {language === 'ar' ? `آخر تحديث: ${lastUpdatedLabel}` : `Updated: ${lastUpdatedLabel}`}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mt-6 md:mt-8 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-cyan-200/70" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث باسم المنتج / الماركة / SKU...' : 'Search by product name / brand / SKU...'}
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-cyan-500/25 bg-black/30 backdrop-blur-xl text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                />
              </div>
              <button
                onClick={() => {
                  setQuery('');
                  showToast(language === 'ar' ? 'تم مسح البحث' : 'Search cleared');
                }}
                className="h-12 px-5 rounded-2xl border border-purple-500/30 bg-white/5 hover:bg-white/10 text-purple-100 text-sm font-semibold"
              >
                {language === 'ar' ? 'مسح' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
        </section>

        {/* Products */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-slate-400">{language === 'ar' ? 'الكتالوج' : 'Catalog'}</div>
            <div className="text-xl md:text-2xl font-extrabold text-cyan-100">
              {businessTypeLabel}
            </div>
          </div>
          <div className="text-xs text-slate-300 border border-cyan-500/20 bg-white/5 backdrop-blur-xl rounded-full px-3 py-1">
            {language === 'ar' ? `${filteredProducts.length} منتج` : `${filteredProducts.length} items`}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-8 text-slate-300 text-sm">
            {emptyStateText}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const stock = getDisplayStock(product);
              const inStock = stock > 0;
              const qtyInCart = cart[product.id] || 0;
              const name = language === 'ar' ? product.name_ar : product.name_en;
              const category = language === 'ar' ? product.category_name_ar : product.category_name_en;
              const shortDesc = product.description_short || product.description_long || '';
              const warrantyText = product.warranty_text || '';
              const returnPolicyText = product.return_policy_text || '';

              return (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-white/5 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.06)] hover:border-cyan-400/35 transition"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.16),transparent_45%)]" />

                  {/* Product image or placeholder */}
                  <div className="relative h-40 sm:h-44 bg-black/30 border-b border-cyan-500/10 flex items-center justify-center overflow-hidden">
                    {product.image_url && String(product.image_url).trim().length > 3 ? (
                      <img
                        src={product.image_url}
                        alt={language === 'ar' ? product.name_ar : product.name_en}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex flex-col items-center justify-center gap-1 text-slate-500 ${product.image_url && String(product.image_url).trim().length > 3 ? 'hidden' : ''}`}
                    >
                      <Package className="h-12 w-12 text-cyan-500/40" />
                      <span className="text-xs">{language === 'ar' ? 'لا توجد صورة' : 'No image'}</span>
                    </div>
                  </div>

                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] tracking-widest uppercase text-purple-200/80">
                          {category || businessTypeLabel}
                        </div>
                        <div className="mt-1 font-extrabold text-white truncate">{name}</div>
                        <div className="mt-1 text-xs text-slate-300 truncate">{product.brand || '—'}</div>
                        {product.sku ? (
                          <div className="mt-2 text-[11px] text-slate-400">
                            SKU: <span className="text-slate-200">{product.sku}</span>
                          </div>
                        ) : null}
                        {shortDesc ? (
                          <div
                            className="mt-2 text-[11px] text-slate-400"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {shortDesc}
                          </div>
                        ) : null}
                        {(warrantyText || returnPolicyText) && (
                          <div className="mt-2 space-y-1 text-[10px] text-slate-400">
                            {warrantyText && (
                              <div className="truncate">
                                {language === 'ar' ? 'الضمان: ' : 'Warranty: '}
                                <span className="text-slate-300">{warrantyText}</span>
                              </div>
                            )}
                            {returnPolicyText && (
                              <div className="truncate">
                                {language === 'ar' ? 'الإرجاع: ' : 'Return: '}
                                <span className="text-slate-300">{returnPolicyText}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {(product as any).discount_active && (product as any).discount_type && (product as any).discount_type !== 'none' ? (
                          <>
                            <div className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/40 font-bold">
                              {(product as any).discount_type === 'percent'
                                ? (language === 'ar' ? `خصم ${(product as any).discount_value}%` : `${(product as any).discount_value}% off`)
                                : (language === 'ar' ? `خصم ${(product as any).discount_value} ج.م` : `${(product as any).discount_value} EGP off`)}
                            </div>
                            <div className="text-sm text-slate-500 line-through">
                              {formatCurrency((product as any).original_sell_price ?? product.sell_price ?? 0, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}
                            </div>
                            <div className="text-lg font-black text-cyan-200">
                              {formatCurrency(product.sell_price || 0, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}
                            </div>
                            <div className="text-[11px] text-green-400">
                              {language === 'ar'
                                ? `وفرت ${formatCurrency(((product as any).original_sell_price ?? product.sell_price ?? 0) - (product.sell_price || 0), 'ar', currencyCode, currencySymbol)}`
                                : `Save ${formatCurrency(((product as any).original_sell_price ?? product.sell_price ?? 0) - (product.sell_price || 0), 'en', currencyCode, currencySymbol)}`}
                            </div>
                          </>
                        ) : (
                          <div className="text-lg font-black text-cyan-200">
                            {formatCurrency(product.sell_price || 0, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}
                          </div>
                        )}
                        <div
                          className={`text-[10px] px-2 py-1 rounded-full border ${
                            inStock
                              ? 'border-green-500/30 bg-green-500/10 text-green-200'
                              : 'border-red-500/30 bg-red-500/10 text-red-200'
                          }`}
                        >
                          {inStock
                            ? language === 'ar'
                              ? `متوفر (${stock})`
                              : `In stock (${stock})`
                            : language === 'ar'
                              ? 'غير متوفر'
                              : 'Out of stock'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!inStock}
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(236,72,153,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {language === 'ar' ? 'اشتري دلوقتي' : 'Buy Now'}
                      </button>

                      {qtyInCart > 0 ? (
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="h-11 px-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-red-100 text-xs font-semibold"
                          title={language === 'ar' ? 'إزالة من السلة' : 'Remove from cart'}
                        >
                          {language === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          disabled={!inStock}
                          className="h-11 px-3 rounded-xl border border-cyan-500/25 bg-white/5 hover:bg-white/10 text-cyan-100 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          title={language === 'ar' ? 'إضافة للسلة' : 'Add to cart'}
                        >
                          +{language === 'ar' ? 'سلة' : 'Cart'}
                        </button>
                      )}
                    </div>

                    {qtyInCart > 0 ? (
                      <div className="mt-3 text-[11px] text-slate-300">
                        {language === 'ar' ? `في السلة: ${qtyInCart}` : `In cart: ${qtyInCart}`}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </section>
      </main>

      {/* Cart Panel */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm">
          <div className="rounded-2xl border border-cyan-500/25 bg-black/35 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.18)] overflow-hidden">
            <div className="px-5 py-4 border-b border-cyan-500/15 flex items-center justify-between">
              <div className="font-extrabold text-cyan-100 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {language === 'ar' ? 'السلة' : 'Cart'} <span className="text-xs text-cyan-200/80">({cartCount})</span>
              </div>
              <button
                onClick={clearCart}
                className="text-xs text-red-200 border border-red-500/25 bg-red-500/10 px-3 py-1 rounded-full hover:bg-red-500/15"
              >
                {language === 'ar' ? 'مسح' : 'Clear'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto px-5 py-4 space-y-2">
              {cartItems.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate text-slate-100 font-semibold">
                      {language === 'ar' ? p.name_ar : p.name_en}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {language === 'ar' ? 'الكمية' : 'Qty'}: {cart[p.id] || 0}
                    </div>
                  </div>
                  <div className="text-cyan-200 font-bold">
                    {formatCurrency(Number(p.sell_price || 0) * (cart[p.id] || 0), language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-cyan-500/15 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
                <div className="text-xl font-black text-cyan-100">
                  {formatCurrency(cartTotal, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}
                </div>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(236,72,153,0.2)]"
              >
                {language === 'ar' ? 'اطلب الآن' : 'Order Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/25 bg-[#0a0f18] shadow-[0_0_40px_rgba(34,211,238,0.15)]">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-[#0a0f18]">
              <h3 className="text-lg font-bold text-cyan-100">
                {language === 'ar' ? 'بيانات الطلب' : 'Order Details'}
              </h3>
              <button
                onClick={() => {
                  setCheckoutOpen(false);
                  setCouponCode('');
                  setAppliedCoupon(null);
                  setCouponError(null);
                }}
                className="p-2 rounded-lg border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!data?.shop?.id) return;
                setCheckoutSubmitting(true);
                try {
                  const payload = {
                    shopId: data.shop.id,
                    domain: data?.domain || domainParam || undefined,
                    lang: language,
                    customerName: checkoutForm.customerName.trim(),
                    phone: checkoutForm.phone.trim(),
                    governorate: checkoutForm.governorate.trim(),
                    city: checkoutForm.city.trim(),
                    address: checkoutForm.address.trim(),
                    notes: checkoutForm.notes.trim() || undefined,
                    paymentMethod: checkoutForm.paymentMethod,
                    items: cartItems.map((p) => ({
                      productId: p.id,
                      id: p.id,
                      nameSnapshot: language === 'ar' ? p.name_ar : p.name_en,
                      quantity: cart[p.id] || 1,
                    })),
                    couponCode: appliedCoupon?.valid ? appliedCoupon.coupon?.code || couponCode.trim() : undefined,
                  };
                  const json = await apiRequest('/storefront/orders', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  setCheckoutOpen(false);
                  setCart({});
                  setCheckoutForm({ customerName: '', phone: '', governorate: '', city: '', address: '', notes: '', paymentMethod: 'cash_on_delivery' });
                  setCouponCode('');
                  setAppliedCoupon(null);
                  setCouponError(null);
                  setOrderSuccess({
                    orderId: json.orderId,
                    publicCode: json.publicCode || json.public_code || '',
                    phone: checkoutForm.phone.trim(),
                  });
                } catch (err: any) {
                  showToast(err?.message || (language === 'ar' ? 'حدث خطأ' : 'Something went wrong'));
                } finally {
                  setCheckoutSubmitting(false);
                }
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'الاسم *' : 'Name *'}
                </label>
                <input
                  required
                  value={checkoutForm.customerName}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'رقم الهاتف *' : 'Phone *'}
                </label>
                <input
                  required
                  type="tel"
                  pattern="[\d\s\+\-\(\)]{8,20}"
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                  placeholder={language === 'ar' ? 'مثال: 01012345678' : 'e.g. 01012345678'}
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'المحافظة *' : 'Governorate *'}
                </label>
                <input
                  required
                  value={checkoutForm.governorate}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, governorate: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'المدينة/المنطقة *' : 'City/Area *'}
                </label>
                <input
                  required
                  value={checkoutForm.city}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'العنوان بالتفصيل *' : 'Address *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-500/25 bg-black/30 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-cyan-500/25 bg-black/30 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'كود القسيمة' : 'Coupon code'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError(null);
                      setAppliedCoupon(null);
                    }}
                    placeholder={language === 'ar' ? 'أدخل الكود' : 'Enter code'}
                    className="flex-1 h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={couponApplying || !couponCode.trim()}
                    onClick={async () => {
                      if (!data?.shop?.id || !couponCode.trim()) return;
                      setCouponApplying(true);
                      setCouponError(null);
                      try {
                        const res = await apiRequest('/public/storefront/checkout/apply-coupon', {
                          method: 'POST',
                          body: JSON.stringify({
                            shopId: data.shop.id,
                            code: couponCode.trim(),
                            orderTotal: cartTotal,
                            lang: language,
                          }),
                        });
                        const r = res as { valid?: boolean; error?: string; discountTotal?: number; totalBeforeDiscount?: number; totalAfterDiscount?: number; coupon?: { id: number; code: string; type: string; value: number } };
                        if (r.valid) {
                          setAppliedCoupon({
                            valid: true,
                            discountTotal: r.discountTotal ?? 0,
                            totalBeforeDiscount: r.totalBeforeDiscount ?? cartTotal,
                            totalAfterDiscount: r.totalAfterDiscount ?? cartTotal,
                            coupon: r.coupon,
                          });
                          setCouponError(null);
                          showToast(language === 'ar' ? 'تم تطبيق القسيمة' : 'Coupon applied');
                        } else {
                          setAppliedCoupon(null);
                          setCouponError(r.error || (language === 'ar' ? 'كود غير صالح' : 'Invalid coupon'));
                        }
                      } catch (err: any) {
                        setAppliedCoupon(null);
                        setCouponError(err?.message || (language === 'ar' ? 'فشل التحقق' : 'Verification failed'));
                      } finally {
                        setCouponApplying(false);
                      }
                    }}
                    className="h-11 px-4 rounded-xl border border-cyan-500/30 bg-cyan-500/20 text-cyan-200 font-semibold hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {couponApplying ? (language === 'ar' ? 'جاري...' : 'Applying...') : language === 'ar' ? 'تطبيق' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-1 text-xs text-red-300">{couponError}</p>
                )}
                {appliedCoupon?.valid && (
                  <p className="mt-1 text-xs text-green-300">
                    {language === 'ar' ? `خصم: ${formatCurrency(appliedCoupon.discountTotal, 'ar', currencyCode, currencySymbol)}` : `Discount: ${formatCurrency(appliedCoupon.discountTotal, 'en', currencyCode, currencySymbol)}`}
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{language === 'ar' ? 'الإجمالي قبل الخصم' : 'Subtotal'}</span>
                  <span className="text-cyan-200 font-semibold">{formatCurrency(cartTotal, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}</span>
                </div>
                {appliedCoupon?.valid && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{language === 'ar' ? 'خصم القسيمة' : 'Coupon discount'}</span>
                      <span className="text-green-300 font-semibold">-{formatCurrency(appliedCoupon.discountTotal, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-cyan-500/15">
                      <span className="text-cyan-100 font-bold">{language === 'ar' ? 'الإجمالي النهائي' : 'Total'}</span>
                      <span className="text-cyan-200 font-bold">{formatCurrency(checkoutTotal, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}</span>
                    </div>
                  </>
                )}
                {!appliedCoupon?.valid && (
                  <div className="flex justify-between text-base pt-2 border-t border-cyan-500/15">
                    <span className="text-cyan-100 font-bold">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className="text-cyan-200 font-bold">{formatCurrency(cartTotal, language === 'ar' ? 'ar' : 'en', currencyCode, currencySymbol)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-cyan-200/80 mb-1">
                  {language === 'ar' ? 'طريقة الدفع' : 'Payment'}
                </label>
                <select
                  value={checkoutForm.paymentMethod}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 px-3 text-slate-100"
                >
                  <option value="cash_on_delivery">
                    {language === 'ar' ? 'عند الاستلام' : 'Cash on delivery'}
                  </option>
                  <option value="transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</option>
                  <option value="other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="flex-1 h-12 rounded-xl border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold disabled:opacity-60"
                >
                  {checkoutSubmitting
                    ? language === 'ar'
                      ? 'جاري الإرسال...'
                      : 'Submitting...'
                    : language === 'ar'
                      ? 'تأكيد الطلب'
                      : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-green-500/30 bg-[#0a0f18] p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
            <div className="text-center mb-6">
              <div className="inline-flex h-16 w-16 rounded-full bg-green-500/20 items-center justify-center mb-4">
                <Package className="h-8 w-8 text-green-300" />
              </div>
              <h3 className="text-xl font-bold text-green-200 mb-2">
                {language === 'ar' ? 'تم إنشاء طلبك بنجاح' : 'Your order was created successfully'}
              </h3>
              <p className="text-slate-300 text-sm mb-2">
                {language === 'ar' ? `رقم الطلب: #${orderSuccess.orderId}` : `Order #: ${orderSuccess.orderId}`}
              </p>
              <p className="text-cyan-200 font-mono font-bold text-lg">
                {language === 'ar' ? `كود التتبع: ${orderSuccess.publicCode}` : `Tracking code: ${orderSuccess.publicCode}`}
              </p>
            </div>
            <a
              href={`/track?code=${encodeURIComponent(orderSuccess.publicCode)}&phone=${encodeURIComponent(orderSuccess.phone)}&shopId=${data.shop.id}`}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white font-bold mb-3"
            >
              <ExternalLink className="h-4 w-4" />
              {language === 'ar' ? 'تتبع الطلب' : 'Track Order'}
            </a>
            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full h-11 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm font-semibold"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-50">
          <div className="px-4 py-3 rounded-2xl border border-cyan-500/25 bg-black/35 backdrop-blur-xl text-cyan-100 text-sm shadow-[0_0_18px_rgba(34,211,238,0.18)]">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <StorefrontPageContent />
    </Suspense>
  );
}

