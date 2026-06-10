'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Printer, ShoppingCart, Trash2, X, Image as ImageIcon, MapPin, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { createPosSaleOrInvoice } from '../../lib/offline-api';
import { useRouteGuard } from '../guards/useRouteGuard';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { getDisplayStock } from '@/lib/stock';
import { getPlanFeatures } from '../permissions';
import { Sidebar } from '@/components/Sidebar';
import { getActiveShopId } from '@/components/ShopSwitcher';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useBranch, getBranchDisplayName } from '../contexts/BranchContext';

function applyProductDiscount(
  price: number,
  discountType: string,
  discountValue: number | null,
  discountActive: boolean | number
): number {
  if (!discountActive || discountType === 'none' || discountValue == null) return Math.round(price * 100) / 100;
  if (discountType === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(discountValue)));
    return Math.round(price * (1 - pct / 100) * 100) / 100;
  }
  if (discountType === 'fixed') {
    return Math.round(Math.max(0, price - Math.max(0, Number(discountValue))) * 100) / 100;
  }
  return Math.round(price * 100) / 100;
}

interface Category {
  id: number;
  name_en: string;
  name_ar: string;
}

interface ProductUnit {
  id: number;
  name_ar: string;
  name_en?: string;
  factor_to_base: number;
  level: number;
}

interface Product {
  id: number;
  name_en: string;
  name_ar: string;
  brand: string;
  sell_price: number;
  stock_quantity: number;
  available_stock?: number;
  category_id: number;
  image_url?: string;
  sku?: string;
  barcode?: string;
  qr_code?: string;
  units?: ProductUnit[];
  discount_active?: number | boolean;
  discount_type?: string;
  discount_value?: number | null;
}

function resolveImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return null;
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
  factorToBase: number;
  unitId?: number;
  unitNameAr?: string;
  unitNameEn?: string;
  applyDiscount: boolean;
  sellPrice: number;
  unitDiscount: number;
  discountType?: string | null;
  discountValue?: number | null;
}

export default function PosPage() {
  const { t, language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { isOnline, refreshQueue } = useOffline();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'pos', effectiveRole, showDenied: true });
  const { currency, symbol } = useCurrency();
  const planFeatures = getPlanFeatures(user?.package);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'uncategorized' | 'all' | null>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [taxPreview, setTaxPreview] = useState<{
    subtotal: number;
    totalTax: number;
    discountTotal: number;
    grandTotal: number;
    totalBeforeDiscount: number;
  } | null>(null);
  const [taxPreviewLoading, setTaxPreviewLoading] = useState(false);
  const taxPreviewRef = useRef<typeof taxPreview>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [selectedUnitLevel, setSelectedUnitLevel] = useState<number>(0);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [business, setBusiness] = useState<any>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [availabilityModal, setAvailabilityModal] = useState<{ productId: number; productName: string } | null>(null);
  const [availabilityData, setAvailabilityData] = useState<{ branches: Array<{ branchNameAr: string; branchNameEn: string; qty: number }> } | null>(null);
  const [alerts, setAlerts] = useState<{
    lowStock: Array<{ id: number; name_en: string; name_ar: string; stock_quantity: number; min_stock_level: number }>;
    lowStockCount: number;
    slowSummary: { deadCount: number; slowCount: number };
  } | null>(null);
  const branchCtx = useBranch();
  const isBranchAccount = user?.package === 'branches';
  const handleScanMatchRef = useRef<(value: string) => void>(() => {});
  const scanSessionRef = useRef<{
    buffer: string;
    lastTs: number;
    scanning: boolean;
    target: HTMLElement | null;
    targetValue: string | null;
  }>({ buffer: '', lastTs: 0, scanning: false, target: null, targetValue: null });

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadBusinessProfile();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/pos/alerts');
        if (!cancelled) {
          setAlerts({
            lowStock: data.lowStock || [],
            lowStockCount: data.lowStockCount ?? 0,
            slowSummary: data.slowSummary || { deadCount: 0, slowCount: 0 },
          });
        }
      } catch {
        if (!cancelled) setAlerts(null);
      }
    })();
    return () => { cancelled = true; };
  }, [branchCtx?.activeBranchId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!scanOpen) {
      scanInputRef.current?.focus();
    }
  }, [scanOpen]);

  const loadCategories = async () => {
    try {
      const data = await apiRequest('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiRequest('/products?includeUnits=1');
      setProducts(data);
      console.log('POS Products Loaded:', Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error('Failed to load products:', error);
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

  const loadBusinessProfile = async () => {
    try {
      const data = await apiRequest('/shops/profile');
      setBusiness(data);
    } catch (error) {
      // ignore
    }
  };

  const filteredProducts = products.filter((product) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'uncategorized') return !product.category_id;
    if (selectedCategory) return product.category_id === selectedCategory;
    return true;
  });

  const availableCategories = categories.filter((category) =>
    products.some((product) => product.category_id === category.id)
  );

  const hasUncategorized = products.some((product) => !product.category_id);

  const getUnitForProduct = (product: Product, level: number): ProductUnit => {
    const units = product.units || [];
    const u = units.find((x) => x.level === level) || units[0] || { id: 0, name_ar: 'قطعة', factor_to_base: 1, level: 0 };
    return u;
  };

  const getUnitLabel = (unit: { name_ar?: string; name_en?: string } | null | undefined, locale: 'ar' | 'en') => {
    if (locale === 'ar') return unit?.name_ar || unit?.name_en || 'قطعة';
    return unit?.name_en || unit?.name_ar || 'Piece';
  };

  const getPaymentMethodLabel = (method: string | null | undefined, locale: 'ar' | 'en') => {
    const value = String(method || '').trim().toLowerCase();
    if (value === 'bank' || value === 'transfer' || value === 'bank_transfer') {
      return locale === 'ar' ? 'بنكي' : 'Bank';
    }
    if (value === 'card' || value === 'visa' || value === 'mastercard' || value === 'credit' || value === 'debit') {
      return locale === 'ar' ? 'بطاقة' : 'Card';
    }
    if (value === 'invoice') {
      return locale === 'ar' ? 'فاتورة' : 'Invoice';
    }
    if (value === 'on_account') {
      return locale === 'ar' ? 'دفع أجل' : 'On account';
    }
    if (value === 'cash') {
      return locale === 'ar' ? 'نقدي' : 'Cash';
    }
    return locale === 'ar' ? 'أخرى' : 'Other';
  };

  const addToCart = (product: Product, unit?: ProductUnit, priceOverride?: number) => {
    const u = unit ?? getUnitForProduct(product, selectedUnitLevel);
    const factor = Number(u?.factor_to_base ?? 1);
    const avail = getDisplayStock(product);
    if (avail < factor) return;

    const unitId = u?.id ?? 0;
    const unitNameAr = u?.name_ar || 'قطعة';
    const unitNameEn = u?.name_en || 'Piece';
    const sellPrice = priceOverride ?? Number((u as any)?.sell_price ?? product.sell_price ?? 0);
    const hasDiscount = Boolean(product.discount_active && product.discount_type && product.discount_type !== 'none');
    const applyDiscount = hasDiscount;
    const price = applyDiscount && hasDiscount
      ? applyProductDiscount(sellPrice, product.discount_type || 'none', product.discount_value ?? null, 1)
      : sellPrice;
    const unitDiscount = applyDiscount && hasDiscount ? Math.round((sellPrice - price) * 100) / 100 : 0;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && (item.unitId ?? 0) === unitId);
      if (existing) {
        const maxInUnit = Math.floor(avail / factor);
        if (existing.quantity >= maxInUnit) return prev;
        const nextQty = Math.min(existing.quantity + 1, maxInUnit);
        return prev.map((item) =>
          item.productId === product.id && (item.unitId ?? 0) === unitId
            ? { ...item, quantity: nextQty, total: nextQty * Number(item.price || 0) }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: language === 'ar' ? product.name_ar : product.name_en,
          price,
          quantity: 1,
          total: price,
          factorToBase: factor,
          unitId: unitId || undefined,
          unitNameAr,
          unitNameEn,
          applyDiscount,
          sellPrice,
          unitDiscount,
          discountType: product.discount_type || null,
          discountValue: product.discount_value ?? null,
        },
      ];
    });
  };

  const handleScanMatch = (value: string) => {
    void (async () => {
      const code = String(value || '').trim();
      if (!code) return;
      setScanValue(code);

      // Fast path: local cache
      let match = products.find(
        (product) => product.barcode === code || product.sku === code || product.qr_code === code
      );

      let matchedUnit: ProductUnit | undefined;
      let matchedPrice: number | undefined;

      if (!match) {
        try {
          const lookedUp = await apiRequest(`/products/lookup?code=${encodeURIComponent(code)}`);
          if (lookedUp?.id) {
            match = lookedUp as Product;
            if (lookedUp.unit) {
              matchedUnit = {
                id: lookedUp.unit.id ?? 0,
                name_ar: lookedUp.unit.name_ar ?? 'قطعة',
                name_en: lookedUp.unit.name_en ?? 'Piece',
                factor_to_base: lookedUp.unit.factor_to_base ?? 1,
                level: lookedUp.unit.level ?? 0,
              };
              matchedPrice = Number(lookedUp.unit.sell_price ?? lookedUp.sell_price ?? 0);
            }
            setProducts((prev) => {
              const exists = prev.some((p) => p.id === match!.id);
              const merged = { ...match!, units: match!.units ?? lookedUp.units ?? [] };
              return exists ? prev.map((p) => (p.id === match!.id ? merged : p)) : [merged, ...prev];
            });
          }
        } catch {
          // ignore lookup errors and fall back to "not found"
        }
      }

      if (match) {
        addToCart(match as Product, matchedUnit, matchedPrice);
        setScanMessage(language === 'ar' ? 'تمت إضافة المنتج' : 'Product added to cart.');
      } else {
        setScanMessage(language === 'ar' ? 'لم يتم العثور على المنتج' : 'Product not found.');
      }

      // Ready for the next scan
      setScanValue('');
      scanInputRef.current?.focus();
    })();
  };

  useEffect(() => {
    handleScanMatchRef.current = handleScanMatch;
  }, [handleScanMatch]);

  // Keyboard-wedge barcode scanners: capture fast key sequences + auto-add to cart
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SCAN_IDLE_MS = 250;
    const SCAN_INTER_CHAR_MS = 80;
    const SCAN_MIN_CHARS = 3;

    const isEditable = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase?.() || '';
      return tag === 'input' || tag === 'textarea' || (el as any).isContentEditable;
    };

    const restoreTargetValue = () => {
      const session = scanSessionRef.current;
      const target = session.target as any;
      if (!target || session.targetValue === null) return;
      if (typeof target.value === 'string') {
        try {
          target.value = session.targetValue;
        } catch {
          // ignore
        }
      }
    };

    const reset = () => {
      scanSessionRef.current.buffer = '';
      scanSessionRef.current.lastTs = 0;
      scanSessionRef.current.scanning = false;
      scanSessionRef.current.target = null;
      scanSessionRef.current.targetValue = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const scanInput = scanInputRef.current;

      // Let the dedicated scan input handle manual typing/Enter
      if (scanInput && active === scanInput) return;

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;
      const isTerminator = key === 'Enter' || key === 'Tab';
      const isChar = key.length === 1;

      const session = scanSessionRef.current;

      if (isTerminator) {
        const code = session.buffer.trim();
        if (session.scanning && code.length >= SCAN_MIN_CHARS) {
          // Prevent the terminator from submitting forms / adding newlines
          e.preventDefault();
          e.stopPropagation();

          restoreTargetValue();
          reset();

          handleScanMatchRef.current(code);
          scanInputRef.current?.focus();
          return;
        }
        reset();
        return;
      }

      if (!isChar) return;

      const now = e.timeStamp || Date.now();
      const gap = session.lastTs ? now - session.lastTs : 0;

      if (!session.buffer || gap > SCAN_IDLE_MS) {
        session.buffer = key;
        session.lastTs = now;
        session.scanning = false;
        session.target = active;
        session.targetValue = isEditable(active) ? String((active as any).value ?? '') : null;
        return;
      }

      session.buffer += key;
      session.lastTs = now;

      if (!session.scanning && gap > 0 && gap <= SCAN_INTER_CHAR_MS && session.buffer.length >= SCAN_MIN_CHARS) {
        session.scanning = true;
      }

      if (session.scanning) {
        // Stop the scanner from polluting whichever input currently has focus
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const updateQuantity = (productId: number, delta: number, itemKey?: { unitId?: number; factorToBase?: number }) => {
    setCart((prev) => {
      const item = prev.find((i) => {
        if (i.productId !== productId) return false;
        if (itemKey?.unitId != null) return (i.unitId ?? 0) === itemKey.unitId;
        if (itemKey?.factorToBase != null) return i.factorToBase === itemKey.factorToBase;
        return true;
      });
      if (!item) return prev;

      const product = products.find((p) => p.id === productId);
      if (!product) return prev;

      const avail = getDisplayStock(product);
      const maxInUnit = Math.floor(avail / item.factorToBase);
      const newQuantity = item.quantity + delta;
      const sameItem = (x: typeof item) => x.productId === productId && ((item.unitId != null && x.unitId === item.unitId) || (item.unitId == null && x.factorToBase === item.factorToBase));
      if (newQuantity <= 0) {
        return prev.filter((i) => !sameItem(i));
      }
      if (newQuantity > maxInUnit) return prev;

      return prev.map((i) => (sameItem(i) ? { ...i, quantity: newQuantity, total: newQuantity * i.price } : i));
    });
  };

  const toggleApplyDiscount = (productId: number, itemKey?: { unitId?: number; factorToBase?: number }) => {
    setCart((prev) =>
      prev.map((item) => {
        const same = item.productId === productId && (itemKey?.unitId == null || item.unitId === itemKey.unitId) && (itemKey?.factorToBase == null || item.factorToBase === itemKey.factorToBase);
        if (!same) return item;
        const nextApply = !item.applyDiscount;
        let nextUnitDiscount = 0;
        if (nextApply && item.discountType && item.discountType !== 'none' && item.discountValue != null) {
          if (item.discountType === 'percent') {
            nextUnitDiscount = Math.round(item.sellPrice * (Number(item.discountValue) / 100) * 100) / 100;
          } else {
            nextUnitDiscount = Math.round(Math.min(item.sellPrice, Math.max(0, Number(item.discountValue))) * 100) / 100;
          }
        }
        const effectivePrice = nextApply ? item.sellPrice - nextUnitDiscount : item.sellPrice;
        const roundedPrice = Math.round(effectivePrice * 100) / 100;
        return {
          ...item,
          applyDiscount: nextApply,
          price: roundedPrice,
          unitDiscount: nextUnitDiscount,
          total: item.quantity * roundedPrice,
        };
      })
    );
  };

  const removeFromCart = (productId: number, itemKey?: { unitId?: number; factorToBase?: number }) => {
    setCart((prev) =>
      itemKey
        ? prev.filter((item) => {
            if (item.productId !== productId) return true;
            if (itemKey.unitId != null) return (item.unitId ?? 0) !== itemKey.unitId;
            if (itemKey.factorToBase != null) return item.factorToBase !== itemKey.factorToBase;
            return false;
          })
        : prev.filter((item) => item.productId !== productId)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalBeforeDiscount = cart.reduce((sum, item) => sum + item.quantity * item.sellPrice, 0);
  const discountTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitDiscount, 0);

  useEffect(() => {
    taxPreviewRef.current = taxPreview;
  }, [taxPreview]);

  useEffect(() => {
    if (cart.length === 0) {
      setTaxPreview(null);
      setTaxPreviewLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setTaxPreviewLoading(true);
      try {
        const items = cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          factorToBase: item.factorToBase,
          unitId: item.unitId,
          applyDiscount: item.applyDiscount,
        }));
        const data = await apiRequest('/pos/preview-totals', {
          method: 'POST',
          body: JSON.stringify({ items }),
        });
        if (!cancelled && data && typeof data.grandTotal === 'number') {
          setTaxPreview({
            subtotal: Number(data.subtotal) || 0,
            totalTax: Number(data.totalTax) || 0,
            discountTotal: Number(data.discountTotal) || 0,
            grandTotal: Number(data.grandTotal) || 0,
            totalBeforeDiscount: Number(data.totalBeforeDiscount) || 0,
          });
        }
      } catch {
        if (!cancelled) setTaxPreview(null);
      } finally {
        if (!cancelled) setTaxPreviewLoading(false);
      }
    };
    const id = window.setTimeout(run, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [cart]);

  const handleInvoicePayment = async () => {
    if (cart.length === 0 || isPrinting) return;
    printReceipt({}, 0, [], { draft: true });
  };

  const handleOnAccountPayment = async () => {
    if (cart.length === 0) return;
    const cName = (customer.name || '').trim();
    const cPhone = (customer.phone || '').trim();
    if (!cName || !cPhone) {
      toast.error(language === 'ar' ? 'الاسم والهاتف مطلوبان لعلى الحساب' : 'Customer name and phone required for on-account');
      return;
    }
    const activeShopId = getActiveShopId();
    if (!activeShopId && user?.role === 'super_admin') {
      toast.error(
        language === 'ar'
          ? 'اختر المتجر أولاً من قائمة المتاجر في أعلى الواجهة.'
          : 'Select a shop first from the shop switcher at the top.'
      );
      return;
    }
    if (!isOnline) {
      toast.error(language === 'ar' ? 'على الحساب يتطلب اتصالاً بالإنترنت' : 'On-account requires online connection');
      return;
    }
    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        factorToBase: item.factorToBase,
        unitId: item.unitId,
      }));
      const result = await apiRequest('/customer-debts/from-cart', {
        method: 'POST',
        body: JSON.stringify({
          items,
          customerName: cName,
          customerPhone: cPhone,
          customerAddress: (customer.address || '').trim() || undefined,
        }),
      });
      printDebtReceipt(result, cName, cPhone);
      clearCart();
      setCustomer({ name: '', phone: '', address: '' });
      loadProducts();
      toast.success(language === 'ar' ? 'تم إنشاء سند أجل' : 'On-account debt created');
    } catch (error: any) {
      console.error('[POS On-Account Error]', error);
      let msg: string;
      switch (error?.status) {
        case 400:
          msg = error?.message || (language === 'ar' ? 'البيانات غير مكتملة.' : 'Invalid data.');
          break;
        case 401:
          msg = language === 'ar' ? 'انتهت الجلسة. سجّل الدخول مرة أخرى.' : 'Session expired. Please log in again.';
          break;
        case 409:
          msg = language === 'ar' ? 'لا يمكن إتمام العملية بسبب المخزون.' : 'Cannot complete due to stock limits.';
          break;
        default:
          msg = error?.message || (language === 'ar' ? 'تعذر إتمام العملية.' : 'Operation failed.');
      }
      toast.error(msg);
    }
  };

  const printDebtReceipt = (result: any, cName: string, cPhone: string) => {
    setIsPrinting(true);
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      setIsPrinting(false);
      return;
    }
    const debt = result?.debt || result;
    const debtNumber = result?.debtNumber || debt?.debt_number || `DEBT-${debt?.id || ''}`;
    // Backend always returns grandTotal (total after tax) as totalAmount; use it for customer balance
    const grandTotal = Number(result?.grandTotal ?? result?.totalAmount ?? debt?.total_due ?? 0);
    const subtotal = Number(result?.subtotal ?? 0);
    const totalTax = Number(result?.totalTax ?? result?.total_tax ?? 0);
    const apiItems = Array.isArray(result?.items) ? result.items : [];
    const useApiItems = apiItems.length > 0;
    const storeName =
      language === 'ar'
        ? business?.business_name_ar || business?.business_name || business?.business_name_en
        : business?.business_name_en || business?.business_name || business?.business_name_ar;

    const debtItemsRows = useApiItems
      ? apiItems.map((item: any) => {
          const name = language === 'ar' ? (item.name_ar || item.name_en) : (item.name_en || item.name_ar);
          const qty = Number(item.quantity || 0);
          const unitLabel = getUnitLabel({ name_ar: item.unit_name_ar, name_en: item.unit_name_en }, language === 'ar' ? 'ar' : 'en');
          const qtyLabel = `${qty} ${unitLabel}`;
          const unitBeforeTax = Number(item.unit_price_before_tax) || 0;
          const taxRate = item.tax_rate != null ? Number(item.tax_rate) : 0;
          const taxAmt = Number(item.tax_amount) || 0;
          const lineAfterTax = Number(item.line_total_after_tax) || 0;
          const tid = item.tax_rate_id;
          const hasExplicitTaxRule = tid != null && tid !== '' && Number(tid) > 0;
          const taxLine =
            taxAmt > 0.005
              ? language === 'ar'
                ? `ضريبة: ${taxRate}% | ${formatCurrency(taxAmt, 'ar', currency, symbol)}`
                : `Tax: ${taxRate}% | ${formatCurrency(taxAmt, 'en', currency, symbol)}`
              : !hasExplicitTaxRule
                ? language === 'ar'
                  ? 'معفاه من الضرائيب'
                  : 'Exempt from taxes'
                : '';
          return `<tr><td class="col-item">${name}${taxLine ? `<div class="item-meta">${taxLine}</div>` : ''}</td><td class="col-qty">${qtyLabel}</td><td class="col-price">${formatCurrency(unitBeforeTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td><td class="col-total">${formatCurrency(lineAfterTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>`;
        }).join('')
      : cart.map((item) => {
          const unitLabel = getUnitLabel({ name_ar: item.unitNameAr, name_en: item.unitNameEn }, language === 'ar' ? 'ar' : 'en');
          const qtyLabel = `${item.quantity} ${unitLabel}`;
          return `<tr><td class="col-item">${item.name}</td><td class="col-qty">${qtyLabel}</td><td class="col-price">${formatCurrency(item.price, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td><td class="col-total">${formatCurrency(item.total || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>`;
        }).join('');

    const displaySubtotal = subtotal > 0 ? subtotal : (totalTax > 0 ? grandTotal - totalTax : grandTotal);
    const hasSummary = grandTotal > 0;

    const receiptHTML = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
        <head>
          <meta charset="UTF-8">
          <title>${language === 'ar' ? 'سند أجل' : 'On-Account Receipt'} - ${debtNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Inter:wght@400;500;600&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              font-size: 13px;
              line-height: 1.6;
              background: #0f172a;
              color: #e2e8f0;
              padding: 24px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt {
              max-width: min(420px, 100%);
              margin: 0 auto;
              background: #fff;
              color: #111;
              border: 2px solid #f59e0b;
              border-radius: 8px;
              padding: 28px;
              display: flex;
              flex-direction: column;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 1px dotted #94a3b8;
            }
            .header .brand-name {
              font-family: 'Orbitron', monospace;
              font-size: 20px;
              font-weight: 700;
              color: #b45309;
              letter-spacing: 1px;
              margin: 8px 0 4px;
            }
            .header .subtitle { margin-top: 4px; font-size: 13px; color: #64748b; }
            .info { font-size: 12px; color: #475569; margin-bottom: 24px; line-height: 1.7; }
            .info p { margin-bottom: 6px; }
            .section-divider { border-top: 1px dotted #94a3b8; margin: 20px 0; }
            table.invoice-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              table-layout: fixed;
              border: 1px solid #e2e8f0;
            }
            table.invoice-table th, table.invoice-table td {
              padding: 10px 10px;
              vertical-align: top;
              border: 1px solid #e2e8f0;
              line-height: 1.5;
            }
            table.invoice-table thead th { font-weight: 700; color: #0f172a; background: #f8fafc; }
            table.invoice-table .col-item { width: 42%; min-width: 0; word-wrap: break-word; overflow-wrap: break-word; }
            table.invoice-table .col-qty { width: 10%; text-align: center; }
            table.invoice-table .col-price { width: 22%; text-align: right; }
            table.invoice-table .col-total { width: 26%; text-align: right; font-weight: 600; color: #b45309; }
            html[dir="rtl"] table.invoice-table .col-item { text-align: right; }
            html[dir="rtl"] table.invoice-table .col-qty,
            html[dir="rtl"] table.invoice-table .col-price,
            html[dir="rtl"] table.invoice-table .col-total { text-align: left; }
            .item-meta { font-size: 11px; color: #0f766e; font-weight: 600; margin-top: 4px; }
            .totals-section { margin-top: 20px; }
            table.totals-table {
              width: 100%;
              max-width: 280px;
              margin-left: auto;
              margin-right: 0;
              border-collapse: collapse;
              font-size: 13px;
              line-height: 1.6;
            }
            html[dir="rtl"] table.totals-table { margin-left: 0; margin-right: auto; }
            table.totals-table td { padding: 6px 0; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
            table.totals-table td:first-child { color: #475569; padding-right: 24px; }
            html[dir="rtl"] table.totals-table td:first-child { padding-right: 0; padding-left: 24px; }
            table.totals-table td:last-child { width: 110px; min-width: 110px; text-align: right; font-weight: 500; }
            html[dir="rtl"] table.totals-table td:last-child { text-align: left; }
            table.totals-table tr.grand-total td { border-bottom: none; padding-top: 14px; border-top: 2px dotted #f59e0b; }
            table.totals-table tr.grand-total td:first-child { font-weight: 700; font-size: 15px; color: #b45309; }
            table.totals-table tr.grand-total td:last-child { font-size: 16px; font-weight: 700; color: #b45309; }
            .footer { margin-top: 24px; padding-top: 16px; text-align: center; font-size: 10px; color: #94a3b8; line-height: 1.5; }
            @media print {
              @page { size: auto portrait; margin: 10mm; }
              body { padding: 0; background: #fff; color: #000; }
              .receipt { border-color: #94a3b8; box-shadow: none; max-width: 100%; page-break-inside: avoid; }
              .header .brand-name { color: #b45309; }
              .print-branch { font-weight: bold; margin-bottom: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="brand-name">${language === 'ar' ? 'سند أجل' : 'On-Account Receipt'}</div>
              <div class="subtitle">${storeName || 'Crown Services'}</div>
              <div class="print-store">${language === 'ar' ? 'المتجر: ' : 'Store: '}${String(storeName || '—').replace(/</g, '&lt;')}</div>
              <div class="print-branch">${language === 'ar' ? 'الفرع: ' : 'Branch: '}${String(isBranchAccount ? getBranchDisplayName(branchCtx.activeBranch, language) : (language === 'ar' ? 'الفرع الرئيسي' : 'Main Store')).replace(/</g, '&lt;')}</div>
            </div>
            <div class="info">
              <p>${language === 'ar' ? 'رقم السند' : 'Debt #'}: ${debtNumber}</p>
              <p>${language === 'ar' ? 'التاريخ' : 'Date'}: ${new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
              <p>${language === 'ar' ? 'العميل' : 'Customer'}: ${cName}</p>
              <p>${language === 'ar' ? 'الهاتف' : 'Phone'}: ${cPhone}</p>
            </div>
            <div class="section-divider"></div>
            <table class="invoice-table">
              <thead>
                <tr>
                  <th class="col-item">${language === 'ar' ? 'الصنف' : 'Item'}</th>
                  <th class="col-qty">${language === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th class="col-price">${language === 'ar' ? 'سعر الوحدة (قبل الضريبة)' : 'Unit price (before tax)'}</th>
                  <th class="col-total">${language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>${debtItemsRows}</tbody>
            </table>
            <div class="section-divider"></div>
            <div class="totals-section">
              <table class="totals-table">
                ${hasSummary ? `
                <tr><td>${language === 'ar' ? 'المجموع قبل الضريبة' : 'Subtotal (before tax)'}</td><td>${formatCurrency(displaySubtotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                ${totalTax > 0 ? `<tr><td>${language === 'ar' ? 'إجمالي الضريبة' : 'Tax total'}</td><td style="color:#0f766e;font-weight:600;">${formatCurrency(totalTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>` : ''}
                ` : ''}
                <tr class="grand-total"><td>${language === 'ar' ? 'المبلغ المستحق (بعد الضريبة)' : 'Amount Due (after tax)'}</td><td>${formatCurrency(grandTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
              </table>
            </div>
            <div class="footer">
              <p>${language === 'ar' ? 'يُسدد في صفحة دفع أجل' : 'Pay at On-Account page'}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    setTimeout(() => {
      receiptWindow.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleSalePayment = async (paymentMethod: 'cash' | 'bank') => {
    if (cart.length === 0) return;
    const activeShopId = getActiveShopId();
    if (!activeShopId && user?.role === 'super_admin') {
      toast.error(
        language === 'ar'
          ? 'اختر المتجر أولاً من قائمة المتاجر في أعلى الواجهة.'
          : 'Select a shop first from the shop switcher at the top.'
      );
      return;
    }

    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        factorToBase: item.factorToBase,
        unitId: item.unitId,
        applyDiscount: item.applyDiscount,
      }));

      const payload = {
        items,
        paymentMethod,
        customerName: customer.name || undefined,
        customerPhone: customer.phone || undefined,
        customerAddress: customer.address || undefined,
        branch_id: branchCtx.activeBranchId ?? undefined,
      };

      const sale = await createPosSaleOrInvoice(payload, isOnline);
      if (isOnline) {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('crown-dashboard-refresh', { detail: { saleId: sale.saleId } }));
        let printCount = 0;
        try {
          const printInfo = await apiRequest(`/invoices/${sale.saleId}/print`, { method: 'POST' });
          printCount = Number(printInfo?.printCount || 0);
        } catch {
          // If print counter fails, still print the receipt
        }
        try {
          const detail = await apiRequest(`/sales/${sale.saleId}/items`);
          const saleItems = (detail?.items ?? detail) || [];
          const receiptSale = { ...(sale.sale || {}), invoiceNumber: sale.invoiceNumber ?? sale.sale?.invoice_number, saleId: sale.saleId };
          printReceipt(receiptSale, printCount, Array.isArray(saleItems) ? saleItems : [], { paymentMethod });
        } catch {
          const receiptSale = { ...(sale.sale || {}), invoiceNumber: sale.invoiceNumber ?? sale.sale?.invoice_number, saleId: sale.saleId };
          printReceipt(receiptSale, printCount, [], { paymentMethod });
        }
      } else {
        await refreshQueue();
        printReceipt({ ...(sale.sale || {}), invoiceNumber: sale.invoiceNumber, saleId: sale.saleId }, 0, [], { paymentMethod });
        toast.success(language === 'ar' ? 'تمت الإضافة إلى قائمة الانتظار' : 'Queued for sync when online');
      }

      clearCart();
      setCustomer({ name: '', phone: '', address: '' });
      if (isOnline) loadProducts();
    } catch (error: any) {
      console.error('[POS Payment Error]', {
        endpoint: error?.endpoint,
        status: error?.status,
        message: error?.message,
        body: error?.body,
      });
      let msg: string;
      switch (error?.status) {
        case 400:
          msg =
            language === 'ar'
              ? 'البيانات غير مكتملة أو المتجر غير محدد. راجع الأصناف والمتجر المختار.'
              : 'Invalid data or missing shop. Please check items and selected shop.';
          break;
        case 401:
          msg =
            language === 'ar'
              ? 'انتهت جلسة الدخول. برجاء تسجيل الدخول مرة أخرى.'
              : 'Session expired. Please log in again.';
          break;
        case 409:
          msg =
            language === 'ar'
              ? 'لا يمكن إتمام العملية بسبب المخزون أو قيود الاشتراك.'
              : 'Sale cannot be completed due to stock or subscription limits.';
          break;
        default:
          msg =
            language === 'ar'
              ? 'تعذر إتمام الدفع. حاول مرة أخرى أو تحقق من الاتصال.'
              : 'Payment failed. Please try again or check your connection.';
      }
      toast.error(msg);
    }
  };

  const handleCashPayment = async () => {
    await handleSalePayment('cash');
  };

  const handleBankPayment = async () => {
    await handleSalePayment('bank');
  };

  const printReceipt = (
    sale: any,
    printCount?: number,
    saleItems?: any[],
    options?: { draft?: boolean; paymentMethod?: string }
  ) => {
    setIsPrinting(true);

    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      setIsPrinting(false);
      return;
    }

    const isDraft = options?.draft === true;
    const duplicateLabel =
      !isDraft && printCount && printCount > 1 ? `Duplicate Copy No. ${Math.max(1, printCount - 1)}` : '';
    const statusLabel = isDraft ? (language === 'ar' ? 'غير معتمدة' : 'Draft') : duplicateLabel;
    const invoiceNumberDisplay = isDraft ? '—' : (sale.invoiceNumber || sale.saleId);
    const paymentMethodLabel = isDraft
      ? (language === 'ar' ? 'غير مدفوع' : 'Unpaid')
      : getPaymentMethodLabel(options?.paymentMethod || sale?.payment_method, language === 'ar' ? 'ar' : 'en');

    const storeName =
      language === 'ar'
        ? business?.business_name_ar || business?.business_name || business?.business_name_en
        : business?.business_name_en || business?.business_name || business?.business_name_ar;

    const useServerItems = Array.isArray(saleItems) && saleItems.length > 0;
    let receiptSubtotal = 0;
    let receiptTaxTotal = 0;
    let receiptGrandTotal = 0;
    if (useServerItems) {
      receiptSubtotal = saleItems.reduce((s, i) => s + (Number(i.line_total_before_tax) || Number(i.total_price) || 0), 0);
      receiptTaxTotal = saleItems.reduce((s, i) => s + (Number(i.tax_amount) || 0), 0);
      receiptGrandTotal = sale.subtotal != null ? Number(sale.grand_total) || Number(sale.total_amount) : saleItems.reduce((s, i) => s + (Number(i.line_total_after_tax) || Number(i.total_price) || 0), 0);
      if (sale.subtotal != null) receiptSubtotal = Number(sale.subtotal);
      if (sale.total_tax != null) receiptTaxTotal = Number(sale.total_tax);
      if (sale.grand_total != null || sale.total_amount != null) receiptGrandTotal = Number(sale.grand_total ?? sale.total_amount);
    } else {
      const pv = taxPreviewRef.current;
      if (pv && Number.isFinite(pv.grandTotal)) {
        receiptSubtotal = pv.subtotal;
        receiptTaxTotal = pv.totalTax;
        receiptGrandTotal = pv.grandTotal;
      } else {
        receiptGrandTotal = cart.reduce((s, i) => s + i.total, 0);
      }
    }

    const showReceiptTaxBreakdown =
      useServerItems ||
      (!useServerItems && taxPreviewRef.current != null && Number.isFinite(taxPreviewRef.current.grandTotal));

    const posItemsRows = useServerItems
      ? saleItems.map((item: any) => {
          const name = language === 'ar' ? (item.name_ar || item.name_en) : (item.name_en || item.name_ar);
          const qty = Number(item.quantity || 0);
          const unitLabel = getUnitLabel({ name_ar: item.unit_name_ar, name_en: item.unit_name_en }, language === 'ar' ? 'ar' : 'en');
          const qtyLabel = `${qty} ${unitLabel}`;
          const lineBeforeTax = Number(item.line_total_before_tax) || Number(item.total_price) || 0;
          const lineAfterTax = Number(item.line_total_after_tax) ?? Number(item.total_price) ?? 0;
          const unitPriceBeforeTax = qty > 0 ? Math.round((lineBeforeTax / qty) * 100) / 100 : 0;
          const taxRate = item.tax_rate != null ? Number(item.tax_rate) : 0;
          const taxAmt = item.tax_amount != null ? Number(item.tax_amount) : 0;
          const tid = item.tax_rate_id;
          const hasExplicitTaxRule = tid != null && tid !== '' && Number(tid) > 0;
          const taxLine =
            taxAmt > 0.005
              ? language === 'ar'
                ? `ضريبة: ${taxRate}% | ${formatCurrency(taxAmt, 'ar', currency, symbol)}`
                : `Tax: ${taxRate}% | ${formatCurrency(taxAmt, 'en', currency, symbol)}`
              : !hasExplicitTaxRule
                ? language === 'ar'
                  ? 'معفاه من الضرائيب'
                  : 'Exempt from taxes'
                : '';
          return `<tr><td class="col-item">${name}${taxLine ? `<div class="item-meta">${taxLine}</div>` : ''}</td><td class="col-qty">${qtyLabel}</td><td class="col-price">${formatCurrency(unitPriceBeforeTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td><td class="col-total">${formatCurrency(Number(lineAfterTax), language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>`;
        }).join('')
      : cart.map((item) => {
          const discountLine = item.applyDiscount && item.unitDiscount > 0
            ? (item.discountType === 'percent'
                ? (language === 'ar' ? `خصم: ${item.discountValue}% (وفر ${formatCurrency(item.quantity * item.unitDiscount, 'ar', currency, symbol)})` : `Discount: ${item.discountValue}% (saved ${formatCurrency(item.quantity * item.unitDiscount, 'en', currency, symbol)})`)
                : (language === 'ar' ? `خصم: ${formatCurrency(item.unitDiscount, 'ar', currency, symbol)}` : `Discount: ${formatCurrency(item.unitDiscount, 'en', currency, symbol)}`))
            : '';
          const unitLabel = getUnitLabel({ name_ar: item.unitNameAr, name_en: item.unitNameEn }, language === 'ar' ? 'ar' : 'en');
          const qtyLabel = `${item.quantity} ${unitLabel}`;
          return `<tr><td class="col-item">${item.name}${discountLine ? `<div class="item-meta">${discountLine}</div>` : ''}</td><td class="col-qty">${qtyLabel}</td><td class="col-price">${formatCurrency(item.price, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td><td class="col-total">${formatCurrency(item.total || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>`;
        }).join('');

    const receiptCustomerName = String(sale?.customer_name || customer.name || '-');
    const receiptCustomerPhone = String(sale?.customer_phone || customer.phone || '-');
    const receiptCustomerAddress = String(sale?.customer_address || customer.address || '-');

    const receiptHTML = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
        <head>
          <meta charset="UTF-8">
          <title>${isDraft ? (language === 'ar' ? 'فاتورة غير معتمدة' : 'Draft Receipt') : `Receipt - ${invoiceNumberDisplay}`}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              font-size: 13px;
              line-height: 1.6;
              background: #0f172a;
              color: #e2e8f0;
              padding: 24px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt {
              width: 100%;
              max-width: min(800px, 100%);
              margin: 0 auto;
              background: #fff;
              color: #111827;
              border: 2px solid #06b6d4;
              border-radius: 8px;
              padding: 28px;
              display: flex;
              flex-direction: column;
              min-height: 70vh;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 1px dotted #64748b;
            }
            .header .brand-name {
              font-family: 'Orbitron', monospace;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #06b6d4;
              margin: 8px 0 4px;
            }
            .header .activity { font-size: 12px; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
            .print-branch { font-weight: 700; font-size: 14px; color: #0f172a; margin-top: 8px; margin-bottom: 4px; }
            .copy-label {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 999px;
              border: 2px solid #ef4444;
              color: #991b1b;
              background: #fee2e2;
              font-weight: 700;
              font-size: 11px;
            }
            .info { margin-bottom: 24px; font-size: 12px; color: #475569; line-height: 1.7; }
            .info p { margin-bottom: 6px; }
            .section-divider { border-top: 1px dotted #94a3b8; margin: 20px 0; }
            table.invoice-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              table-layout: fixed;
              border: 1px solid #e2e8f0;
            }
            table.invoice-table th, table.invoice-table td {
              padding: 10px 10px;
              vertical-align: top;
              border: 1px solid #e2e8f0;
              line-height: 1.5;
            }
            table.invoice-table thead th { font-weight: 700; color: #0f172a; background: #f8fafc; }
            table.invoice-table .col-item { width: 42%; min-width: 0; word-wrap: break-word; overflow-wrap: break-word; }
            table.invoice-table .col-qty { width: 10%; text-align: center; }
            table.invoice-table .col-price { width: 22%; text-align: right; }
            table.invoice-table .col-total { width: 26%; text-align: right; font-weight: 600; color: #0891b2; }
            html[dir="rtl"] table.invoice-table .col-item { text-align: right; }
            html[dir="rtl"] table.invoice-table .col-qty,
            html[dir="rtl"] table.invoice-table .col-price,
            html[dir="rtl"] table.invoice-table .col-total { text-align: left; }
            .item-meta { font-size: 11px; color: #0f766e; font-weight: 600; margin-top: 4px; }
            .totals-section { margin-top: 20px; }
            table.totals-table {
              width: 100%;
              max-width: 320px;
              margin-left: auto;
              margin-right: 0;
              border-collapse: collapse;
              font-size: 13px;
              line-height: 1.6;
            }
            html[dir="rtl"] table.totals-table { margin-left: 0; margin-right: auto; }
            table.totals-table td { padding: 6px 0; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
            table.totals-table td:first-child { color: #475569; padding-right: 24px; }
            html[dir="rtl"] table.totals-table td:first-child { padding-right: 0; padding-left: 24px; }
            table.totals-table td:last-child { width: 120px; min-width: 120px; text-align: right; font-weight: 500; }
            html[dir="rtl"] table.totals-table td:last-child { text-align: left; }
            table.totals-table tr.grand-total td { border-bottom: none; padding-top: 14px; border-top: 2px dotted #06b6d4; }
            table.totals-table tr.grand-total td:first-child { font-weight: 700; font-size: 16px; color: #06b6d4; }
            table.totals-table tr.grand-total td:last-child { font-size: 18px; font-weight: 700; color: #ec4899; }
            .footer { margin-top: auto; padding-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; letter-spacing: 0.5px; line-height: 1.5; }
            @media print {
              @page { size: auto portrait; margin: 10mm; }
              body { padding: 0; background: #fff; color: #000; }
              .receipt { border-color: #94a3b8; box-shadow: none; max-width: 100%; min-height: auto; page-break-inside: avoid; }
              .header .brand-name { color: #0891b2; }
              .footer { margin-top: 16px; }
              .print-branch { font-weight: bold; margin-bottom: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="content">
              <div class="header">
                ${business?.logo_url ? `<img src="${business.logo_url}" alt="Logo" style="height: 44px; display: block; margin: 0 auto;" />` : ''}
                <div class="brand-name">${storeName || 'Crown Services'}</div>
                <div class="activity">${business?.activity_type || (language === 'ar' ? 'تاج الخدمات' : 'Services ERP')}</div>
                <div class="print-store">${language === 'ar' ? 'المتجر: ' : 'Store: '}${String(storeName || '—').replace(/</g, '&lt;')}</div>
                <div class="print-branch">${language === 'ar' ? 'الفرع: ' : 'Branch: '}${String(isBranchAccount ? getBranchDisplayName(branchCtx.activeBranch, language) : (language === 'ar' ? 'الفرع الرئيسي' : 'Main Store')).replace(/</g, '&lt;')}</div>
                ${statusLabel ? `<div class="copy-label">${statusLabel}</div>` : ''}
              </div>
              <div class="info">
                <p>Invoice # / رقم الفاتورة: ${invoiceNumberDisplay}</p>
                <p>Date / التاريخ: ${new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                <p>Cashier / الكاشير: ${user?.username || 'N/A'}</p>
                <p>Customer / العميل: ${receiptCustomerName}</p>
                <p>Customer phone / هاتف العميل: ${receiptCustomerPhone}</p>
                <p>Customer address / عنوان العميل: ${receiptCustomerAddress}</p>
                <p>Payment / طريقة الدفع: ${paymentMethodLabel}</p>
                ${isDraft ? `<p>Status / الحالة: ${language === 'ar' ? 'غير معتمدة (لم يتم الدفع)' : 'Draft (not paid)'}</p>` : ''}
                ${business?.address ? `<p>Store address / عنوان المتجر: ${business.address}</p>` : ''}
                ${business?.contact_phone ? `<p>Store phone / هاتف المتجر: ${business.contact_phone}</p>` : ''}
              </div>
              <div class="section-divider"></div>
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th class="col-item">Item / الصنف</th>
                    <th class="col-qty">Qty / الكمية</th>
                    <th class="col-price">${language === 'ar' ? 'سعر الوحدة (قبل الضريبة)' : 'Unit price (before tax)'}</th>
                    <th class="col-total">${language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>${posItemsRows}</tbody>
              </table>
              <div class="section-divider"></div>
              <div class="totals-section">
                <table class="totals-table">
                  ${!useServerItems && discountTotal > 0 ? `
                  <tr><td>${language === 'ar' ? 'الإجمالي قبل الخصم' : 'Subtotal before discount'}</td><td>${formatCurrency(totalBeforeDiscount, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                  <tr><td>${language === 'ar' ? 'إجمالي الخصم' : 'Total discount'}</td><td style="color:#059669;">-${formatCurrency(discountTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                  ` : ''}
                  ${showReceiptTaxBreakdown ? `
                  <tr><td>${language === 'ar' ? 'المجموع قبل الضريبة' : 'Subtotal (before tax)'}</td><td>${formatCurrency(receiptSubtotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                  ${receiptTaxTotal > 0 ? `<tr><td>${language === 'ar' ? 'إجمالي الضريبة' : 'Tax total'}</td><td style="color:#0f766e;font-weight:600;">${formatCurrency(receiptTaxTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>` : ''}
                  ` : ''}
                  <tr class="grand-total"><td>${language === 'ar' ? 'الإجمالي النهائي (بعد الضريبة)' : 'Grand total (incl. tax)'}</td><td>${formatCurrency(receiptGrandTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                </table>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for your visit! / شكراً لزيارتكم!</p>
              <p>POWERED BY CROWN SERVICES | WWW.CROWNCS.ORG</p>
            </div>
          </div>
        </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();

    setTimeout(() => {
      receiptWindow.print();
      setIsPrinting(false);
    }, 500);
  };

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-cyan-200">{t('pos.title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Store Alerts Panel - visible to cashier, branch_manager, multi_branch_manager */}
          {alerts && (alerts.lowStockCount > 0 || alerts.slowSummary.deadCount > 0 || alerts.slowSummary.slowCount > 0) && (
            <div className="lg:col-span-3 neon-box rounded-xl p-4 border-amber-500/30">
              <h2 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {language === 'ar' ? 'تنبيهات المتجر' : 'Store Alerts'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-cyan-300 mb-2">
                    {language === 'ar' ? 'قليلة المخزون' : 'Low Stock'} ({alerts.lowStockCount})
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {alerts.lowStock.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex justify-between text-xs py-1 border-b border-cyan-500/10">
                        <span className="text-slate-200">{language === 'ar' ? p.name_ar : p.name_en}</span>
                        <span className="text-red-400 font-bold">
                          {p.stock_quantity} / {p.min_stock_level}
                        </span>
                      </div>
                    ))}
                    {alerts.lowStockCount > 10 && (
                      <div className="text-xs text-slate-500">
                        +{alerts.lowStockCount - 10} {language === 'ar' ? 'أخرى' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-300 mb-2">
                    {language === 'ar' ? 'راكد/بطيء' : 'Dead / Slow'} ({alerts.slowSummary.deadCount} / {alerts.slowSummary.slowCount})
                  </div>
                  <div className="text-xs text-slate-400">
                    {language === 'ar'
                      ? `راكد: ${alerts.slowSummary.deadCount} صنف — بطيء: ${alerts.slowSummary.slowCount} صنف`
                      : `Dead: ${alerts.slowSummary.deadCount} — Slow: ${alerts.slowSummary.slowCount}`}
                  </div>
                  <a
                    href="/store-admin/inventory/slow-moving"
                    className="mt-2 inline-block text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    {language === 'ar' ? 'عرض التفاصيل ←' : 'View details →'}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Categories & Products */}
          <div className="lg:col-span-2 space-y-6">
            <div className="neon-box rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">{language === 'ar' ? 'الوحدة:' : 'Unit:'}</span>
                {[
                  { level: 0, ar: 'قطعة', en: 'Piece' },
                  { level: 1, ar: 'علبة', en: 'Pack' },
                  { level: 2, ar: 'كرتونة', en: 'Carton' },
                ].map((opt) => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => setSelectedUnitLevel(opt.level)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedUnitLevel === opt.level
                        ? 'bg-cyan-600 text-white'
                        : 'border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                    }`}
                  >
                    {language === 'ar' ? opt.ar : opt.en}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={scanInputRef}
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && scanValue.trim()) {
                      handleScanMatch(scanValue.trim());
                      setScanValue('');
                    }
                  }}
                  placeholder={language === 'ar' ? 'امسح الباركود أو اكتب الكود' : 'Scan or type barcode/SKU'}
                  className="flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => setScanOpen(true)}
                  className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm"
                >
                  {language === 'ar' ? 'مسح بالكاميرا' : 'Scan with camera'}
                </button>
              </div>
              {scanMessage && <div className="mt-2 text-xs text-slate-400">{scanMessage}</div>}
            </div>
            {/* Categories */}
            <div className="neon-box rounded-xl p-4">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">{t('pos.categories')}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg transition ${
                    selectedCategory === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {language === 'ar' ? 'الكل' : 'All'}
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg transition ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {language === 'ar' ? cat.name_ar : cat.name_en}
                  </button>
                ))}
                {hasUncategorized && (
                  <button
                    onClick={() => setSelectedCategory('uncategorized')}
                    className={`px-4 py-2 rounded-lg transition ${
                      selectedCategory === 'uncategorized'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {language === 'ar' ? 'غير مصنف' : 'Uncategorized'}
                  </button>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <div className="neon-box rounded-xl p-4">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">{t('pos.products')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => {
                  const imageUrl = resolveImageUrl(product.image_url);
                  return (
                  <div
                    key={product.id}
                    className="p-4 bg-[#0d1422] rounded-xl hover:bg-[#111a2b] transition text-right border border-cyan-500/20 hover:border-cyan-400/50 relative"
                  >
                    <button
                      onClick={() => addToCart(product)}
                      disabled={getDisplayStock(product) <= 0}
                      className="w-full text-right disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <div className="h-20 w-full rounded-lg border border-cyan-500/30 bg-black/60 flex items-center justify-center mb-3">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt={product.name_ar} className="h-16 object-contain" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-cyan-400/60" />
                      )}
                    </div>
                    <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={product.name_ar}
                          className="h-8 w-8 rounded-md object-cover border border-cyan-500/20"
                        />
                      ) : (
                        <span className="h-8 w-8 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      )}
                      <span>{language === 'ar' ? product.name_ar : product.name_en}</span>
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">{product.brand}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-400 font-bold">
                        {formatCurrency(
                          (() => {
                            const u = getUnitForProduct(product, selectedUnitLevel);
                            return Number((u as any)?.sell_price ?? product.sell_price ?? 0);
                          })(),
                          language === 'ar' ? 'ar' : 'en',
                          currency,
                          symbol
                        )}
                      </span>
                      <span className={`text-xs ${getDisplayStock(product) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {getDisplayStock(product)} {t('pos.inStock')}
                      </span>
                    </div>
                  </button>
                    {planFeatures.branches && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openAvailabilityModal(product); }}
                        className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-lg py-1.5"
                        title={language === 'ar' ? 'متوفر في فروع أخرى' : 'Available in other branches'}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {language === 'ar' ? 'متوفر في فروع أخرى' : 'Available in other branches'}
                      </button>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <div className="neon-card rounded-xl p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {t('pos.cart')}
                </h2>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    {t('pos.cartEmpty')}
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={`${item.productId}-${item.unitId ?? 0}`} className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white flex-1">{item.name}</h4>
                        <button onClick={() => removeFromCart(item.productId, { unitId: item.unitId, factorToBase: item.factorToBase })} className="text-red-400 hover:text-red-300 ml-2">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, -1, { unitId: item.unitId, factorToBase: item.factorToBase })}
                            className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <span className="text-white font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1, { unitId: item.unitId, factorToBase: item.factorToBase })}
                            className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                          {(item.discountType && item.discountType !== 'none') ? (
                            <button
                              onClick={() => toggleApplyDiscount(item.productId, { unitId: item.unitId, factorToBase: item.factorToBase })}
                              className={`px-2 py-1 rounded text-xs font-medium ${item.applyDiscount ? 'bg-green-600/30 text-green-300 border border-green-500/40' : 'bg-gray-600/30 text-slate-400 border border-gray-500/40'}`}
                              title={language === 'ar' ? (item.applyDiscount ? 'خصم مفعّل' : 'خصم معطّل') : item.applyDiscount ? 'Discount ON' : 'Discount OFF'}
                            >
                              {language === 'ar' ? 'خصم' : 'Disc'} {item.applyDiscount ? '✓' : '✗'}
                            </button>
                          ) : null}
                        </div>
                        <span className="text-cyan-400 font-bold">
                          {formatCurrency(item.total || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-gray-700 pt-4 mb-4">
                <div className="space-y-2 mb-4">
                  <input
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'اسم العميل' : 'Customer name'}
                    value={customer.name}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'هاتف العميل' : 'Customer phone'}
                    value={customer.phone}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <input
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder={language === 'ar' ? 'عنوان العميل' : 'Customer address'}
                    value={customer.address}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                {discountTotal > 0 && (
                  <div className="space-y-1 mb-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>{language === 'ar' ? 'قبل الخصم' : 'Before discount'}</span>
                      <span>{formatCurrency(totalBeforeDiscount, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span>
                    </div>
                    <div className="flex justify-between text-green-400">
                      <span>{language === 'ar' ? 'الخصم' : 'Discount'}</span>
                      <span>-{formatCurrency(discountTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span>
                    </div>
                  </div>
                )}
                {taxPreviewLoading && cart.length > 0 && (
                  <p className="text-xs text-slate-500 mb-2">{language === 'ar' ? 'جاري حساب الضريبة…' : 'Calculating tax…'}</p>
                )}
                {taxPreview && !taxPreviewLoading && cart.length > 0 && (
                  <div className="space-y-1.5 mb-3 text-sm border border-cyan-500/20 rounded-lg p-3 bg-[#0f172a]/80">
                    <div className="flex justify-between text-slate-300">
                      <span>{language === 'ar' ? 'المجموع قبل الضريبة' : 'Subtotal (before tax)'}</span>
                      <span>{formatCurrency(taxPreview.subtotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span>
                    </div>
                    {taxPreview.totalTax > 0 && (
                      <div className="flex justify-between text-teal-400/90">
                        <span>{language === 'ar' ? 'إجمالي الضريبة' : 'Tax'}</span>
                        <span>{formatCurrency(taxPreview.totalTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-cyan-500/20">
                      <span className="font-bold text-white">{language === 'ar' ? 'الإجمالي بعد الضريبة' : 'Total (incl. tax)'}</span>
                      <span className="text-xl font-bold text-cyan-400">
                        {formatCurrency(taxPreview.grandTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                      </span>
                    </div>
                  </div>
                )}
                {!(taxPreview && !taxPreviewLoading && cart.length > 0) && (
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">{t('pos.total')}:</span>
                    <span className="text-2xl font-bold text-cyan-400">
                      {formatCurrency(total, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleInvoicePayment}
                disabled={cart.length === 0 || isPrinting}
                className="w-full mb-3 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                style={{ boxShadow: '0 0 18px rgba(236,72,153,0.35)' }}
              >
                🧾 {t('pos.printInvoice')}
              </button>

              <button
                onClick={handleOnAccountPayment}
                disabled={cart.length === 0 || isPrinting}
                className="w-full mb-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                📋 {t('pos.onAccount')}
              </button>

              <button
                onClick={handleCashPayment}
                disabled={cart.length === 0 || isPrinting}
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                style={{ boxShadow: '0 0 20px rgba(0, 243, 255, 0.5)' }}
              >
                {isPrinting ? (
                  <>
                    <Printer className="w-5 h-5 animate-pulse" />
                    {t('pos.printing')}
                  </>
                ) : (
                  <>💵 {t('pos.cash')}</>
                )}
              </button>

              <button
                onClick={handleBankPayment}
                disabled={cart.length === 0 || isPrinting}
                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                🏦 {t('pos.bank')}
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <BarcodeScanner
        open={scanOpen}
        onClose={() => { setScanOpen(false); scanInputRef.current?.focus(); }}
        onDetected={handleScanMatch}
        language={language === 'ar' ? 'ar' : 'en'}
        onError={(message) => {
          setScanMessage(
            language === 'ar'
              ? 'الكاميرا مش مدعومة هنا — استخدم جهاز الباركود أو اكتب الكود.'
              : message || 'Camera scan unavailable — use a scanner gun or type the code.'
          );
          setScanOpen(false);
          scanInputRef.current?.focus();
        }}
      />
    </div>
  );
}

