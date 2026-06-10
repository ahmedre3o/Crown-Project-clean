'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, getNoShopMessage, isShopMissingError, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { useCurrency } from '../contexts/CurrencyContext';
import { canAccess, getPlanFeatures } from '../permissions';
import { formatCurrency } from '@/lib/formatters';
import { getStoredShopId } from '@/lib/shop';
import { getDisplayStock } from '@/lib/stock';
import { AIAssistant } from '../components/AIAssistant';
import { Image as ImageIcon, Pencil, MapPin, Upload } from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ProductForm } from '../components/ProductForm';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showDeleteLastImportModal, setShowDeleteLastImportModal] = useState(false);
  const [lastBatch, setLastBatch] = useState<{ batchId: number; fileName: string; createdAt: string; importedCount?: number } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteLastImportLoading, setDeleteLastImportLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [availabilityModal, setAvailabilityModal] = useState<{ productId: number; productName: string } | null>(null);
  const [availabilityData, setAvailabilityData] = useState<{ branches: Array<{ branchNameAr: string; branchNameEn: string; qty: number }> } | null>(null);
  const [branches, setBranches] = useState<Array<{ id: number; name_en?: string; name_ar?: string; name?: string; code?: string }>>([]);
  // All accounts with at least one branch (including clients with default branch) can use branch UI.
  const usesBranches = user?.package === 'branches' || branches.length > 0;
  const [branchFilter, setBranchFilter] = useState<number | ''>('');
  const [branchInventoryItems, setBranchInventoryItems] = useState<Array<{ product_id: number; quantity: number; product_name_en?: string; product_name_ar?: string }>>([]);
  const [branchInventoryLoading, setBranchInventoryLoading] = useState(false);
  const [branchTotals, setBranchTotals] = useState<Record<number, number>>({});
  const [quickEdit, setQuickEdit] = useState<{ product_id: number; quantity: string } | null>(null);
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    loadProducts();
    const shopId = user?.shop_id ?? (user as any)?.shopId ?? getStoredShopId();
    // Always fetch branches for all accounts (clients get one default branch; backend ensures it exists).
    apiRequest('/branches').then((r: any) => {
      const list = r?.list ?? (Array.isArray(r) ? r : []);
      setBranches(list);
      if (typeof window !== 'undefined' && shopId) {
        sessionStorage.setItem(`crown-shop-has-branches-${shopId}`, list.length > 0 ? '1' : '0');
      }
    }).catch(() => {
      setBranches([]);
      if (typeof window !== 'undefined' && shopId) {
        sessionStorage.setItem(`crown-shop-has-branches-${shopId}`, '0');
      }
    });
  }, [user?.shop_id, (user as any)?.shopId]);

  useEffect(() => {
    if (branchFilter === '') {
      setBranchInventoryItems([]);
      if (usesBranches) {
        apiRequest('/admin/inventory/branch-totals')
          .then((data: { totals?: Record<number, number> }) => {
            setBranchTotals(data?.totals ?? {});
          })
          .catch(() => setBranchTotals({}));
      } else {
        setBranchTotals({});
      }
      return;
    }
    setBranchTotals({});
    setBranchInventoryLoading(true);
    apiRequest(`/admin/branch-inventory?branch_id=${branchFilter}`)
      .then((data: { items?: Array<{ product_id: number; quantity: number; product_name_en?: string; product_name_ar?: string }> }) => {
        setBranchInventoryItems(data?.items ?? []);
      })
      .catch(() => setBranchInventoryItems([]))
      .finally(() => setBranchInventoryLoading(false));
  }, [branchFilter, usesBranches]);

  useEffect(() => {
    const onProductsImported = () => loadProducts();
    window.addEventListener('products-imported', onProductsImported);
    return () => window.removeEventListener('products-imported', onProductsImported);
  }, []);

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
      showToast(language === 'ar' ? 'تعذر تحميل بيانات التوفر' : 'Could not load availability data', 'error');
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

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setShowForm(true);
  };

  const saveQuickBranchQuantity = useCallback(async () => {
    if (!quickEdit || branchFilter === '') return;
    const qty = Math.max(0, parseInt(quickEdit.quantity, 10) || 0);
    setQuickEditSaving(true);
    try {
      await apiRequest(`/admin/products/${quickEdit.product_id}/branch-allocation`, {
        method: 'PUT',
        body: JSON.stringify({
          branches: [{ branch_id: Number(branchFilter), quantity: qty }],
        }),
      });
      setQuickEdit(null);
      const next = branchInventoryItems.map((i) =>
        i.product_id === quickEdit.product_id ? { ...i, quantity: qty } : i
      );
      setBranchInventoryItems(next);
      const data = await apiRequest('/admin/inventory/branch-totals').catch(() => ({}));
      setBranchTotals((data as { totals?: Record<number, number> })?.totals ?? {});
      loadProducts();
      showToast(language === 'ar' ? 'تم تخصيص الكمية بنجاح' : 'Stock allocated successfully', 'success');
    } catch (e: any) {
      const msg = e?.message ?? (language === 'ar' ? 'الكمية المتاحة لا تكفي' : 'Insufficient master stock');
      showToast(msg, 'error');
    } finally {
      setQuickEditSaving(false);
    }
  }, [quickEdit, branchFilter, branchInventoryItems, language, showToast, loadProducts]);

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
        showToast(language === 'ar' ? 'لا يوجد استيراد سابق للتراجع عنه' : 'No previous import to rollback', 'success');
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
      const rolledBack = res?.rolled_back !== false;
      const msg = res?.message;
      if (rolledBack && count > 0) {
        showToast(language === 'ar' ? `تم التراجع عن الاستيراد وحذف ${count} صنف` : `Rollback complete. ${count} products removed.`, 'success');
        setShowDeleteLastImportModal(false);
        setLastBatch(null);
        setSelectedIds(new Set());
        await loadProducts();
      } else if (msg) {
        showToast(msg, 'success');
        setShowDeleteLastImportModal(false);
        setLastBatch(null);
      } else {
        showToast(language === 'ar' ? `تم التراجع عن الاستيراد وحذف ${count} صنف` : `Rollback complete. ${count} products removed.`, 'success');
        setShowDeleteLastImportModal(false);
        setLastBatch(null);
        await loadProducts();
      }
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
                    onClick={() => { setEditingId(null); setShowForm(true); }}
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
            <div className="flex items-center gap-2 flex-wrap">
              {branches.length > 0 && (
                <select
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value === '' ? '' : Number(e.target.value))}
                  title={language === 'ar' ? 'عرض المخزون حسب الفرع' : 'View inventory by branch'}
                >
                  <option value="">{language === 'ar' ? 'كل الفروع' : 'All branches'}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {language === 'ar' ? (b.name_ar ?? b.name) : (b.name_en ?? b.name) || b.code || `#${b.id}`}
                    </option>
                  ))}
                </select>
              )}
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
          {branchFilter !== '' ? (
            <div className="mt-4">
              <h2 className="text-lg font-semibold text-cyan-200 mb-3">
                {language === 'ar' ? `منتجات في الفرع: ${branches.find((b) => b.id === branchFilter)?.name_ar ?? branches.find((b) => b.id === branchFilter)?.name ?? ''}` : `Products in branch: ${branches.find((b) => b.id === branchFilter)?.name_en ?? branches.find((b) => b.id === branchFilter)?.name ?? ''}`}
              </h2>
              {branchInventoryLoading ? (
                <div className="text-sm text-slate-300">{t('common.loading')}</div>
              ) : branchInventoryItems.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  {language === 'ar' ? 'لا يوجد مخزون مسجل في هذا الفرع' : 'No inventory recorded for this branch'}
                </div>
              ) : (
                <div className="rounded-xl border border-cyan-500/20 overflow-hidden">
                  <table className="data-table text-sm text-slate-200">
                    <thead>
                      <tr>
                        <th>{language === 'ar' ? 'المنتج' : 'Product'}</th>
                        <th>{language === 'ar' ? 'الكمية' : 'Quantity'}</th>
                        {canEditInventory && <th className="col-center">{language === 'ar' ? 'تعديل الكمية' : 'Quick Edit'}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {branchInventoryItems.map((item) => (
                        <tr key={item.product_id}>
                          <td className="data-table-wrap">{language === 'ar' ? (item.product_name_ar || item.product_name_en) : (item.product_name_en || item.product_name_ar) || `#${item.product_id}`}</td>
                          <td className="data-table-num font-semibold">
                            {quickEdit?.product_id === item.product_id ? (
                              <input
                                type="number"
                                min={0}
                                value={quickEdit.quantity}
                                onChange={(e) => setQuickEdit((prev) => prev ? { ...prev, quantity: e.target.value } : null)}
                                className="w-24 bg-[#0f172a] border border-cyan-500/30 rounded px-2 py-1 text-white font-mono"
                                autoFocus
                              />
                            ) : (
                              item.quantity
                            )}
                          </td>
                          {canEditInventory && (
                            <td className="data-table-center">
                              {quickEdit?.product_id === item.product_id ? (
                                <span className="flex flex-row-reverse items-center justify-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={saveQuickBranchQuantity}
                                    disabled={quickEditSaving}
                                    className="text-cyan-300 hover:text-cyan-200 text-xs disabled:opacity-50"
                                  >
                                    {quickEditSaving ? (language === 'ar' ? 'جاري...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setQuickEdit(null)}
                                    disabled={quickEditSaving}
                                    className="text-slate-400 hover:text-slate-300 text-xs"
                                  >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setQuickEdit({ product_id: item.product_id, quantity: String(item.quantity) })}
                                  className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                                  title={language === 'ar' ? 'تعديل الكمية' : 'Edit quantity'}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="text-xs">{language === 'ar' ? 'تعديل الكمية' : 'Quick Edit'}</span>
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="text-sm text-slate-300">{t('common.loading')}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
            </div>
          ) : (
            <>
              {/* Mobile: Card layout (< 1024px) */}
              <div className="lg:hidden space-y-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-xl border border-cyan-500/20 bg-black/20 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {canEditInventory && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="mt-1 rounded border-cyan-500/50 bg-slate-800 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base text-white mb-1">
                          {language === 'ar' ? product.name_ar : product.name_en}
                        </div>
                        <div className="text-xs text-slate-400 mb-2">{product.brand || '—'}</div>
                        <div className="text-xs text-slate-400 space-y-0.5 break-all" style={{ wordBreak: 'break-all', lineBreak: 'anywhere', whiteSpace: 'normal' }}>
                          <span>SKU: {product.sku || '—'}</span>
                          <span className="block">Barcode: {product.barcode || '—'}</span>
                        </div>
                      </div>
                      {getProductImageUrl(product) ? (
                        <img
                          src={getProductImageUrl(product)!}
                          alt={product.name_en}
                          className="h-12 w-12 rounded-md object-cover border border-cyan-500/20 shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60 shrink-0">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400">{t('inventory.stock')}: </span>
                        <span className={getDisplayStock(product) <= (product.min_stock_level ?? 0) ? 'text-red-400 font-semibold' : 'text-green-400'}>
                          {usesBranches && branchFilter === '' && branchTotals[product.id] !== undefined ? branchTotals[product.id] : getDisplayStock(product)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('inventory.sellPrice')}: </span>
                        <span className="text-cyan-300 tabular-nums">
                          {formatCurrency(product.sell_price || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-cyan-500/10">
                      {canViewAvailability && (
                        <button
                          type="button"
                          onClick={() => openAvailabilityModal(product)}
                          className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 text-xs"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {language === 'ar' ? 'التوفر' : 'Availability'}
                        </button>
                      )}
                      {canEditInventory && (
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('common.edit')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table layout (>= 1024px) */}
              <div className="hidden lg:block overflow-x-auto rounded-xl border border-cyan-500/20">
                <table className="data-table text-sm text-slate-200 w-full min-w-[960px]" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    {canEditInventory && <col className="w-10 shrink-0" style={{ width: 44 }} />}
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: 72 }} />
                    {canViewAvailability && <col style={{ width: 100 }} />}
                    {canEditInventory && <col style={{ width: 88 }} />}
                  </colgroup>
                  <thead>
                    <tr>
                      {canEditInventory && (
                        <th className="col-center !p-2">
                          <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={(e) => (e.target.checked ? selectAllOnPage() : clearSelection())}
                            className="rounded border-cyan-500/50 bg-slate-800"
                            aria-label={language === 'ar' ? 'تحديد الكل' : 'Select all'}
                          />
                        </th>
                      )}
                      <th>{t('inventory.productName')}</th>
                      <th>SKU</th>
                      <th>{language === 'ar' ? 'الباركود' : 'Barcode'}</th>
                      <th>{t('inventory.stock')}</th>
                      <th>{t('inventory.sellPrice')}</th>
                      <th>{t('inventory.buyPrice')}</th>
                      <th className="col-center">{language === 'ar' ? 'الصورة' : 'Photo'}</th>
                      {canViewAvailability && <th className="col-center">{language === 'ar' ? 'التوفر' : 'Stock'}</th>}
                      {canEditInventory && <th className="col-center">{t('common.edit')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        {canEditInventory && (
                          <td className="data-table-center !p-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              className="rounded border-cyan-500/50 bg-slate-800"
                              aria-label={`#${product.id}`}
                            />
                          </td>
                        )}
                        <td className="align-middle data-table-wrap min-w-0">
                          <div className="font-semibold text-white break-text leading-snug" title={language === 'ar' ? product.name_ar : product.name_en}>
                            {language === 'ar' ? product.name_ar : product.name_en}
                          </div>
                          <div className="text-xs text-slate-400 break-text mt-0.5">{product.brand || '—'}</div>
                        </td>
                        <td className="data-table-num text-xs font-mono align-middle" title={product.sku || ''}>{product.sku || '—'}</td>
                        <td className="data-table-num text-xs font-mono align-middle" title={product.barcode || ''}>{product.barcode || '—'}</td>
                        <td className="data-table-num font-semibold align-middle">
                          <span className={getDisplayStock(product) <= (product.min_stock_level ?? 0) ? 'text-red-400' : 'text-green-400'}>
                            {usesBranches && branchFilter === '' && branchTotals[product.id] !== undefined ? branchTotals[product.id] : getDisplayStock(product)}
                          </span>
                        </td>
                        <td className="data-table-num align-middle">{formatCurrency(product.sell_price || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td>
                        <td className="data-table-num align-middle">{formatCurrency(product.buy_price || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td>
                        <td className="data-table-center align-middle py-2">
                          <div className="flex justify-center items-center mx-auto w-12 h-12">
                            {getProductImageUrl(product) ? (
                              <img
                                src={getProductImageUrl(product)!}
                                alt=""
                                className="h-11 w-11 rounded-md object-cover border border-cyan-500/20 block"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        {canViewAvailability && (
                          <td className="data-table-center align-middle">
                            <button
                              type="button"
                              onClick={() => openAvailabilityModal(product)}
                              className="inline-flex flex-row-reverse items-center justify-center gap-1 text-cyan-300 hover:text-cyan-200 mx-auto"
                            >
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="text-xs whitespace-nowrap">{language === 'ar' ? 'توفر' : 'Avail.'}</span>
                            </button>
                          </td>
                        )}
                        {canEditInventory && (
                          <td className="data-table-center align-middle">
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              className="inline-flex flex-row-reverse items-center justify-center gap-1 text-cyan-300 hover:text-cyan-200 mx-auto"
                            >
                              <Pencil className="h-4 w-4 shrink-0" />
                              <span className="text-xs">{t('common.edit')}</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <ProductForm
          mode={editingId ? 'edit' : 'add'}
          productId={editingId ?? undefined}
          initialProduct={editingId ? products.find((p) => p.id === editingId) ?? null : null}
          products={products}
          title={editingId ? (language === 'ar' ? 'تعديل المنتج' : 'Edit Product') : t('inventory.addProduct')}
          t={t}
          language={language}
          showToast={showToast}
          onSuccess={() => {
            setShowForm(false);
            setEditingId(null);
            loadProducts();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onError={(msg) => setError(msg)}
        />
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
                {language === 'ar' ? 'توفر' : 'Availability'}
              </h3>
              <button onClick={() => setAvailabilityModal(null)} className="text-slate-400 hover:text-white">×</button>
            </div>
            <p className="text-sm text-slate-300 mb-4 truncate" title={availabilityModal.productName}>{availabilityModal.productName}</p>
            <p className="text-xs text-slate-400 mb-2">{language === 'ar' ? 'الكمية في كل فرع:' : 'Quantity per branch:'}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availabilityData ? (
                (() => {
                  const branches = availabilityData.branches || [];
                  if (branches.length === 0) {
                    return <p className="text-slate-500 text-sm">{language === 'ar' ? 'لا يوجد مخزون في أي فرع. اختر الفروع من تعديل المنتج واحفظ.' : 'No stock in any branch. Select branches in Edit Product and save.'}</p>;
                  }
                  return branches.map((b, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-cyan-500/10">
                      <span className="text-slate-200">{(language === 'ar' ? b.branchNameAr : b.branchNameEn) || (language === 'ar' ? b.branchNameEn : b.branchNameAr) || '—'}</span>
                      <span className="font-mono font-semibold text-cyan-300">{Number(b.qty)}</span>
                    </div>
                  ));
                })()
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
    </div>
  );
}

