'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, apiFetch, getNoShopMessage, isShopMissingError, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { useCurrency } from '../contexts/CurrencyContext';
import { canAccess, getPlanFeatures } from '../permissions';
import { formatCurrency } from '@/lib/formatters';
import { AIAssistant } from '../components/AIAssistant';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Image as ImageIcon, Pencil, MapPin, Upload } from 'lucide-react';

interface ProductUnit {
  id: number;
  name_ar: string;
  name_en?: string;
  factor_to_base: number;
  level: number;
  sell_price?: number | null;
  buy_price?: number | null;
}

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
  carton_packs_count?: number | null;
  pack_units_count?: number | null;
  category_name_en?: string;
  category_name_ar?: string;
  description_short?: string;
  description_long?: string;
  specs_json?: string;
  warranty_text?: string;
  return_policy_text?: string;
  gallery_urls_json?: string;
  units?: ProductUnit[];
}

function getProductImageUrl(p: Product): string | null {
  if (p.image_url && String(p.image_url).trim().startsWith('http')) return p.image_url;
  try {
    const g = (p as any).gallery_urls_json;
    const arr = typeof g === 'string' ? JSON.parse(g) : g;
    const first = Array.isArray(arr) && arr[0] ? String(arr[0]).trim() : null;
    return first && first.startsWith('http') ? first : null;
  } catch { return null; }
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

export default function InventoryPage() {
  const { t, direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'inventory', effectiveRole });
  const { currency, symbol } = useCurrency();
  const planFeatures = getPlanFeatures(user?.package);
  const canEditInventory = canAccess(effectiveRole as any, 'inventory_edit', planFeatures);
  const canViewAvailability = canAccess(effectiveRole as any, 'branch_availability', planFeatures);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [formScannerTarget, setFormScannerTarget] = useState<'barcode' | 'qr' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showDeleteLastImportModal, setShowDeleteLastImportModal] = useState(false);
  const [lastBatch, setLastBatch] = useState<{ batchId: number; fileName: string; createdAt: string; importedCount?: number } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteLastImportLoading, setDeleteLastImportLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [availabilityModal, setAvailabilityModal] = useState<{ productId: number; productName: string } | null>(null);
  const [availabilityData, setAvailabilityData] = useState<{ branches: Array<{ branchNameAr: string; branchNameEn: string; qty: number }> } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [productBarcodes, setProductBarcodes] = useState<Array<{ id: number; barcode_value: string; unit_id?: number | null }>>([]);
  const [newBarcodeValue, setNewBarcodeValue] = useState('');
  const [newBarcodeUnitId, setNewBarcodeUnitId] = useState<number | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const onProductsImported = () => loadProducts();
    window.addEventListener('products-imported', onProductsImported);
    return () => window.removeEventListener('products-imported', onProductsImported);
  }, []);

  useEffect(() => {
    if (!editingId) {
      setProductBarcodes([]);
      return;
    }
    (async () => {
      try {
        const data = await apiRequest(`/products/${editingId}/barcodes`);
        setProductBarcodes(Array.isArray(data) ? data : []);
      } catch {
        setProductBarcodes([]);
      }
    })();
  }, [editingId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('/products?includeUnits=1');
      setProducts(data);
    } catch (err: any) {
      if (isShopMissingError(err)) {
        setProducts([]);
        setError(getNoShopMessage(language));
      } else {
        setError(err.message || 'Failed to load products');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAvailabilityModal = async (product: Product) => {
    setAvailabilityModal({ productId: product.id, productName: language === 'ar' ? product.name_ar : product.name_en });
    setAvailabilityData(null);
    try {
      const data = await apiRequest(`/admin/inventory/availability?productId=${product.id}`);
      setAvailabilityData({ branches: (data.branches || []).map((b: any) => ({ branchNameAr: b.branchNameAr || b.branchName || b.name, branchNameEn: b.branchNameEn || b.branchName || b.name, qty: b.qty || 0 })) });
    } catch {
      setAvailabilityData({ branches: [] });
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

  const isValidImageUrl = (s: string) => /^https?:\/\/.+/i.test(String(s || '').trim());
  const formImageUrls = useMemo(() => form.imageUrl.split(/[\n,]+/).map((s) => s.trim()).filter(isValidImageUrl), [form.imageUrl]);

  const handleSave = async () => {
    setError(null);
    if (!form.nameEn) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المنتج' : 'Name is required.');
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
      const urlsFromImage = form.imageUrl.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const galleryUrls = [...urlsFromImage, ...form.galleryUrls].filter((u) => isValidImageUrl(u));
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
      if (isShopMissingError(err)) {
        setError(getNoShopMessage(language));
      } else {
        setError(err.message || 'Failed to save product');
      }
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    const p = product as any;
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
    const primaryUrl = product.image_url || '';
    const combined = primaryUrl ? [primaryUrl, ...galleryUrls.filter((u) => u !== primaryUrl)] : galleryUrls;
    const units = (p.units || []) as ProductUnit[];
    const piece = units.find((u) => u.level === 0);
    const pack = units.find((u) => u.level === 1);
    const carton = units.find((u) => u.level === 2);
    setForm({
      ...emptyForm,
      nameEn: product.name_en,
      nameAr: product.name_ar,
      brand: product.brand || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      qrCode: product.qr_code || '',
      imageUrl: combined.join('\n'),
      buyPrice: String(product.buy_price ?? ''),
      sellPrice: String(product.sell_price ?? ''),
      stockQuantity: String(product.stock_quantity ?? ''),
      minStockLevel: String(product.min_stock_level ?? ''),
      cartonPacksCount: String(product.carton_packs_count ?? ''),
      packUnitsCount: String(product.pack_units_count ?? ''),
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
    setShowForm(true);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    const ids = filteredProducts.map((p) => p.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      showToast(language === 'ar' ? 'لم يتم تحديد أي صنف' : 'No products selected', 'error');
      return;
    }
    const ids = Array.from(selectedIds);
    console.log('bulk delete ids:', ids);
    setBulkDeleting(true);
    setError(null);
    try {
      const res = await apiRequest('/products/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      const count = res?.deletedCount ?? 0;
      showToast(language === 'ar' ? `تم حذف ${count} صنف بنجاح` : `${count} products deleted`, 'success');
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
      await loadProducts();
    } catch (err: any) {
      const msg = err?.message || (language === 'ar' ? 'فشل الحذف' : 'Delete failed');
      showToast(language === 'ar' && msg.includes('Invalid') ? 'لم يتم تحديد أي صنف' : msg, 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchLastBatch = async () => {
    setDeleteLastImportLoading(true);
    try {
      const data = await apiRequest('/products/import/last');
      if (data?.batchId) {
        setLastBatch({
          batchId: data.batchId,
          fileName: data.fileName || '',
          createdAt: data.createdAt || '',
          importedCount: data.importedCount ?? 0,
        });
        setShowDeleteLastImportModal(true);
      } else {
        showToast(language === 'ar' ? 'لا يوجد استيراد سابق' : 'No previous import', 'error');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      showToast(
        language === 'ar'
          ? (msg.includes('No import batch') ? 'لا يوجد استيراد سابق' : msg || 'فشل التحميل')
          : msg || 'Load failed',
        'error'
      );
    } finally {
      setDeleteLastImportLoading(false);
    }
  };

  const handleUndoLastImport = async () => {
    if (!lastBatch?.batchId) return;
    setDeleteLastImportLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/products/import/rollback', {
        method: 'POST',
        body: JSON.stringify({ batchId: lastBatch.batchId, confirm: true }),
      });
      const count = res?.deletedCount ?? 0;
      showToast(language === 'ar' ? `تم التراجع عن الاستيراد وحذف ${count} صنف` : `Rollback complete. ${count} products removed.`, 'success');
      setShowDeleteLastImportModal(false);
      setLastBatch(null);
      setSelectedIds(new Set());
      await loadProducts();
    } catch (err: any) {
      showToast(err?.message || (language === 'ar' ? 'فشل التراجع' : 'Rollback failed'), 'error');
    } finally {
      setDeleteLastImportLoading(false);
    }
  };

  const selectedCount = selectedIds.size;
  const allOnPageSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto overflow-x-hidden">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('inventory.title')}</h1>
        <div className="neon-card rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              {canEditInventory && (
                <>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
                  >
                    {t('inventory.addProduct')}
                  </button>
                  <button
                    type="button"
                    onClick={fetchLastBatch}
                    disabled={deleteLastImportLoading}
                    className="px-4 py-2 rounded-lg border border-amber-500/50 text-amber-200 hover:bg-amber-500/10 text-sm disabled:opacity-50"
                  >
                    {deleteLastImportLoading
                      ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
                      : (language === 'ar' ? 'التراجع عن آخر استيراد' : 'Undo last import')}
                  </button>
                </>
              )}
            </div>
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
          {canEditInventory && selectedCount > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-cyan-200 text-sm">
                {language === 'ar' ? `${selectedCount} صنف محدد` : `${selectedCount} selected`}
              </span>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {language === 'ar' ? `حذف المحدد (${selectedCount})` : `Delete selected (${selectedCount})`}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 text-sm"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
              </button>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {toast && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm ${toast.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/40' : 'bg-red-500/20 text-red-200 border border-red-500/40'}`}
            >
              {toast.msg}
            </div>
          )}
          {loading ? (
            <div className="text-sm text-slate-300">{t('common.loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-cyan-400 border-b border-cyan-500/20">
                  <tr>
                    {canEditInventory && (
                      <th className="py-2 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={(e) => (e.target.checked ? selectAllOnPage() : clearSelection())}
                          className="rounded border-cyan-500/50 bg-slate-800"
                        />
                      </th>
                    )}
                    <th className="py-2 text-left">{t('inventory.productName')}</th>
                    <th className="py-2 text-left">SKU</th>
                    <th className="py-2 text-left">Barcode</th>
                    <th className="py-2 text-left">{t('inventory.stock')}</th>
                    <th className="py-2 text-left">{t('inventory.sellPrice')}</th>
                    <th className="py-2 text-left">{t('inventory.buyPrice')}</th>
                    <th className="py-2 text-left">{t('inventory.productImage') || 'Image'}</th>
                    {canViewAvailability && <th className="py-2 text-left">{language === 'ar' ? 'التوفر' : 'Availability'}</th>}
                    {canEditInventory && <th className="py-2 text-left">{t('common.edit')}</th>}
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={(canEditInventory ? 1 : 0) + (canViewAvailability ? 1 : 0) + 8} className="py-4 text-center text-slate-500">
                        {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-cyan-500/10">
                        {canEditInventory && (
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              className="rounded border-cyan-500/50 bg-slate-800"
                            />
                          </td>
                        )}
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
                          {formatCurrency(product.sell_price || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                        </td>
                        <td className="py-2">
                          {formatCurrency(product.buy_price || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                        </td>
                        <td className="py-2">
                          {getProductImageUrl(product) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getProductImageUrl(product)!}
                              alt={product.name_en}
                              className="h-10 w-10 rounded-md object-cover border border-cyan-500/20"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </td>
                        {canViewAvailability && (
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => openAvailabilityModal(product)}
                              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                            >
                              <MapPin className="h-4 w-4" />
                              <span className="text-xs">{language === 'ar' ? 'توفر في فروع أخرى' : 'Available in other branches'}</span>
                            </button>
                          </td>
                        )}
                        {canEditInventory && (
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
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-2xl bg-[#0b1220] border border-cyan-500/30 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">
              <h2 className="text-lg font-bold text-cyan-200">
                {editingId ? (language === 'ar' ? 'تعديل المنتج' : 'Edit Product') : t('inventory.addProduct')}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormScannerTarget(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
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
                  <button
                    type="button"
                    onClick={() => setFormScannerTarget('barcode')}
                    className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs whitespace-nowrap"
                  >
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
                  <button
                    type="button"
                    onClick={() => setFormScannerTarget('qr')}
                    className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs whitespace-nowrap"
                  >
                    {language === 'ar' ? 'مسح بالكاميرا' : 'Scan'}
                  </button>
                </div>
                <div>
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
                              showToast(language === 'ar' ? 'تم رفع الصورة' : 'Image uploaded');
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
                  <input
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'قطعة شراء' : 'Piece buy'}
                    value={form.pieceBuyPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, pieceBuyPrice: e.target.value }))}
                  />
                  <input
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'قطعة بيع' : 'Piece sell'}
                    value={form.pieceSellPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, pieceSellPrice: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'علبة شراء' : 'Pack buy'}
                    value={form.packBuyPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, packBuyPrice: e.target.value }))}
                  />
                  <input
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'علبة بيع' : 'Pack sell'}
                    value={form.packSellPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, packSellPrice: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'كرتونة شراء' : 'Carton buy'}
                    value={form.cartonBuyPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, cartonBuyPrice: e.target.value }))}
                  />
                  <input
                    className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'كرتونة بيع' : 'Carton sell'}
                    value={form.cartonSellPrice}
                    onChange={(e) => setForm((prev) => ({ ...prev, cartonSellPrice: e.target.value }))}
                  />
                </div>
                {editingId && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-cyan-500/20">
                    <div className="text-xs text-cyan-300/80 mb-2">{language === 'ar' ? 'باركودات إضافية (مع الوحدة)' : 'Additional barcodes (with unit)'}</div>
                    <div className="space-y-2">
                      {productBarcodes.map((b) => (
                        <div key={b.id} className="flex items-center gap-2">
                          <span className="text-sm text-slate-200 flex-1">{b.barcode_value}</span>
                          <span className="text-xs text-slate-500">
                            {language === 'ar' ? 'وحدة: ' : 'Unit: '}
                            {(products.find((p) => p.id === editingId) as any)?.units?.find((u: any) => u.id === b.unit_id)?.name_ar ||
                              (products.find((p) => p.id === editingId) as any)?.units?.find((u: any) => u.id === b.unit_id)?.name_en ||
                              (language === 'ar' ? 'قطعة' : 'Piece')}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await apiRequest(`/products/${editingId}/barcodes/${encodeURIComponent(b.barcode_value)}`, { method: 'DELETE' });
                                const data = await apiRequest(`/products/${editingId}/barcodes`);
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
                          {(products.find((p) => p.id === editingId) as any)?.units
                            ?.filter((u: any) => u.level > 0)
                            ?.map((u: any) => (
                              <option key={u.id} value={u.id}>
                                {language === 'ar' ? u.name_ar : u.name_en || u.name_ar}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            const val = newBarcodeValue.trim();
                            if (!val) return;
                            try {
                              await apiRequest(`/products/${editingId}/barcodes`, {
                                method: 'POST',
                                body: JSON.stringify({ barcodeValue: val, unitId: newBarcodeUnitId }),
                              });
                              const data = await apiRequest(`/products/${editingId}/barcodes`);
                              setProductBarcodes(Array.isArray(data) ? data : []);
                              setNewBarcodeValue('');
                              setNewBarcodeUnitId(null);
                              showToast(language === 'ar' ? 'تمت إضافة الباركود' : 'Barcode added');
                            } catch (err: any) {
                              let msg = err?.message;
                              try {
                                if (err?.body) msg = JSON.parse(err.body)?.error || msg;
                              } catch {}
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

              {/* Storefront details */}
              <div className="mt-6 border-t border-cyan-500/20 pt-6">
              <h3 className="text-sm font-bold text-cyan-300 mb-3">{language === 'ar' ? 'تفاصيل المتجر الأونلاين' : 'Online store details'}</h3>
              <div className="space-y-4">
                <textarea
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'وصف قصير' : 'Short description'}
                  rows={2}
                  value={form.descriptionShort}
                  onChange={(e) => setForm((prev) => ({ ...prev, descriptionShort: e.target.value }))}
                />
                <textarea
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'وصف طويل' : 'Long description'}
                  rows={4}
                  value={form.descriptionLong}
                  onChange={(e) => setForm((prev) => ({ ...prev, descriptionLong: e.target.value }))}
                />
                <div>
                  <div className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'المواصفات (مفتاح / قيمة)' : 'Specs (key / value)'}</div>
                  {form.specs.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm"
                        placeholder="Key"
                        value={s.key}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          specs: prev.specs.map((sp, j) => j === i ? { ...sp, key: e.target.value } : sp),
                        }))}
                      />
                      <input
                        className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm"
                        placeholder="Value"
                        value={s.value}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          specs: prev.specs.map((sp, j) => j === i ? { ...sp, value: e.target.value } : sp),
                        }))}
                      />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, specs: prev.specs.filter((_, j) => j !== i) }))}
                        className="px-2 text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, specs: [...prev.specs, { key: '', value: '' }] }))}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {language === 'ar' ? '+ إضافة مواصفة' : '+ Add spec'}
                  </button>
                </div>
                <input
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'نص الضمان' : 'Warranty text'}
                  value={form.warrantyText}
                  onChange={(e) => setForm((prev) => ({ ...prev, warrantyText: e.target.value }))}
                />
                <textarea
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'سياسة الإرجاع' : 'Return policy'}
                  rows={2}
                  value={form.returnPolicyText}
                  onChange={(e) => setForm((prev) => ({ ...prev, returnPolicyText: e.target.value }))}
                />
                <div>
                  <div className="text-xs text-slate-400 mb-1">{language === 'ar' ? 'روابط معرض الصور (كل سطر رابط)' : 'Gallery image URLs (one per line)'}</div>
                  <textarea
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder="https://..."
                    rows={2}
                    value={form.galleryUrls.join('\n')}
                    onChange={(e) => setForm((prev) => ({ ...prev, galleryUrls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))}
                  />
                </div>
              </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-cyan-500/20 flex justify-end gap-3 bg-[#0b1220]">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormScannerTarget(null);
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

      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-[#0b1220] border border-cyan-500/30 p-6">
            <h2 className="text-lg font-bold text-cyan-200 mb-2">
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm delete'}
            </h2>
            <p className="text-slate-300 text-sm mb-6">
              {language === 'ar'
                ? `هل أنت متأكد من حذف ${selectedCount} صنف؟ لا يمكن التراجع.`
                : `Are you sure you want to delete ${selectedCount} item(s)? This cannot be undone.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
              >
                {bulkDeleting ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (language === 'ar' ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteLastImportModal && lastBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-[#0b1220] border border-cyan-500/30 p-6">
            <h2 className="text-lg font-bold text-cyan-200 mb-2">
              {language === 'ar' ? 'التراجع عن آخر استيراد' : 'Undo last import'}
            </h2>
            <p className="text-slate-300 text-sm mb-6">
              {language === 'ar'
                ? `هل تريد التراجع عن آخر استيراد؟ سيتم حذف ${lastBatch.importedCount ?? 0} صنف تم إدخالهم بتاريخ ${lastBatch.createdAt ? new Date(lastBatch.createdAt).toLocaleDateString('ar-SA') : '—'}.`
                : `Undo last import? This will remove ${lastBatch.importedCount ?? 0} products imported on ${lastBatch.createdAt ? new Date(lastBatch.createdAt).toLocaleDateString() : '—'}.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteLastImportModal(false); setLastBatch(null); }}
                disabled={deleteLastImportLoading}
                className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 disabled:opacity-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleUndoLastImport}
                disabled={deleteLastImportLoading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {deleteLastImportLoading ? (language === 'ar' ? 'جاري التراجع...' : 'Rolling back...') : (language === 'ar' ? 'تراجع' : 'Undo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {availabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setAvailabilityModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-[#0b1220] border border-cyan-500/30 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-cyan-200">
                {language === 'ar' ? 'توفر في فروع أخرى' : 'Available in other branches'}
              </h3>
              <button onClick={() => setAvailabilityModal(null)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <p className="text-sm text-slate-300 mb-4 truncate" title={availabilityModal.productName}>{availabilityModal.productName}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availabilityData ? (
                availabilityData.branches.length === 0 ? (
                  <p className="text-slate-500 text-sm">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>
                ) : (
                  availabilityData.branches.map((b, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-cyan-500/10">
                      <span className="text-slate-200">{language === 'ar' ? b.branchNameAr : b.branchNameEn}</span>
                      <span className="font-bold text-cyan-300">{b.qty}</span>
                    </div>
                  ))
                )
              ) : (
                <p className="text-slate-500 text-sm">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {canAccess(effectiveRole as any, 'ai', planFeatures) && <AIAssistant />}

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => setSearch(value)}
        language={language}
      />
      <BarcodeScanner
        open={formScannerTarget !== null}
        onClose={() => setFormScannerTarget(null)}
        onDetected={(value) => {
          if (formScannerTarget === 'barcode') {
            setForm((prev) => ({ ...prev, barcode: value }));
          } else if (formScannerTarget === 'qr') {
            setForm((prev) => ({ ...prev, qrCode: value }));
          }
        }}
        language={language}
      />
    </div>
  );
}

