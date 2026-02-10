'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest } from '../contexts/AuthContext';

const STORAGE_KEY = 'crown-active-shop-id';

interface Shop {
  id: number;
  name: string;
  business_name?: string;
  domain?: string | null;
}

export function ShopSwitcher() {
  const { language } = useLanguage();
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setActiveShopId(localStorage.getItem(STORAGE_KEY));
    const handler = () => setActiveShopId(localStorage.getItem(STORAGE_KEY));
    window.addEventListener('crown-shop-changed', handler);
    return () => window.removeEventListener('crown-shop-changed', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/admin/shops');
        if (!cancelled && Array.isArray(data)) setShops(data);
      } catch {
        if (!cancelled) setShops([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectShop = (id: number) => {
    const idStr = String(id);
    setActiveShopId(idStr);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, idStr);
    }
    setOpen(false);
    window.dispatchEvent(new Event('crown-shop-changed'));
  };

  const clearShop = () => {
    setActiveShopId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setOpen(false);
    window.dispatchEvent(new Event('crown-shop-changed'));
  };

  const displayName = (s: Shop) =>
    s.business_name || s.name || s.domain || `#${s.id}`;

  const activeShop = shops.find((s) => String(s.id) === activeShopId);

  if (loading || shops.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-black/25 px-3 py-1.5 text-[11px] text-cyan-200 shadow-[0_0_14px_rgba(0,243,255,0.10)]"
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">
          {activeShop
            ? displayName(activeShop)
            : language === 'ar'
              ? 'اختر المتجر'
              : 'Select shop'}
        </span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] max-h-[220px] overflow-y-auto rounded-lg border border-cyan-500/30 bg-[#0b1220] py-1 shadow-xl">
            <button
              type="button"
              onClick={clearShop}
              className={`w-full text-left px-3 py-2 text-xs ${!activeShopId ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`}
            >
              {language === 'ar' ? '— بدون متجر —' : '— No shop —'}
            </button>
            {shops.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectShop(s.id)}
                className={`w-full text-left px-3 py-2 text-xs ${activeShopId === String(s.id) ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`}
              >
                {displayName(s)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function getActiveShopId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
