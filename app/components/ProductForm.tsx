'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, apiFetch, isShopMissingError, getNoShopMessage } from '../contexts/AuthContext';
import { BarcodeScanner } from './BarcodeScanner';
import { Upload } from 'lucide-react';

export interface ProductUnit {
  id: number;
  name_ar: string;
  name_en?: string;
  factor_to_base: number;
  level: number;
  sell_price?: number | null;
  buy_price?: number | null;
}

export interface Product {
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
  carton_packs_count?: number | null;
  pack_units_count?: number | null;
  units?: ProductUnit[];
}

export const EMPTY_PRODUCT_FORM = {
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
  cartonPacksCount: '',
  packUnitsCount: '',
  pieceBuyPrice: '',
  pieceSellPrice: '',
  packBuyPrice: '',
  packSellPrice: '',
  cartonBuyPrice: '',
  cartonSellPrice: '',
  descriptionShort: '',
  descriptionLong: '',
  warrantyText: '',
  returnPolicyText: '',
  specs: [] as { key: string; value: string }[],
  galleryUrls: [] as string[],
};

const isValidImageUrl = (s: string) => /^https?:\/\/.+/i.test(String(s || '').trim());

export type ProductFormPayload = {
  nameEn: string;
  nameAr?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  qrCode?: string;
  buyPrice?: number;
  sellPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  cartonPacksCount?: number;
  packUnitsCount?: number;
  pieceBuyPrice?: number;
  pieceSellPrice?: number;
  packBuyPrice?: number;
  packSellPrice?: number;
  cartonBuyPrice?: number;
  cartonSellPrice?: number;
  imageUrl?: string;
  galleryUrls?: string[];
  descriptionShort?: string;
  descriptionLong?: string;
  warrantyText?: string;
  returnPolicyText?: string;
  specs?: { key: string; value: string }[];
};

export interface ProductFormProps {
  mode: 'add' | 'edit';
  productId?: number;
  initialProduct?: Product | null;
  products?: Product[];
  title: string;
  t: (key: string) => string;
  language: string;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (msg: string) => void;
}

export function ProductForm({
  mode,
  productId,
  initialProduct,
  products = [],
  title,
  t,
  language,
  showToast,
  onSuccess,
  onCancel,
  onError,
}: ProductFormProps) {
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const [formScannerTarget, setFormScannerTarget] = useState<'barcode' | 'qr' | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [productBarcodes, setProductBarcodes] = useState<Array<{ id: number; barcode_value: string; unit_id?: number | null }>>([]);
  const [newBarcodeValue, setNewBarcodeValue] = useState('');
  const [newBarcodeUnitId, setNewBarcodeUnitId] = useState<number | null>(null);

  useEffect(() => {
    if (initialProduct) {
      const p = initialProduct as any;
      let specs: { key: string; value: string }[] = [];
      try {
        if (p.specs_json) specs = Array.isArray(JSON.parse(p.specs_json)) ? JSON.parse(p.specs_json) : [];
        else if (typeof p.specs_json === 'object' && Array.isArray(p.specs_json)) specs = p.specs_json;
      } catch {}
      let galleryUrls: string[] = [];
      try {
        if (p.gallery_urls_json) galleryUrls = Array.isArray(JSON.parse(p.gallery_urls_json)) ? JSON.parse(p.gallery_urls_json) : [];
        else if (Array.isArray(p.gallery_urls_json)) galleryUrls = p.gallery_urls_json;
      } catch {}
      const primaryUrl = initialProduct.image_url || '';
      const combined = primaryUrl ? [primaryUrl, ...galleryUrls.filter((u) => u !== primaryUrl)] : galleryUrls;
      const units = (p.units || []) as ProductUnit[];
      const piece = units.find((u) => u.level === 0);
      const pack = units.find((u) => u.level === 1);
      const carton = units.find((u) => u.level === 2);
      setForm({
        ...EMPTY_PRODUCT_FORM,
        nameEn: initialProduct.name_en,
        nameAr: initialProduct.name_ar || '',
        brand: initialProduct.brand || '',
        sku: initialProduct.sku || '',
        barcode: initialProduct.barcode || '',
        qrCode: initialProduct.qr_code || '',
        imageUrl: combined.join('\n'),
        buyPrice: String(initialProduct.buy_price ?? ''),
        sellPrice: String(initialProduct.sell_price ?? ''),
        stockQuantity: String(initialProduct.stock_quantity ?? ''),
        minStockLevel: String(initialProduct.min_stock_level ?? ''),
        cartonPacksCount: String(initialProduct.carton_packs_count ?? ''),
        packUnitsCount: String(initialProduct.pack_units_count ?? ''),
        pieceBuyPrice: String(piece?.buy_price ?? ''),
        pieceSellPrice: String(piece?.sell_price ?? ''),
        packBuyPrice: String(pack?.buy_price ?? ''),
        packSellPrice: String(pack?.sell_price ?? ''),
        cartonBuyPrice: String(carton?.buy_price ?? ''),
        cartonSellPrice: String(carton?.sell_price ?? ''),
        descriptionShort: p.description_short || '',
        descriptionLong: p.description_long || '',
        warrantyText: p.warranty_text || '',
        returnPolicyText: p.return_policy_text || '',
        specs,
        galleryUrls,
      });
    } else {
      setForm(EMPTY_PRODUCT_FORM);
    }
  }, [initialProduct, mode]);

  useEffect(() => {
    if (!productId || mode !== 'edit') {
      setProductBarcodes([]);
      return;
    }
    (async () => {
      try {
        const data = await apiRequest(`/products/${productId}/barcodes`);
        setProductBarcodes(Array.isArray(data) ? data : []);
      } catch {
        setProductBarcodes([]);
      }
    })();
  }, [productId, mode]);

  const formImageUrls = useMemo(() => form.imageUrl.split(/[\n,]+/).map((s) => s.trim()).filter(isValidImageUrl), [form.imageUrl]);

  const handleSave = useCallback(async () => {
    if (!form.nameEn) {
      showToast(language === 'ar' ? 'يرجى إدخال اسم المنتج' : 'Name is required.', 'error');
      onError?.(language === 'ar' ? 'يرجى إدخال اسم المنتج' : 'Name is required.');
      return;
    }
    const urlsFromImage = form.imageUrl.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const allUrls = [...urlsFromImage, ...form.galleryUrls];
    const invalid = allUrls.filter((u) => !isValidImageUrl(u));
    if (invalid.length > 0) {
      showToast(language === 'ar' ? 'رابط الصورة غير صالح. يجب أن يبدأ بـ http:// أو https://' : 'Invalid image URL. Must start with http:// or https://', 'error');
      return;
    }

    try {
      setSaving(true);
      const galleryUrls = [...urlsFromImage, ...form.galleryUrls].filter((u) => isValidImageUrl(u));
      const payload: ProductFormPayload = {
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
        cartonPacksCount: form.cartonPacksCount ? parseInt(form.cartonPacksCount, 10) : undefined,
        packUnitsCount: form.packUnitsCount ? parseInt(form.packUnitsCount, 10) : undefined,
        pieceBuyPrice: form.pieceBuyPrice ? parseFloat(form.pieceBuyPrice) : undefined,
        pieceSellPrice: form.pieceSellPrice ? parseFloat(form.pieceSellPrice) : undefined,
        packBuyPrice: form.packBuyPrice ? parseFloat(form.packBuyPrice) : undefined,
        packSellPrice: form.packSellPrice ? parseFloat(form.packSellPrice) : undefined,
        cartonBuyPrice: form.cartonBuyPrice ? parseFloat(form.cartonBuyPrice) : undefined,
        cartonSellPrice: form.cartonSellPrice ? parseFloat(form.cartonSellPrice) : undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
        descriptionShort: form.descriptionShort || undefined,
        descriptionLong: form.descriptionLong || undefined,
        warrantyText: form.warrantyText || undefined,
        returnPolicyText: form.returnPolicyText || undefined,
        specs: form.specs?.length ? form.specs : undefined,
      };

      if (mode === 'edit' && productId) {
        await apiRequest(`/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setForm(EMPTY_PRODUCT_FORM);
      showToast(language === 'ar' ? 'تم حفظ المنتج' : 'Product saved successfully.', 'success');
      onSuccess();
    } catch (err: any) {
      if (isShopMissingError(err)) {
        const msg = getNoShopMessage(language);
        showToast(msg, 'error');
        onError?.(msg);
      } else {
        const msg = err?.message || 'Failed to save product';
        showToast(msg, 'error');
        onError?.(msg);
      }
    } finally {
      setSaving(false);
    }
  }, [form, mode, productId, language, showToast, onSuccess, onError]);

  const editingProduct = productId ? products.find((p) => p.id === productId) : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-2xl bg-[#0b1220] border border-cyan-500/30 flex flex-col overflow-hidden">
          <div className="flex justify-between px-6 py-4 border-b border-cyan-500/20">
            <h2 className="text-lg font-bold text-cyan-200">{title}</h2>
            <button onClick={() => { setFormScannerTarget(null); onCancel(); }} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
                <button type="button" onClick={() => setFormScannerTarget('barcode')} className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs whitespace-nowrap">
                  {language === 'ar' ? 'مسح بالكاميرا' : 'Scan'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder="QR Code"
                  value={form.qrCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, qrCode: e.target.value }))}
                />
                <button type="button" onClick={() => setFormScannerTarget('qr')} className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs whitespace-nowrap">
                  {language === 'ar' ? 'مسح بالكاميرا' : 'Scan'}
                </button>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'روابط الصور (سطر لكل رابط أو مفصولة بفاصلة)' : 'Image URLs (one per line or comma-separated)'}</div>
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder="https://..."
                    rows={2}
                    value={form.imageUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                  <div className="flex flex-col gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          showToast(language === 'ar' ? 'الملف كبير جداً (الحد 5 ميجا)' : 'File too large (max 5 MB)', 'error');
                          return;
                        }
                        setUploadingImage(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', file);
                          const res = await apiFetch('/uploads/product-image', { method: 'POST', body: fd });
                          const data = await res.json().catch(() => ({}));
                          if (data?.ok && data?.url) {
                            setForm((prev) => ({ ...prev, imageUrl: prev.imageUrl.trim() ? `${prev.imageUrl}\n${data.url}` : data.url }));
                            showToast(language === 'ar' ? 'تم رفع الصورة' : 'Image uploaded', 'success');
                          } else {
                            showToast(data?.error || (language === 'ar' ? 'فشل الرفع' : 'Upload failed'), 'error');
                          }
                        } catch (err: any) {
                          showToast((err as Error)?.message || (language === 'ar' ? 'فشل الرفع' : 'Upload failed'), 'error');
                        } finally {
                          setUploadingImage(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs whitespace-nowrap flex items-center gap-1 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingImage ? (language === 'ar' ? 'جاري...' : 'Uploading...') : (language === 'ar' ? 'رفع صورة' : 'Upload')}
                    </button>
                  </div>
                </div>
                {formImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formImageUrls.map((url, i) => (
                      <div key={i} className="relative w-14 h-14 rounded overflow-hidden border border-cyan-500/20 bg-slate-800">
                        <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'X (علب في الكرتونة)' : 'X (packs per carton)'}
                  value={form.cartonPacksCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, cartonPacksCount: e.target.value }))}
                />
                <input
                  className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'Y (قطع في العلبة)' : 'Y (pieces per pack)'}
                  value={form.packUnitsCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, packUnitsCount: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 text-xs text-cyan-300/80 mb-1">{language === 'ar' ? 'أسعار الوحدات (اختياري)' : 'Unit prices (optional)'}</div>
              <div className="flex gap-2">
                <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'قطعة شراء' : 'Piece buy'} value={form.pieceBuyPrice} onChange={(e) => setForm((prev) => ({ ...prev, pieceBuyPrice: e.target.value }))} />
                <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'قطعة بيع' : 'Piece sell'} value={form.pieceSellPrice} onChange={(e) => setForm((prev) => ({ ...prev, pieceSellPrice: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'علبة شراء' : 'Pack buy'} value={form.packBuyPrice} onChange={(e) => setForm((prev) => ({ ...prev, packBuyPrice: e.target.value }))} />
                <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'علبة بيع' : 'Pack sell'} value={form.packSellPrice} onChange={(e) => setForm((prev) => ({ ...prev, packSellPrice: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'كرتونة شراء' : 'Carton buy'} value={form.cartonBuyPrice} onChange={(e) => setForm((prev) => ({ ...prev, cartonBuyPrice: e.target.value }))} />
                <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'كرتونة بيع' : 'Carton sell'} value={form.cartonSellPrice} onChange={(e) => setForm((prev) => ({ ...prev, cartonSellPrice: e.target.value }))} />
              </div>
              {mode === 'edit' && productId && (
                <div className="md:col-span-2 mt-4 pt-4 border-t border-cyan-500/20">
                  <div className="text-xs text-cyan-300/80 mb-2">{language === 'ar' ? 'باركودات إضافية (مع الوحدة)' : 'Additional barcodes (with unit)'}</div>
                  <div className="space-y-2">
                    {productBarcodes.map((b) => (
                      <div key={b.id} className="flex items-center gap-2">
                        <span className="text-sm text-slate-200 flex-1">{b.barcode_value}</span>
                        <span className="text-xs text-slate-500">
                          {language === 'ar' ? 'وحدة: ' : 'Unit: '}
                          {(editingProduct as any)?.units?.find((u: any) => u.id === b.unit_id)?.name_ar || (editingProduct as any)?.units?.find((u: any) => u.id === b.unit_id)?.name_en || (language === 'ar' ? 'قطعة' : 'Piece')}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await apiRequest(`/products/${productId}/barcodes/${encodeURIComponent(b.barcode_value)}`, { method: 'DELETE' });
                              const data = await apiRequest(`/products/${productId}/barcodes`);
                              setProductBarcodes(Array.isArray(data) ? data : []);
                            } catch (err: any) {
                              showToast(err?.message || (language === 'ar' ? 'فشل الحذف' : 'Delete failed'), 'error');
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                        placeholder={language === 'ar' ? 'باركود جديد' : 'New barcode'}
                        value={newBarcodeValue}
                        onChange={(e) => setNewBarcodeValue(e.target.value)}
                      />
                      <select
                        className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                        value={newBarcodeUnitId ?? ''}
                        onChange={(e) => setNewBarcodeUnitId(e.target.value ? parseInt(e.target.value, 10) : null)}
                      >
                        <option value="">{language === 'ar' ? 'قطعة' : 'Piece'}</option>
                        {(editingProduct as any)?.units?.filter((u: any) => u.level > 0)?.map((u: any) => (
                          <option key={u.id} value={u.id}>{language === 'ar' ? u.name_ar : u.name_en || u.name_ar}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          const val = newBarcodeValue.trim();
                          if (!val) return;
                          try {
                            await apiRequest(`/products/${productId}/barcodes`, {
                              method: 'POST',
                              body: JSON.stringify({ barcodeValue: val, unitId: newBarcodeUnitId }),
                            });
                            const data = await apiRequest(`/products/${productId}/barcodes`);
                            setProductBarcodes(Array.isArray(data) ? data : []);
                            setNewBarcodeValue('');
                            setNewBarcodeUnitId(null);
                            showToast(language === 'ar' ? 'تمت إضافة الباركود' : 'Barcode added', 'success');
                          } catch (err: any) {
                            let msg = err?.message;
                            try { if (err?.body) msg = JSON.parse(err.body)?.error || msg; } catch {}
                            showToast(msg || (language === 'ar' ? 'فشل الإضافة' : 'Add failed'), 'error');
                          }
                        }}
                        className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm"
                      >
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 border-t border-cyan-500/20 pt-6">
              <h3 className="text-sm font-bold text-cyan-300 mb-3">{language === 'ar' ? 'تفاصيل المتجر الأونلاين' : 'Online store details'}</h3>
              <div className="space-y-4">
                <textarea className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'وصف قصير' : 'Short description'} rows={2} value={form.descriptionShort} onChange={(e) => setForm((prev) => ({ ...prev, descriptionShort: e.target.value }))} />
                <textarea className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'وصف طويل' : 'Long description'} rows={4} value={form.descriptionLong} onChange={(e) => setForm((prev) => ({ ...prev, descriptionLong: e.target.value }))} />
                <div>
                  <div className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'المواصفات (مفتاح / قيمة)' : 'Specs (key / value)'}</div>
                  {form.specs.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm" placeholder="Key" value={s.key} onChange={(e) => setForm((prev) => ({ ...prev, specs: prev.specs.map((sp, j) => j === i ? { ...sp, key: e.target.value } : sp) }))} />
                      <input className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm" placeholder="Value" value={s.value} onChange={(e) => setForm((prev) => ({ ...prev, specs: prev.specs.map((sp, j) => j === i ? { ...sp, value: e.target.value } : sp) }))} />
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, specs: prev.specs.filter((_, j) => j !== i) }))} className="px-2 text-red-400">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, specs: [...prev.specs, { key: '', value: '' }] }))} className="text-xs text-cyan-400 hover:text-cyan-300">
                    {language === 'ar' ? '+ إضافة مواصفة' : '+ Add spec'}
                  </button>
                </div>
                <input className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'نص الضمان' : 'Warranty text'} value={form.warrantyText} onChange={(e) => setForm((prev) => ({ ...prev, warrantyText: e.target.value }))} />
                <textarea className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder={language === 'ar' ? 'سياسة الإرجاع' : 'Return policy'} rows={2} value={form.returnPolicyText} onChange={(e) => setForm((prev) => ({ ...prev, returnPolicyText: e.target.value }))} />
                <div>
                  <div className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'روابط معرض الصور (كل سطر رابط)' : 'Gallery image URLs (one per line)'}</div>
                  <textarea className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" placeholder="https://..." rows={2} value={form.galleryUrls.join('\n')} onChange={(e) => setForm((prev) => ({ ...prev, galleryUrls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} />
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-cyan-500/20 flex justify-end gap-3 bg-[#0b1220]">
            <button onClick={() => { setFormScannerTarget(null); onCancel(); }} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={formScannerTarget !== null}
        onClose={() => setFormScannerTarget(null)}
        onDetected={(value) => {
          if (formScannerTarget) setForm((prev) => ({ ...prev, [formScannerTarget === 'barcode' ? 'barcode' : 'qrCode']: value }));
          setFormScannerTarget(null);
        }}
        language={language as 'ar' | 'en'}
      />
    </>
  );
}
