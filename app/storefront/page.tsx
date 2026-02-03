'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Clock, Globe, Zap, Search, ShoppingCart } from 'lucide-react';
import { API_BASE_URL } from '../api-config';

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
  image_url?: string | null;
  category_name_en?: string | null;
  category_name_ar?: string | null;
};

type Shop = {
  id: number;
  name: string;
  business_name?: string | null;
  package?: string | null;
  currency_symbol?: string | null;
};

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

export default function StorefrontPage() {
  const searchParams = useSearchParams();
  const previewSlug = (searchParams.get('preview') || '').trim();

  const [language, setLanguage] = useState<'en' | 'ar'>('ar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<StorefrontData | null>(null);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

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
      // IMPORTANT: encode previewSlug to safely handle spaces/special characters
      const safePreviewSlug = previewSlug ? encodeURIComponent(previewSlug) : '';
      const url = safePreviewSlug
        ? `${API_BASE_URL}/public/storefront/preview/${safePreviewSlug}`
        : `${API_BASE_URL}/public/storefront`;

      const response = await fetch(url, {
        headers: safePreviewSlug ? {} : { 'x-shop-domain': host },
      });

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

  useEffect(() => {
    void loadStorefront(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSlug]);

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
  }, [previewSlug]);

  const shopName = data?.shop?.business_name || data?.shop?.name || 'Crown Store';
  const currency = data?.shop?.currency_symbol || (language === 'ar' ? 'ج.م' : 'EGP');

  const filteredProducts = useMemo(() => {
    const list = data?.products || [];
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
  }, [data?.products, query]);

  const cartItems = useMemo(() => {
    const ids = Object.keys(cart).map((k) => Number(k));
    return (data?.products || []).filter((p) => ids.includes(p.id));
  }, [cart, data?.products]);

  const cartCount = useMemo(() => Object.values(cart).reduce((s, n) => s + Number(n || 0), 0), [cart]);
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, p) => sum + Number(p.sell_price || 0) * (cart[p.id] || 0), 0),
    [cartItems, cart]
  );

  const addToCart = (product: Product) => {
    const stock = Number(product.stock_quantity ?? 0);
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
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => void loadStorefront(false)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-[0_0_18px_rgba(34,211,238,0.35)]"
            >
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
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

      {/* Unified Brand Cluster (top-left, fixed, minimal header footprint) */}
      <header className="fixed top-4 left-4 z-50 pointer-events-auto">
        <div className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-cyan-500/25 bg-black/40 backdrop-blur-md shadow-[0_0_28px_rgba(0,243,255,0.14)]">
          <div className="px-4 py-3">
            {/* Top: Crown Icon + Brand */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border border-cyan-500/30 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-[0_0_18px_rgba(0,243,255,0.22)]">
                <Zap className="h-5 w-5 text-cyan-200" />
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

      <main className="pt-28 md:pt-32">
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
                  {language === 'ar' ? 'متجر سايبربانك — متزامن مع المخزن' : 'Cyberpunk Store — Live Inventory Sync'}
                </div>
                <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-purple-200">
                    {shopName}
                  </span>
                </h1>
                <p className="mt-3 text-sm md:text-base text-slate-300 max-w-2xl">
                  {language === 'ar'
                    ? 'ابحث عن قطع الغيار بسهولة — الأسعار والمخزون بيتحدثوا تلقائي من نظام الـ ERP.'
                    : 'Search spare parts easily — pricing and stock are pulled live from the ERP inventory.'}
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
                  placeholder={language === 'ar' ? 'ابحث باسم القطعة / الماركة / SKU...' : 'Search by part name / brand / SKU...'}
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
              {language === 'ar' ? 'قطع الغيار' : 'Spare Parts'}
            </div>
          </div>
          <div className="text-xs text-slate-300 border border-cyan-500/20 bg-white/5 backdrop-blur-xl rounded-full px-3 py-1">
            {language === 'ar' ? `${filteredProducts.length} منتج` : `${filteredProducts.length} items`}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-cyan-500/20 bg-white/5 backdrop-blur-xl p-8 text-slate-300 text-sm">
            {language === 'ar' ? 'مفيش نتائج مطابقة للبحث.' : 'No products match your search.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => {
              const stock = Number(product.stock_quantity ?? 0);
              const inStock = stock > 0;
              const qtyInCart = cart[product.id] || 0;
              const name = language === 'ar' ? product.name_ar : product.name_en;
              const category = language === 'ar' ? product.category_name_ar : product.category_name_en;

              return (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-white/5 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.06)] hover:border-cyan-400/35 transition"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.16),transparent_45%)]" />

                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] tracking-widest uppercase text-purple-200/80">
                          {category || (language === 'ar' ? 'قطع غيار' : 'Spare Part')}
                        </div>
                        <div className="mt-1 font-extrabold text-white truncate">{name}</div>
                        <div className="mt-1 text-xs text-slate-300 truncate">{product.brand || '—'}</div>
                        {product.sku ? (
                          <div className="mt-2 text-[11px] text-slate-400">
                            SKU: <span className="text-slate-200">{product.sku}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-lg font-black text-cyan-200">
                          {Number(product.sell_price || 0).toFixed(2)}{' '}
                          <span className="text-xs text-cyan-200/80">{currency}</span>
                        </div>
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
                    {(Number(p.sell_price || 0) * (cart[p.id] || 0)).toFixed(2)} <span className="text-xs">{currency}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-cyan-500/15 flex items-center justify-between">
              <div className="text-sm text-slate-300">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
              <div className="text-xl font-black text-cyan-100">
                {cartTotal.toFixed(2)} <span className="text-xs text-cyan-200/80">{currency}</span>
              </div>
            </div>
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

