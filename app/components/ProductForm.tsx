'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, apiFetch, isShopMissingError, getNoShopMessage, useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
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
  tax_rate_id?: number | null;
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
  productionDate: '',
  expiryDate: '',
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
  discountType: 'none' as 'none' | 'percent' | 'fixed',
  discountValue: '',
  discountActive: false,
  taxRateId: '' as string | number,
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
  stockQuantity?: number | string;
  stock_quantity?: number | string;
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
  discountType?: 'none' | 'percent' | 'fixed';
  discountValue?: number | null;
  discountActive?: boolean;
  taxRateId?: number | null;
  expiryDate?: string | null;
  expiry_date?: string | null;
  productionDate?: string | null;
  production_date?: string | null;
  /** Branch inventory: sent with product PUT so backend can update branch_inventory in one request */
  branches?: { branch_id: number; quantity: number }[];
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
  const { user } = useAuth();
  // Unified: ALL accounts use the same "متوفر في الفروع" grid (Normal = 1 row, Multi-branch = multiple).
  const usesBranches = true;
  const branchCtx = useBranch();
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const [formScannerTarget, setFormScannerTarget] = useState<'barcode' | 'qr' | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [productBarcodes, setProductBarcodes] = useState<Array<{ id: number; barcode_value: string; unit_id?: number | null }>>([]);
  const [newBarcodeValue, setNewBarcodeValue] = useState('');
  const [newBarcodeUnitId, setNewBarcodeUnitId] = useState<number | null>(null);
  const [taxRates, setTaxRates] = useState<Array<{ id: number; name: string; type: string; rate: number }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name_en?: string; name_ar?: string; name?: string; code?: string }>>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [branchQuantities, setBranchQuantities] = useState<Record<number, number>>({});
  const branchQuantitiesRef = useRef<Record<number, number>>({});
  branchQuantitiesRef.current = branchQuantities;
  const [branchAvailability, setBranchAvailability] = useState<Array<{ id: number; name?: string; name_ar?: string; name_en?: string; quantity: number }>>([]);

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
        productionDate: (initialProduct as any).production_date
          ? String((initialProduct as any).production_date).slice(0, 10)
          : '',
        expiryDate: (initialProduct as any).expiry_date ? String((initialProduct as any).expiry_date).slice(0, 10) : '',
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
        discountType: ['none', 'percent', 'fixed'].includes(p.discount_type) ? p.discount_type : 'none',
        discountValue: p.discount_value != null ? String(p.discount_value) : '',
        discountActive: Boolean(p.discount_active),
        taxRateId: p.tax_rate_id != null ? p.tax_rate_id : '',
      });
      if (mode === 'edit' && Array.isArray(p.branches) && p.branches.length > 0) {
        const ids = p.branches.map((b: any) => Number(b.branch_id ?? b.id)).filter((n: number) => !Number.isNaN(n) && n > 0);
        const qtyMap: Record<number, number> = {};
        const avail: Array<{ id: number; name?: string; name_ar?: string; name_en?: string; quantity: number }> = [];
        for (const b of p.branches) {
          const bid = Number(b.branch_id ?? b.id);
          if (!bid) continue;
          const q = Number(b.quantity ?? 0);
          qtyMap[bid] = Number.isNaN(q) ? 0 : q;
          avail.push({ id: bid, quantity: qtyMap[bid] });
        }
        for (const id of ids) {
          const n = Number(id);
          if (n && qtyMap[n] === undefined) qtyMap[n] = 0;
        }
        setSelectedBranchIds(ids);
        setBranchQuantities(qtyMap);
        branchQuantitiesRef.current = qtyMap;
        setBranchAvailability(avail);
      }
    } else {
      setForm(EMPTY_PRODUCT_FORM);
    }
  }, [initialProduct, mode]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/taxes');
        setTaxRates(Array.isArray(data) ? data : []);
      } catch {
        setTaxRates([]);
      }
    })();
  }, []);

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

  // Single-branch behavior: auto-select the one branch and ensure quantity binding so the input always shows.
  useEffect(() => {
    if (!usesBranches) return;
    const first = branches[0];
    const bid = first != null ? Number(first?.id) : 0;
    const ctxId = Number(branchCtx?.branches?.[0]?.id) || 0;
    const effectiveId = bid > 0 ? bid : ctxId;

    if (branches.length === 1 && effectiveId > 0) {
      if (selectedBranchIds.length === 0) setSelectedBranchIds([effectiveId]);
      if (branchQuantities[effectiveId] === undefined) {
        setBranchQuantities((prev) => {
          const next = { ...prev, [effectiveId]: 0 };
          branchQuantitiesRef.current = next;
          return next;
        });
      }
      return;
    }
    if (branches.length === 0 && ctxId > 0) return;
    if (branches.length === 0 && !branchCtx?.branches?.length && selectedBranchIds.length === 0) {
      setSelectedBranchIds([0]);
      setBranchQuantities((prev) => {
        const next = { ...prev, [0]: 0 };
        branchQuantitiesRef.current = next;
        return next;
      });
    }
  }, [usesBranches, branches.length, selectedBranchIds.length, branchCtx?.branches, branchQuantities]);

  useEffect(() => {
    if (!usesBranches) {
      setBranches([]);
      return;
    }
    (async () => {
      try {
        const data = await apiRequest('/branches').catch(() => ({}));
        const list = (data as any)?.list ?? (Array.isArray(data) ? data : []);
        setBranches(list.length > 0 ? list : []);
      } catch {
        setBranches([]);
      }
    })();
  }, [usesBranches]);

  // When form's branches list is empty but context has branches (e.g. client account), use context so "متوفر في الفروع" shows one row.
  useEffect(() => {
    if (!usesBranches || branches.length > 0) return;
    const ctxList = branchCtx?.branches ?? [];
    if (ctxList.length > 0) {
      setBranches(ctxList.map((b) => ({ id: b.id, name: b.name, name_ar: (b as any).name_ar, name_en: (b as any).name_en, code: b.code })));
    }
  }, [usesBranches, branches.length, branchCtx?.branches]);

  useEffect(() => {
    if (!productId || mode !== 'edit' || !usesBranches) {
      setSelectedBranchIds([]);
      setBranchAvailability([]);
      setBranchQuantities({});
      branchQuantitiesRef.current = {};
      return;
    }
    (async () => {
      // Rehydration: fetch branch_inventory first (explicit branches + quantities) so save does not overwrite with 0
      try {
        const data = await apiRequest(`/admin/branch-inventory/product/${productId}`) as any;
        const ids = (Array.isArray(data?.branch_ids) ? data.branch_ids : []).map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n) && n > 0);
        const brs = Array.isArray(data?.branches) ? data.branches : [];
        setSelectedBranchIds(ids);
        // Rehydration: populate branchQuantities from API so inputs show and save correct values
        const qtyMap: Record<number, number> = {};
        const avail: Array<{ id: number; name?: string; name_ar?: string; name_en?: string; quantity: number }> = [];
        for (const b of brs) {
          const bid = Number((b as any).branch_id ?? (b as any).id);
          if (!bid) continue;
          const q = Number((b as any).quantity ?? 0);
          qtyMap[bid] = Number.isNaN(q) ? 0 : q;
          avail.push({ id: bid, quantity: qtyMap[bid] });
        }
        for (const id of ids) {
          const n = Number(id);
          if (n && qtyMap[n] === undefined) qtyMap[n] = 0;
        }
        setBranchQuantities(qtyMap);
        branchQuantitiesRef.current = qtyMap;
        setBranchAvailability(avail);
      } catch {
        try {
          const data = await apiRequest(`/admin/inventory/product-branches/${productId}`) as any;
          const branch_ids = (Array.isArray(data?.branch_ids) ? data.branch_ids : []).map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n) && n > 0);
          setSelectedBranchIds(branch_ids);
          const availability = Array.isArray(data?.availability) ? data.availability : [];
          setBranchAvailability(availability);
          const qtyMap: Record<number, number> = {};
          for (const a of availability) {
            const bid = Number((a as any).id ?? (a as any).branch_id);
            if (!bid) continue;
            const q = (a as any).quantity ?? (a as any).qty ?? 0;
            qtyMap[bid] = Number.isNaN(Number(q)) ? 0 : Number(q);
          }
          for (const bid of branch_ids) {
            const id = Number(bid);
            if (id && qtyMap[id] === undefined) qtyMap[id] = 0;
          }
          setBranchQuantities(qtyMap);
          branchQuantitiesRef.current = qtyMap;
        } catch {
          setSelectedBranchIds([]);
          setBranchAvailability([]);
          setBranchQuantities({});
          branchQuantitiesRef.current = {};
        }
      }
    })();
  }, [productId, mode, usesBranches]);

  const formImageUrls = useMemo(() => form.imageUrl.split(/[\n,]+/).map((s) => s.trim()).filter(isValidImageUrl), [form.imageUrl]);

  // Use branches from GET /api/products/:id when in edit; else from /api/branches (no /admin/branches).
  const productBranchesForDisplay =
    mode === 'edit' && initialProduct && Array.isArray((initialProduct as any).branches) && (initialProduct as any).branches.length > 0
      ? (initialProduct as any).branches.map((b: any) => {
          const branchName = (b.branch_name && String(b.branch_name).trim()) || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch');
          return {
            id: Number(b.branch_id ?? b.id ?? 0),
            name_ar: branchName,
            name_en: branchName,
            name: branchName,
          };
        })
      : null;
  const displayBranches =
    branches.length > 0
      ? branches
      : productBranchesForDisplay && productBranchesForDisplay.length > 0
        ? productBranchesForDisplay
        : (branchCtx?.branches?.length
            ? branchCtx.branches.map((b) => ({ id: b.id, name: b.name, name_ar: (b as any).name_ar, name_en: (b as any).name_en, code: b.code }))
            : []);

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
        minStockLevel: parseInt(form.minStockLevel || '5', 10),
        productionDate: form.productionDate?.trim() || undefined,
        expiryDate: form.expiryDate?.trim() || undefined,
        cartonPacksCount: form.cartonPacksCount ? parseInt(form.cartonPacksCount, 10) : undefined,
        packUnitsCount: form.packUnitsCount ? parseInt(form.packUnitsCount, 10) : undefined,
        pieceBuyPrice: form.pieceBuyPrice !== '' ? parseFloat(form.pieceBuyPrice) : undefined,
        pieceSellPrice: form.pieceSellPrice !== '' ? parseFloat(form.pieceSellPrice) : undefined,
        packBuyPrice: form.packBuyPrice !== '' ? parseFloat(form.packBuyPrice) : undefined,
        packSellPrice: form.packSellPrice !== '' ? parseFloat(form.packSellPrice) : undefined,
        cartonBuyPrice: form.cartonBuyPrice !== '' ? parseFloat(form.cartonBuyPrice) : undefined,
        cartonSellPrice: form.cartonSellPrice !== '' ? parseFloat(form.cartonSellPrice) : undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        galleryUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
        descriptionShort: form.descriptionShort || undefined,
        descriptionLong: form.descriptionLong || undefined,
        warrantyText: form.warrantyText || undefined,
        returnPolicyText: form.returnPolicyText || undefined,
        specs: form.specs?.length ? form.specs : undefined,
        discountType: form.discountType,
        discountValue: form.discountValue ? parseFloat(form.discountValue) : null,
        discountActive: form.discountActive,
        taxRateId: form.taxRateId !== '' && form.taxRateId != null ? Number(form.taxRateId) : null,
      };

      if (usesBranches) {
        const selectedBranches = Array.isArray(selectedBranchIds) ? selectedBranchIds : [];
        const branchesPayload: { branch_id: number; quantity: number }[] = [];
        const defaultBranchId = Number(branchCtx?.branches?.[0]?.id) || 0;
        for (const branchId of selectedBranches) {
          const id = Number(branchId);
          const effectiveId = id > 0 ? id : defaultBranchId;
          if (effectiveId <= 0) continue;
          const qty = Number(branchQuantitiesRef.current[id] ?? branchQuantitiesRef.current[effectiveId] ?? branchQuantities[id] ?? branchQuantities[effectiveId] ?? 0);
          if (Number.isNaN(qty) || qty < 0) {
            const msg = language === 'ar'
              ? `الكمية للفرع غير صالحة أو مفقودة. يرجى إدخال رقم >= 0.`
              : `Quantity for branch is missing or invalid. Please enter a number >= 0.`;
            showToast(msg, 'error');
            setSaving(false);
            return;
          }
          branchesPayload.push({ branch_id: effectiveId, quantity: qty });
        }
        if (branchesPayload.length === 0 && (displayBranches.length === 1 || selectedBranches.length === 1) && defaultBranchId > 0) {
          const bid = selectedBranches[0] != null ? Number(selectedBranches[0]) : 0;
          const qty = Number(branchQuantitiesRef.current[bid] ?? branchQuantitiesRef.current[defaultBranchId] ?? 0);
          branchesPayload.push({ branch_id: defaultBranchId, quantity: Math.max(0, qty) });
        }
        payload.branches = branchesPayload;
      } else {
        // Normal shop: send manual stock; safeguard so it is not dropped before API call.
        const manualStockInput = (form.stockQuantity ?? '').trim();
        if (manualStockInput !== '') {
          const num = Number(manualStockInput);
          payload.stock_quantity = !Number.isNaN(num) ? Math.max(0, num) : (manualStockInput as any);
        }
        delete (payload as any).branches;
      }

      const branchSaveHeaders: Record<string, string> = {};
      if (usesBranches && Array.isArray((payload as any).branches) && (payload as any).branches.length > 0) {
        const first = (payload as any).branches[0];
        const bid = Number(branchCtx?.activeBranchId ?? first?.branch_id ?? 0);
        if (bid > 0) branchSaveHeaders['X-Branch-Id'] = String(bid);
      }

      if (mode === 'edit' && productId) {
        await apiRequest(`/products/${productId}`, {
          method: 'PUT',
          headers: Object.keys(branchSaveHeaders).length ? branchSaveHeaders : undefined,
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          headers: Object.keys(branchSaveHeaders).length ? branchSaveHeaders : undefined,
          body: JSON.stringify(payload),
        });
      }

      showToast(language === 'ar' ? 'تم حفظ المنتج بنجاح' : 'Product saved successfully.', 'success');
      setForm(EMPTY_PRODUCT_FORM);
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
  }, [form, mode, productId, language, showToast, onSuccess, onError, selectedBranchIds, branchQuantities, branches, displayBranches, usesBranches, branchCtx?.activeBranchId, branchCtx?.branches]);

  const editingProduct = productId ? products.find((p) => p.id === productId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-2xl bg-[#0b1220] border border-cyan-500/30 flex flex-col overflow-hidden">
          <div className="flex justify-between px-6 py-4 border-b border-cyan-500/20">
            <h2 className="text-lg font-bold text-cyan-200">{title}</h2>
            <button type="button" onClick={() => { setFormScannerTarget(null); onCancel(); }} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
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
                placeholder={t('inventory.minStock')}
                value={form.minStockLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, minStockLevel: e.target.value }))}
              />
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cyan-300/80 mb-1">{language === 'ar' ? 'تاريخ الإنتاج (اختياري)' : 'Production date (optional)'}</label>
                  <input
                    type="date"
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    value={form.productionDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, productionDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-300/80 mb-1">{language === 'ar' ? 'تاريخ انتهاء الصلاحية (اختياري)' : 'Expiry date (optional)'}</label>
                  <input
                    type="date"
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    value={form.expiryDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2 border-t border-cyan-500/15">
                <span className="text-xs text-cyan-300/80">{language === 'ar' ? 'خصم المنتج' : 'Product discount'}</span>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as 'none' | 'percent' | 'fixed' }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="none">{language === 'ar' ? 'بدون خصم' : 'None'}</option>
                  <option value="percent">{language === 'ar' ? 'نسبة مئوية (%)' : 'Percent (%)'}</option>
                  <option value="fixed">{language === 'ar' ? 'مبلغ ثابت (EGP)' : 'Fixed (EGP)'}</option>
                </select>
                {form.discountType !== 'none' && (
                  <input
                    type="number"
                    min="0"
                    step={form.discountType === 'percent' ? '1' : '0.01'}
                    className="w-24 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={form.discountType === 'percent' ? '10' : '5'}
                    value={form.discountValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.discountActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountActive: e.target.checked }))}
                    className="rounded border-cyan-500/30"
                  />
                  {language === 'ar' ? 'مفعّل' : 'Active'}
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-cyan-300/80 mb-1">{language === 'ar' ? 'ضريبة الصنف' : 'Product tax'}</label>
                <select
                  value={form.taxRateId === '' ? '' : String(form.taxRateId)}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxRateId: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm cursor-pointer"
                  aria-label={language === 'ar' ? 'ضريبة الصنف' : 'Product tax'}
                >
                  <option value="">{language === 'ar' ? 'بدون ضريبة' : 'No tax'}</option>
                  {taxRates.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name} — {tr.type === 'percentage' ? `${tr.rate}%` : (language === 'ar' ? `${tr.rate} (ثابت)` : `${tr.rate} (fixed)`)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {language === 'ar'
                    ? 'الضريبة المختارة ستظهر في الفاتورة عند بيع هذا الصنف (نسبة أو قيمة حسب إعداد الضريبة).'
                    : 'The selected tax will appear on the invoice when this product is sold (rate or amount as set in the tax rule).'}
                </p>
              </div>
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
              {usesBranches && (
              <div className="md:col-span-2">
                <label className="block text-xs text-cyan-300/80 mb-2">{language === 'ar' ? 'متوفر في الفروع' : 'Available in Branches'}</label>
                <div className="space-y-2">
                  {displayBranches.length === 1 ? (
                    (() => {
                      const b = displayBranches[0];
                      const bid = Number(b.id) || Number(branchCtx?.branches?.[0]?.id);
                      const qty = branchQuantities[bid] ?? branchQuantities[Number(b.id)] ?? 0;
                      const rawLabel = String(language === 'ar' ? (b.name_ar ?? b.name) : (b.name_en ?? b.name) || b.code || '').trim();
                      const label = rawLabel || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch');
                      return (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-slate-200">
                            {language === 'ar' ? 'اسم الفرع: ' : 'Branch name: '}
                            <span>{label}</span>
                          </p>
                          <label className="flex items-center gap-2 text-sm text-slate-300">
                            <span>{language === 'ar' ? 'الكمية:' : 'Quantity:'}</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-20 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-2 py-1 text-sm"
                              value={qty}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const num = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                                const next = { ...branchQuantitiesRef.current, [bid]: num };
                                branchQuantitiesRef.current = next;
                                setBranchQuantities(next);
                              }}
                              placeholder="0"
                            />
                          </label>
                        </div>
                      );
                    })()
                  ) : (
                    displayBranches.map((b) => (
                      <div key={b.id} className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={selectedBranchIds.includes(Number(b.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const branchKey = Number(b.id);
                                const existingQty =
                                  branchAvailability.find((a) => Number(a.id) === branchKey)?.quantity ??
                                  branchQuantities[branchKey] ??
                                  0;
                                setSelectedBranchIds((prev) => [...prev, branchKey]);
                                setBranchQuantities((prev) => {
                                  const next = { ...prev, [branchKey]: typeof existingQty === 'number' ? existingQty : Number(existingQty) || 0 };
                                  branchQuantitiesRef.current = next;
                                  return next;
                                });
                              } else {
                                const branchKey = Number(b.id);
                                setSelectedBranchIds((prev) => prev.filter((id) => Number(id) !== branchKey));
                                setBranchQuantities((prev) => {
                                  const next = { ...prev };
                                  delete next[branchKey];
                                  branchQuantitiesRef.current = next;
                                  return next;
                                });
                              }
                            }}
                            className="rounded border-cyan-500/30"
                          />
                          <span>{String(language === 'ar' ? (b.name_ar ?? b.name) : (b.name_en ?? b.name) || b.code || '').trim() || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch')}</span>
                        </label>
                        {selectedBranchIds.includes(Number(b.id)) && (
                          <label className="flex items-center gap-2 text-sm text-slate-300">
                            <span>{language === 'ar' ? 'الكمية:' : 'Quantity:'}</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-20 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-2 py-1 text-sm"
                              value={branchQuantities[Number(b.id)] ?? ''}
                              onChange={(e) => {
                                const branchKey = Number(b.id);
                                const raw = e.target.value;
                                const num = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                                const next = { ...branchQuantitiesRef.current, [branchKey]: num };
                                branchQuantitiesRef.current = next;
                                setBranchQuantities(next);
                              }}
                              placeholder="0"
                            />
                          </label>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {displayBranches.length === 1 ? (
                  (() => {
                    const only = displayBranches[0];
                    const bid = Number(only?.id) || Number(branchCtx?.branches?.[0]?.id);
                    const total = Number(branchQuantities[bid] ?? branchQuantities[Number(only?.id)] ?? 0) || 0;
                    return (
                      <p className="text-xs text-slate-400 mt-2">
                        {language === 'ar' ? 'الإجمالي: ' : 'Total: '}
                        {total}
                      </p>
                    );
                  })()
                ) : selectedBranchIds.length > 0 ? (
                  <p className="text-xs text-slate-400 mt-2">
                    {language === 'ar' ? 'الإجمالي: ' : 'Total: '}
                    {selectedBranchIds.reduce((sum, bid) => sum + (Number(branchQuantities[Number(bid)]) || 0), 0)}
                  </p>
                ) : null}
              </div>
              )}
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
            <button type="button" onClick={() => { setFormScannerTarget(null); onCancel(); }} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed min-w-[100px] flex items-center justify-center gap-2">
              {saving && <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />}
              {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('common.save')}
            </button>
          </div>
          </form>
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
