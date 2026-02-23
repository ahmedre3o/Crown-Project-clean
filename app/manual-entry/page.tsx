'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { BarcodeScanner } from '../components/BarcodeScanner';

interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  qr_code?: string;
  buy_price: number;
  sell_price: number;
  stock_quantity: number;
  min_stock_level: number;
}

export default function ManualEntryPage() {
  const { t, direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'manual_entry', effectiveRole });
  const rawPackage = (user as any)?.package;
  const hasPackageString = typeof rawPackage === 'string' && rawPackage.trim().length > 0;
  const hasPackageObject = rawPackage && typeof rawPackage === 'object';
  const maxProducts = hasPackageObject ? ((rawPackage as any)?.maxProducts ?? 500) : 500;
  const showPackageUnavailable = !hasPackageString && !hasPackageObject;
  const [form, setForm] = useState({
    nameEn: '',
    nameAr: '',
    brand: '',
    sku: '',
    barcode: '',
    qrCode: '',
    buyPrice: '',
    sellPrice: '',
    stockQuantity: '',
    minStockLevel: '',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await apiRequest('/products');
      setProducts(data);
    } catch (err) {
      // ignore
    }
  };

  const handleBarcodeDetected = (value: string) => {
    setForm((prev) => ({ ...prev, barcode: value }));
    const existing = products.find(
      (p) => p.barcode === value || p.sku === value || p.qr_code === value
    );
    if (existing) {
      setForm({
        nameEn: existing.name_en,
        nameAr: existing.name_ar,
        brand: existing.brand || '',
        sku: existing.sku || '',
        barcode: existing.barcode || value,
        qrCode: existing.qr_code || '',
        buyPrice: String(existing.buy_price),
        sellPrice: String(existing.sell_price),
        stockQuantity: String(existing.stock_quantity),
        minStockLevel: String(existing.min_stock_level),
      });
    }
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    if (!form.nameEn || !form.sellPrice) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المنتج وسعر البيع' : 'Name and sell price are required.');
      return;
    }

    try {
      setSaving(true);
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          nameEn: form.nameEn,
          nameAr: form.nameAr || form.nameEn,
          brand: form.brand,
          sku: form.sku,
          barcode: form.barcode,
          qrCode: form.qrCode,
          buyPrice: parseFloat(form.buyPrice || '0'),
          sellPrice: parseFloat(form.sellPrice),
          stockQuantity: parseInt(form.stockQuantity || '0', 10),
          minStockLevel: parseInt(form.minStockLevel || '5', 10),
        }),
      });
      setMessage(language === 'ar' ? 'تم حفظ المنتج' : 'Product saved successfully.');
      setForm({
        nameEn: '',
        nameAr: '',
        brand: '',
        sku: '',
        barcode: '',
        qrCode: '',
        buyPrice: '',
        sellPrice: '',
        stockQuantity: '',
        minStockLevel: '',
      });
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('manual.title')}</h1>
        <div className="neon-card rounded-xl p-6">
          {showPackageUnavailable && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              {language === 'ar' ? 'بيانات الباقة غير متاحة حالياً.' : 'Package data unavailable.'}
            </div>
          )}
          {hasPackageObject && (
            <div className="mb-4 text-xs text-slate-400">
              {language === 'ar' ? `حد المنتجات: ${maxProducts}` : `Max products: ${maxProducts}`}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">
              {message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={t('inventory.productName')}
              value={form.nameEn}
              onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={`${t('inventory.productName')} (AR)`}
              value={form.nameAr}
              onChange={(e) => setForm((prev) => ({ ...prev, nameAr: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={t('inventory.brand')}
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs"
              >
                Scan
              </button>
            </div>
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder="QR Code"
              value={form.qrCode}
              onChange={(e) => setForm((prev) => ({ ...prev, qrCode: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={t('inventory.buyPrice')}
              value={form.buyPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, buyPrice: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={t('inventory.sellPrice')}
              value={form.sellPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, sellPrice: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={t('inventory.stock')}
              value={form.stockQuantity}
              onChange={(e) => setForm((prev) => ({ ...prev, stockQuantity: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={t('inventory.minStock')}
              value={form.minStockLevel}
              onChange={(e) => setForm((prev) => ({ ...prev, minStockLevel: e.target.value }))}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
          >
            {t('common.save')}
          </button>
        </div>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
}

