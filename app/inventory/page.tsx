'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { AIAssistant } from '../components/AIAssistant';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Image as ImageIcon, Pencil } from 'lucide-react';

interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  qr_code?: string;
  image_url?: string;
  buy_price: number;
  sell_price: number;
  stock_quantity: number;
  min_stock_level: number;
  category_name_en?: string;
  category_name_ar?: string;
}

const emptyForm = {
  nameEn: '',
  nameAr: '',
  brand: '',
  sku: '',
  barcode: '',
  qrCode: '',
  imageUrl: '',
  buyPrice: '',
  sellPrice: '',
  stockQuantity: '',
  minStockLevel: '',
};

export default function InventoryPage() {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();
  const { symbol } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('/products');
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return (
        product.name_en.toLowerCase().includes(query) ||
        product.name_ar.toLowerCase().includes(query) ||
        (product.sku || '').toLowerCase().includes(query) ||
        (product.barcode || '').toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const handleSave = async () => {
    setError(null);
    if (!form.nameEn) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المنتج' : 'Name is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        nameEn: form.nameEn,
        nameAr: form.nameAr || form.nameEn,
        brand: form.brand,
        sku: form.sku,
        barcode: form.barcode,
        qrCode: form.qrCode,
        buyPrice: parseFloat(form.buyPrice || '0'),
        sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : undefined,
        stockQuantity: parseInt(form.stockQuantity || '0', 10),
        minStockLevel: parseInt(form.minStockLevel || '5', 10),
          imageUrl: form.imageUrl,
      };
      if (editingId) {
        await apiRequest(`/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      nameEn: product.name_en,
      nameAr: product.name_ar,
      brand: product.brand || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      qrCode: product.qr_code || '',
      imageUrl: product.image_url || '',
      buyPrice: String(product.buy_price ?? ''),
      sellPrice: String(product.sell_price ?? ''),
      stockQuantity: String(product.stock_quantity ?? ''),
      minStockLevel: String(product.min_stock_level ?? ''),
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('inventory.title')}</h1>
        <div className="neon-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
            >
              {t('inventory.addProduct')}
            </button>
            <div className="flex items-center gap-2">
              <input
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm w-64"
                placeholder={t('inventory.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-3 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-xs"
              >
                {language === 'ar' ? 'مسح' : 'Scan'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-sm text-slate-300">{t('common.loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-cyan-400 border-b border-cyan-500/20">
                  <tr>
                    <th className="py-2 text-left">{t('inventory.productName')}</th>
                    <th className="py-2 text-left">SKU</th>
                    <th className="py-2 text-left">Barcode</th>
                    <th className="py-2 text-left">{t('inventory.stock')}</th>
                    <th className="py-2 text-left">{t('inventory.sellPrice')}</th>
                    <th className="py-2 text-left">{t('inventory.buyPrice')}</th>
                    <th className="py-2 text-left">{t('inventory.productImage') || 'Image'}</th>
                    <th className="py-2 text-left">{t('common.edit')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-cyan-500/10">
                        <td className="py-2">
                          <div className="font-semibold text-white">
                            {language === 'ar' ? product.name_ar : product.name_en}
                          </div>
                          <div className="text-xs text-slate-400">
                            {product.brand || '—'}
                          </div>
                        </td>
                        <td className="py-2">{product.sku || '—'}</td>
                        <td className="py-2">{product.barcode || '—'}</td>
                        <td className="py-2">
                          <span className={product.stock_quantity <= product.min_stock_level ? 'text-red-400' : 'text-green-400'}>
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="py-2">
                          {Number(product.sell_price || 0).toFixed(2)} {symbol}
                        </td>
                        <td className="py-2">
                          {Number(product.buy_price || 0).toFixed(2)} {symbol}
                        </td>
                        <td className="py-2">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt={product.name_en}
                              className="h-10 w-10 rounded-md object-cover border border-cyan-500/20"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="text-xs">{t('common.edit')}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0b1220] border border-cyan-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cyan-200">
                {editingId ? (language === 'ar' ? 'تعديل المنتج' : 'Edit Product') : t('inventory.addProduct')}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
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
              <input
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
              />
              <input
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder="QR Code"
                value={form.qrCode}
                onChange={(e) => setForm((prev) => ({ ...prev, qrCode: e.target.value }))}
              />
              <input
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder={t('inventory.productImage') || 'Image URL'}
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
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

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {user?.package === 'gold' && <AIAssistant />}

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => setSearch(value)}
      />
    </div>
  );
}

