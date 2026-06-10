'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiFetch, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { ScanLine, Plus, Trash2 } from 'lucide-react';
import { getStoredShopId } from '@/lib/shop';

type InvoiceLineItem = {
  itemName: string;
  qty: number;
  buyPrice?: number | null;
  sellPrice?: number | null;
  barcode?: string | null;
  /** YYYY-MM-DD when known */
  expiryDate?: string | null;
  taxPercent?: number | null;
  taxAmount?: number | null;
};

type ParsedSheet = {
  name: string;
  rawRows: string[][];
};

type ClientParseResult = {
  sheetNames: string[];
  sheets: ParsedSheet[];
  headers: string[];
  previewRows: Record<string, string | null>[];
  totalRows: number;
  totalColumns: number;
};

type InvoiceMeta = {
  documentType?: string;
  supplierName?: string | null;
  branchName?: string | null;
  notes?: string | null;
  invoiceSubtotalBeforeTax?: number | null;
  invoiceTotalTax?: number | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
};

const INVOICE_FX_OPTIONS = [
  'EGP',
  'SAR',
  'USD',
  'EUR',
  'AED',
  'KWD',
  'QAR',
  'OMR',
  'BHD',
  'GBP',
  'JPY',
  'TRY',
  'CNY',
  'INR',
] as const;

function scaleInvoiceLineToRate(it: InvoiceLineItem, rate: number): InvoiceLineItem {
  const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return {
    ...it,
    buyPrice:
      it.buyPrice != null && Number.isFinite(Number(it.buyPrice))
        ? Number((Number(it.buyPrice) * r).toFixed(4))
        : it.buyPrice,
    sellPrice:
      it.sellPrice != null && Number.isFinite(Number(it.sellPrice))
        ? Number((Number(it.sellPrice) * r).toFixed(4))
        : it.sellPrice,
    taxAmount:
      it.taxAmount != null && Number.isFinite(Number(it.taxAmount))
        ? Number((Number(it.taxAmount) * r).toFixed(4))
        : it.taxAmount,
  };
}

type InvoiceImportResponse = {
  ok?: boolean;
  status?: 'success' | 'partial' | 'failed';
  inserted?: number;
  updated?: number;
  failedCount?: number;
  row_errors?: Array<{ row: number; reason: string }>;
  warnings?: string[];
  purchase_invoice_id?: number | null;
  auto_applied?: boolean;
  import_result?: {
    inserted?: number;
    updated?: number;
    failedCount?: number;
    row_errors?: Array<{ row: number; reason: string }>;
    warnings?: string[];
    purchase_invoice_id?: number | null;
  };
  error?: string;
};

type ImportResponse = {
  ok: boolean;
  error?: string;
  inserted?: number;
  updated?: number;
  skippedCount?: number;
  failedCount?: number;
  batchId?: number | null;
  skipped?: Array<{ row: number; reason: string }>;
  row_errors?: Array<{ row: number; reason: string }>;
  warnings?: string[];
  messageAr?: string;
  parsedRowsCount?: number;
  normalizedRowsCount?: number;
  validRowsCount?: number;
  skippedRowsCount?: number;
};

const CANONICAL_OPTIONS = [
  { value: 'ignore', labelAr: 'تخطي', labelEn: 'Skip' },
  { value: 'name', labelAr: 'الاسم', labelEn: 'Name', required: true },
  { value: 'nameAr', labelAr: 'الاسم عربي', labelEn: 'Name (AR)' },
  { value: 'brand', labelAr: 'العلامة', labelEn: 'Brand' },
  { value: 'category', labelAr: 'التصنيف', labelEn: 'Category' },
  { value: 'sellPrice', labelAr: 'سعر البيع', labelEn: 'Sell Price' },
  { value: 'buyPrice', labelAr: 'سعر الشراء', labelEn: 'Buy Price' },
  { value: 'stockQuantity', labelAr: 'الكمية', labelEn: 'Stock' },
  { value: 'minStockLevel', labelAr: 'حد أدنى', labelEn: 'Min Stock' },
  { value: 'sku', labelAr: 'SKU', labelEn: 'SKU' },
  { value: 'barcode', labelAr: 'الباركود', labelEn: 'Barcode' },
  { value: 'qrCode', labelAr: 'QR', labelEn: 'QR Code' },
  { value: 'imageUrl', labelAr: 'رابط الصورة', labelEn: 'Image URL' },
  { value: 'galleryUrls', labelAr: 'صور إضافية', labelEn: 'Gallery URLs' },
  { value: 'cartonPacksCount', labelAr: 'علب/كرتونة', labelEn: 'X (packs/carton)' },
  { value: 'packUnitsCount', labelAr: 'وحدات/علبة', labelEn: 'Y (units/pack)' },
  { value: 'pieceBuyPrice', labelAr: 'شراء قطعة', labelEn: 'Piece Buy' },
  { value: 'pieceSellPrice', labelAr: 'بيع قطعة', labelEn: 'Piece Sell' },
  { value: 'packBuyPrice', labelAr: 'شراء علبة', labelEn: 'Pack Buy' },
  { value: 'packSellPrice', labelAr: 'بيع علبة', labelEn: 'Pack Sell' },
  { value: 'cartonBuyPrice', labelAr: 'شراء كرتونة', labelEn: 'Carton Buy' },
  { value: 'cartonSellPrice', labelAr: 'بيع كرتونة', labelEn: 'Carton Sell' },
  { value: 'descriptionShort', labelAr: 'وصف قصير', labelEn: 'Short Desc' },
  { value: 'descriptionLong', labelAr: 'وصف طويل', labelEn: 'Long Desc' },
  { value: 'warrantyText', labelAr: 'ضمان', labelEn: 'Warranty' },
  { value: 'returnPolicyText', labelAr: 'سياسة إرجاع', labelEn: 'Return Policy' },
  { value: 'specs', labelAr: 'مواصفات', labelEn: 'Specs' },
];

const HEURISTIC_MAP: Record<string, string> = {
  name: 'name', name_en: 'name', nameen: 'name', 'product name': 'name', productname: 'name',
  'اسم': 'name', 'الاسم': 'name', 'اسم المنتج': 'name', 'العنوان': 'name',
  name_ar: 'nameAr', namear: 'nameAr', 'name (ar)': 'nameAr', 'الاسم عربي': 'nameAr', nome: 'nameAr',
  brand: 'brand', 'العلامة': 'brand', 'brand name': 'brand',
  category: 'category', 'التصنيف': 'category',
  sellprice: 'sellPrice', 'sell price': 'sellPrice', price: 'sellPrice', 'سعر البيع': 'sellPrice', 'بيع': 'sellPrice', 'سعر': 'sellPrice',
  buyprice: 'buyPrice', 'buy price': 'buyPrice', cost: 'buyPrice', 'سعر الشراء': 'buyPrice', 'شراء': 'buyPrice', 'تكلفة': 'buyPrice',
  stock: 'stockQuantity', quantity: 'stockQuantity', qty: 'stockQuantity', 'الكمية': 'stockQuantity',
  sku: 'sku', 'باركود': 'barcode', barcode: 'barcode', 'qr': 'qrCode', qrcode: 'qrCode', harcode: 'barcode',
  image: 'imageUrl', imageurl: 'imageUrl', 'رابط الصورة': 'imageUrl',
};

const FUZZY_PATTERNS: Array<{ pattern: RegExp | string; field: string }> = [
  { pattern: /name\s*ar|اسم\s*عربي|nome\s*ar|arabic/i, field: 'nameAr' },
  { pattern: /name|اسم|عنوان|product|منتج/i, field: 'name' },
  { pattern: /barcode|باركود|ean|upc|gtin|qr/i, field: 'barcode' },
  { pattern: /^sku$|رقم\s*الصنف|كود/i, field: 'sku' },
  { pattern: /sell|بيع|سعر\s*البيع|price/i, field: 'sellPrice' },
  { pattern: /buy|شراء|تكلفة|cost/i, field: 'buyPrice' },
  { pattern: /stock|qty|quantity|كمية|مخزون/i, field: 'stockQuantity' },
  { pattern: /brand|علامة|ماركة/i, field: 'brand' },
  { pattern: /category|تصنيف|فئة|قسم/i, field: 'category' },
];

function normalizeHeader(h: string): string {
  return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function heuristicMap(header: string): string {
  const n = normalizeHeader(header);
  if (HEURISTIC_MAP[n]) return HEURISTIC_MAP[n];
  for (const { pattern, field } of FUZZY_PATTERNS) {
    const test = typeof pattern === 'string' ? n.includes(pattern) : pattern.test(header);
    if (test) return field;
  }
  return '';
}

function buildHeadersWithFallback(rawHeaderRow: string[], maxCol: number): string[] {
  const seen = new Map<string, number>();
  const result: string[] = [];
  for (let i = 0; i < maxCol; i++) {
    let h = String(rawHeaderRow[i] ?? '').trim();
    if (!h) h = `column_${i + 1}`;
    const count = (seen.get(h) ?? 0) + 1;
    seen.set(h, count);
    result.push(count > 1 ? `${h}_${count}` : h);
  }
  return result;
}

export default function ExcelImportPage() {
  const { t, direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'excel_import', effectiveRole });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<File | null>(null);
  const [step, setStep] = useState<'idle' | 'summary' | 'mapping' | 'importing' | 'done'>('idle');
  const [parsed, setParsed] = useState<ClientParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequestStatus, setLastRequestStatus] = useState<string>('');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [invoiceStep, setInvoiceStep] = useState<'idle' | 'uploading' | 'preview' | 'importing' | 'done'>('idle');
  /** Amounts in document (invoice) currency — converted for display/import using fxRate → shopCurrency */
  const [invoiceDocLines, setInvoiceDocLines] = useState<InvoiceLineItem[]>([]);
  const [invoiceUserFromCurrency, setInvoiceUserFromCurrency] = useState('EGP');
  const [shopCurrency, setShopCurrency] = useState('EGP');
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [invoiceParseMessage, setInvoiceParseMessage] = useState<string | null>(null);
  const [invoiceImportResult, setInvoiceImportResult] = useState<InvoiceImportResponse | null>(null);
  const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta | null>(null);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [branchesList, setBranchesList] = useState<Array<{ id: number; name: string }>>([]);
  const [suppliersList, setSuppliersList] = useState<Array<{ id: number; name: string }>>([]);
  const [invoiceBranchId, setInvoiceBranchId] = useState<string>('');
  const [invoiceSupplierId, setInvoiceSupplierId] = useState<string>('');
  const [recordPurchaseInvoice, setRecordPurchaseInvoice] = useState(false);

  const loadBranchesAndSuppliers = useCallback(async () => {
    if (authLoading || !allowed) return;
    if (typeof window === 'undefined') return;
    const sid = getStoredShopId();
    const fromUser = user ? Number((user as any).shopId ?? (user as any).shop_id) : NaN;
    if (!sid && !(Number.isFinite(fromUser) && fromUser > 0)) return;
    try {
      const [pfRes, brRes, supRes] = await Promise.all([
        apiFetch('/shops/profile'),
        apiFetch('/admin/branches'),
        apiFetch('/admin/suppliers'),
      ]);
      if (pfRes.ok) {
        const pf = await pfRes.json().catch(() => ({}));
        const c = String((pf as any)?.currency_code || 'EGP')
          .trim()
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .slice(0, 3);
        if (c.length === 3) setShopCurrency(c);
      }
      if (brRes.ok) {
        const list = await brRes.json();
        setBranchesList(
          Array.isArray(list)
            ? list.map((b: any) => ({
                id: b.id,
                name: String(b.name || b.name_ar || b.name_en || '').trim() || `#${b.id}`,
              }))
            : []
        );
      }
      if (supRes.ok) {
        const j = await supRes.json();
        const items = j?.items || j?.data || [];
        setSuppliersList(
          Array.isArray(items) ? items.map((s: any) => ({ id: s.id, name: s.name || `#${s.id}` })) : []
        );
      }
    } catch {
      /* ignore */
    }
  }, [authLoading, allowed, user]);

  useEffect(() => {
    void loadBranchesAndSuppliers();
  }, [loadBranchesAndSuppliers]);

  const invoiceDisplayLines = useMemo(() => {
    const r = fxRate != null && Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1;
    return invoiceDocLines.map((it) => scaleInvoiceLineToRate(it, r));
  }, [invoiceDocLines, fxRate]);

  useEffect(() => {
    if (invoiceStep !== 'preview' && invoiceStep !== 'importing' && invoiceStep !== 'done') return;
    if (!invoiceDocLines.length) return;
    const from = (invoiceUserFromCurrency || 'EGP').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EGP';
    const to = (shopCurrency || 'EGP').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'EGP';
    if (from === to) {
      setFxRate(1);
      setFxLoading(false);
      return;
    }
    let cancelled = false;
    setFxLoading(true);
    void (async () => {
      try {
        const res = await apiFetch(
          `/import/exchange-rate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && typeof (data as any)?.rate === 'number' && (data as any).rate > 0) {
          setFxRate(Number((data as any).rate));
        } else {
          setFxRate(null);
        }
      } catch {
        if (!cancelled) setFxRate(null);
      } finally {
        if (!cancelled) setFxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceStep, invoiceUserFromCurrency, shopCurrency, invoiceDocLines.length]);

  /** When OCR supplies branch/supplier names, pre-select matching dropdowns once lists load. */
  useEffect(() => {
    if (!invoiceMeta) return;
    const norm = (s: string) =>
      String(s || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
    if (invoiceMeta.branchName && branchesList.length > 0 && !invoiceBranchId) {
      const bn = norm(invoiceMeta.branchName);
      const hit = branchesList.find((b) => {
        const n = norm(b.name);
        return n === bn || n.includes(bn) || bn.includes(n);
      });
      if (hit) setInvoiceBranchId(String(hit.id));
    }
    if (invoiceMeta.supplierName && suppliersList.length > 0 && !invoiceSupplierId) {
      const sn = norm(invoiceMeta.supplierName);
      const hit = suppliersList.find((s) => {
        const n = norm(s.name);
        return n === sn || n.includes(sn) || sn.includes(n);
      });
      if (hit) setInvoiceSupplierId(String(hit.id));
    }
  }, [invoiceMeta, branchesList, suppliersList, invoiceBranchId, invoiceSupplierId]);

  const parseFile = useCallback(async (f: File): Promise<ClientParseResult | null> => {
    const ext = (f.name || '').toLowerCase().slice(-5);
    const isCsv = ext.endsWith('.csv');
    const isExcel = ext.endsWith('.xlsx') || ext.endsWith('.xlsm') || ext.endsWith('.xls');

    console.log('[EXCEL] File selected:', f.name, 'size:', f.size, 'bytes, ext:', ext);

    try {
      const mod = await import('xlsx');
      const XLSX = mod.default || mod;
      const buf = await f.arrayBuffer();
      console.log('[EXCEL] ArrayBuffer size:', buf.byteLength);

      let wb: { SheetNames: string[]; Sheets: Record<string, unknown> };
      if (isCsv) {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buf);
        wb = XLSX.read(text, { type: 'string', raw: false });
      } else {
        wb = XLSX.read(buf, { type: 'array' });
      }

      const sheetNames = wb.SheetNames || [];
      console.log('[EXCEL] Sheets:', sheetNames);

      const sheets: ParsedSheet[] = sheetNames.map((name) => {
        const sheet = wb.Sheets[name];
        const rawRows = sheet ? XLSX.utils.sheet_to_json<string[]>(sheet as never, { header: 1, defval: '' }) : [];
        const rows = rawRows.map((row) =>
          (Array.isArray(row) ? row : [row]).map((c) => String(c ?? '').trim())
        );
        return { name, rawRows: rows };
      });

      const si = Math.min(sheetIndex, Math.max(0, sheets.length - 1));
      const currentSheet = sheets[si] || sheets[0];
      const excelRows = currentSheet?.rawRows || [];

      console.log('[EXCEL] Current sheet rows:', excelRows.length, 'sample lengths:', excelRows.slice(0, 5).map((r) => r.length));

      const maxCol = Math.max(...excelRows.map((r) => r.length), 0);
      const headerRowIdx = Math.min(headerRowIndex, Math.max(0, excelRows.length - 1));
      const rawHeaderRow = excelRows[headerRowIdx] || [];
      const headers = buildHeadersWithFallback(rawHeaderRow, maxCol);

      const dataRows = excelRows.slice(headerRowIdx + 1).filter((r) =>
        r.some((c) => String(c ?? '').trim() !== '')
      );

      const previewRows = dataRows.slice(0, 50).map((values) => {
        const obj: Record<string, string | null> = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] !== undefined && String(values[i]).trim() !== '' ? String(values[i]).trim() : null;
        });
        return obj;
      });

      const result: ClientParseResult = {
        sheetNames,
        sheets,
        headers,
        previewRows,
        totalRows: dataRows.length,
        totalColumns: headers.length,
      };

      console.log('[EXCEL] Parse success:', result.totalRows, 'rows,', result.totalColumns, 'columns');
      console.log('[EXCEL] Headers:', headers);
      console.log('[EXCEL] Sample rows:', previewRows.slice(0, 3));

      return result;
    } catch (err: unknown) {
      console.error('[EXCEL] Parse error:', err);
      return null;
    }
  }, [sheetIndex, headerRowIndex]);

  const runAnalyze = useCallback(async () => {
    const f = file ?? fileRef.current;
    if (!f) {
      setError(language === 'ar' ? 'لم يتم اختيار ملف' : 'No file selected');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await parseFile(f);
      if (!result || result.totalColumns === 0) {
        setError(language === 'ar' ? 'لم يتم قراءة الملف. تحقق من التنسيق.' : 'Could not read file. Check format.');
        setParsed(null);
        setStep('idle');
        return;
      }
      setParsed(result);

      const suggested: Record<string, string> = {};
      result.headers.forEach((h) => {
        const mapped = heuristicMap(h);
        if (mapped) suggested[h] = mapped;
      });
      setColumnMapping(suggested);

      const hasName = Object.values(suggested).includes('name');
      setStep(hasName ? 'summary' : 'mapping');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analyze failed';
      setError(msg);
      setStep('idle');
    } finally {
      setLoading(false);
    }
  }, [file, fileRef, parseFile, language]);

  const rebuildFromHeaderRow = useCallback((newHeaderRowIdx?: number) => {
    if (!parsed) return;
    const si = Math.min(sheetIndex, parsed.sheets.length - 1);
    const sheet = parsed.sheets[si];
    if (!sheet) return;

    const excelRows = sheet.rawRows;
    const maxCol = Math.max(...excelRows.map((r) => r.length), 0);
    const headerRowIdx = Math.min(newHeaderRowIdx ?? headerRowIndex, Math.max(0, excelRows.length - 1));
    const rawHeaderRow = excelRows[headerRowIdx] || [];
    const headers = buildHeadersWithFallback(rawHeaderRow, maxCol);

    const dataRows = excelRows.slice(headerRowIdx + 1).filter((r) =>
      r.some((c) => String(c ?? '').trim() !== '')
    );
    const previewRows = dataRows.slice(0, 50).map((values) => {
      const obj: Record<string, string | null> = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] !== undefined && String(values[i]).trim() !== '' ? String(values[i]).trim() : null;
      });
      return obj;
    });

    setParsed({
      ...parsed,
      headers,
      previewRows,
      totalRows: dataRows.length,
      totalColumns: headers.length,
    });

    const suggested: Record<string, string> = {};
    headers.forEach((h) => {
      const mapped = heuristicMap(h);
      if (mapped) suggested[h] = mapped;
    });
    setColumnMapping(suggested);
  }, [parsed, sheetIndex, headerRowIndex]);

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    fileRef.current = f;
    setError(null);
    setParsed(null);
    setStep('idle');
    setColumnMapping({});

    const result = await parseFile(f);
    if (result && result.totalColumns > 0) {
      setParsed(result);
      const suggested: Record<string, string> = {};
      result.headers.forEach((h) => {
        const mapped = heuristicMap(h);
        if (mapped) suggested[h] = mapped;
      });
      setColumnMapping(suggested);
      setStep('summary');
    }
  }, [parseFile]);

  const runImport = async (mapping?: Record<string, string>) => {
    const f = file ?? fileRef.current;
    if (!f) {
      alert(language === 'ar' ? 'لم يتم اختيار ملف. يرجى اختيار ملف أولاً.' : 'No file selected.');
      return;
    }
    setError(null);
    setLoading(true);
    setStep('importing');
    setLastRequestStatus('');
    try {
      const selectedSheetName = parsed?.sheetNames?.[sheetIndex] ?? parsed?.sheetNames?.[0] ?? '—';
      const computedHeaderRowIndex = headerRowIndex;
      const mapToUse = mapping ?? columnMapping;
      console.log('[EXCEL] === PRE-IMPORT DEBUG ===');
      console.log('[EXCEL] selectedSheetName:', selectedSheetName);
      console.log('[EXCEL] sheetIndex (0-based):', sheetIndex);
      console.log('[EXCEL] headerRow (UI 1-based display):', headerRowIndex + 1);
      console.log('[EXCEL] computedHeaderRowIndex (0-based sent to backend):', computedHeaderRowIndex);
      console.log('[EXCEL] mapping keys:', Object.keys(mapToUse).length, 'mapping:', mapToUse);
      console.log('[EXCEL] sampleRows length:', parsed?.previewRows?.length ?? 0);
      console.log('[EXCEL] parsed totalRows:', parsed?.totalRows ?? 0);
      console.log('[EXCEL] parsed totalColumns:', parsed?.totalColumns ?? 0);

      const form = new FormData();
      form.append('mode', 'import');
      if (Object.keys(mapToUse).length > 0) {
        form.append('mapping', JSON.stringify(mapToUse));
      }
      form.append('file', f, f.name);
      const url = `/products/import?mode=import&sheet=${sheetIndex}&headerRow=${computedHeaderRowIndex}`;
      console.log('[EXCEL] Request URL:', url);
      const res = await apiFetch(url, {
        method: 'POST',
        body: form,
        cache: 'no-store',
      });
      const data: ImportResponse = await res.json().catch(() => ({}));
      setLastRequestStatus(`${res.status} ${res.statusText}`);
      console.log('[EXCEL] Import response:', {
        ok: data.ok,
        inserted: data.inserted,
        skippedCount: data.skippedCount,
        failedCount: data.failedCount,
        parsedRowsCount: data.parsedRowsCount,
        skippedRowsCount: data.skippedRowsCount,
        skipped: data.skipped?.slice(0, 3),
        row_errors: data.row_errors?.slice(0, 3),
      });
      if (data.ok === false || !res.ok) {
        setError(data.error || 'Import failed');
        setStep(step === 'mapping' ? 'mapping' : 'summary');
        return;
      }
      setImportResult(data);
      window.dispatchEvent(new CustomEvent('products-imported'));
      setStep('done');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      setLastRequestStatus(`Error: ${msg}`);
      setError(msg);
      setStep(step === 'mapping' ? 'mapping' : 'summary');
    } finally {
      setLoading(false);
    }
  };

  const confirmMappingAndImport = () => {
    setStep('summary');
  };

  const reset = () => {
    setFile(null);
    fileRef.current = null;
    setParsed(null);
    setImportResult(null);
    setError(null);
    setLastRequestStatus('');
    setColumnMapping({});
    setStep('idle');
  };

  const hasNameMapped = Object.values(columnMapping).some((v) => v === 'name');
  const mappedFields = new Set(Object.values(columnMapping).filter((v) => v && v !== 'ignore'));
  const unmappedColumns = parsed?.headers.filter((h) => !columnMapping[h] || columnMapping[h] === 'ignore') ?? [];

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('excel.title')}</h1>
        <div className="neon-card rounded-xl p-6 max-w-4xl">
          <p className="text-slate-300 text-sm mb-4">
            {language === 'ar'
              ? 'رفع ملف Excel أو CSV. يدعم المطابقة التلقائية، التخطيط اليدوي، والاستيراد الجزئي مع تصحيح الأخطاء.'
              : 'Upload Excel or CSV. Supports auto-mapping, manual mapping, partial import, and error correction.'}
          </p>

          {/* Template + Invoice */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await apiFetch('/products/import/template');
                  if (!res.ok) throw new Error('Download failed');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'products-template.xlsx';
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e: unknown) {
                  alert(e instanceof Error ? e.message : 'Download failed');
                }
              }}
              className="px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/10 text-sm"
            >
              {language === 'ar' ? 'تحميل قالب Excel' : 'Download Excel Template'}
            </button>
            <label className="px-4 py-2 rounded-lg border border-fuchsia-500/50 text-fuchsia-200 hover:bg-fuchsia-500/10 text-sm cursor-pointer inline-flex items-center gap-2">
              <ScanLine className="w-4 h-4" />
              {language === 'ar' ? 'مسح فاتورة / صورة' : 'Scan invoice/image'}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setError(null);
                  setInvoiceParseMessage(null);
                  setInvoiceMeta(null);
                  setOcrWarnings([]);
                  setInvoiceBranchId('');
                  setInvoiceSupplierId('');
                  setInvoiceStep('uploading');
                  try {
                    const form = new FormData();
                    form.append('file', f, f.name);
                    form.append('record_purchase_invoice', String(recordPurchaseInvoice));
                    const res = await apiFetch('/import/invoice-image', {
                      method: 'POST',
                      body: form,
                    });
                    const data = await res.json().catch(() => ({}));
                    setInvoiceMeta(data.meta || null);
                    setOcrWarnings(Array.isArray(data.warnings) ? data.warnings : []);
                    if (data.message && (!data.items || !data.items.length)) {
                      setInvoiceParseMessage(data.message);
                    } else {
                      setInvoiceParseMessage(null);
                    }
                    if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
                      setInvoiceDocLines(data.items);
                      const docCur = String(data.document_currency || data.meta?.currencyCode || '')
                        .trim()
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 3);
                      setInvoiceUserFromCurrency(docCur.length === 3 ? docCur : shopCurrency);
                      if (data.shop_currency) {
                        const sc = String(data.shop_currency)
                          .trim()
                          .toUpperCase()
                          .replace(/[^A-Z]/g, '')
                          .slice(0, 3);
                        if (sc.length === 3) setShopCurrency(sc);
                      }
                      if (data.auto_applied && data.import_result) {
                        setInvoiceImportResult({
                          ok: true,
                          inserted: data.import_result.inserted,
                          updated: data.import_result.updated,
                          failedCount: data.import_result.failedCount,
                          row_errors: data.import_result.row_errors,
                          warnings: data.import_result.warnings,
                          purchase_invoice_id: data.import_result.purchase_invoice_id,
                        });
                        setInvoiceStep('done');
                      } else {
                        setInvoiceStep('preview');
                      }
                    } else {
                      setInvoiceDocLines([]);
                      setInvoiceStep('preview');
                    }
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Upload failed');
                    setInvoiceStep('idle');
                  }
                }}
              />
            </label>
          </div>

          {/* Invoice preview */}
          {(invoiceStep === 'preview' || invoiceStep === 'importing' || invoiceStep === 'done') && (
            <div className="mb-6 rounded-xl border border-fuchsia-500/20 bg-black/20 p-4 space-y-4">
              <h3 className="text-fuchsia-200 font-semibold">
                {language === 'ar' ? 'معاينة عناصر الفاتورة' : 'Invoice items preview'}
              </h3>
              {invoiceMeta && (invoiceMeta.supplierName || invoiceMeta.branchName || invoiceMeta.documentType) && (
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300 space-y-1">
                  {invoiceMeta.documentType && (
                    <div>
                      <span className="text-cyan-200/80">{language === 'ar' ? 'النوع: ' : 'Type: '}</span>
                      {invoiceMeta.documentType}
                    </div>
                  )}
                  {invoiceMeta.supplierName && (
                    <div>
                      <span className="text-cyan-200/80">{language === 'ar' ? 'المورد (من الصورة): ' : 'Supplier (OCR): '}</span>
                      {invoiceMeta.supplierName}
                    </div>
                  )}
                  {invoiceMeta.branchName && (
                    <div>
                      <span className="text-cyan-200/80">{language === 'ar' ? 'الفرع (من الصورة): ' : 'Branch (OCR): '}</span>
                      {invoiceMeta.branchName}
                    </div>
                  )}
                  {(invoiceMeta.currencyCode || invoiceMeta.currencySymbol) && (
                    <div>
                      <span className="text-cyan-200/80">{language === 'ar' ? 'عملة المستند (OCR): ' : 'Document currency (OCR): '}</span>
                      {invoiceMeta.currencyCode || '—'}
                      {invoiceMeta.currencySymbol ? ` (${invoiceMeta.currencySymbol})` : ''}
                    </div>
                  )}
                  {(invoiceMeta.invoiceSubtotalBeforeTax != null || invoiceMeta.invoiceTotalTax != null) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {invoiceMeta.invoiceSubtotalBeforeTax != null && (
                        <span>
                          <span className="text-cyan-200/80">{language === 'ar' ? 'إجمالي قبل الضريبة (المستند): ' : 'Subtotal (document): '}</span>
                          {invoiceMeta.invoiceSubtotalBeforeTax}{' '}
                          {invoiceUserFromCurrency || invoiceMeta.currencyCode || ''}
                          {fxRate != null &&
                            fxRate > 0 &&
                            (invoiceUserFromCurrency || '').toUpperCase() !== (shopCurrency || '').toUpperCase() && (
                              <span className="text-slate-400">
                                {' '}
                                ≈{' '}
                                {Number((Number(invoiceMeta.invoiceSubtotalBeforeTax) * fxRate).toFixed(2))}{' '}
                                {shopCurrency}
                              </span>
                            )}
                        </span>
                      )}
                      {invoiceMeta.invoiceTotalTax != null && (
                        <span>
                          <span className="text-cyan-200/80">{language === 'ar' ? 'إجمالي الضريبة (المستند): ' : 'Total tax (document): '}</span>
                          {invoiceMeta.invoiceTotalTax}{' '}
                          {invoiceUserFromCurrency || invoiceMeta.currencyCode || ''}
                          {fxRate != null &&
                            fxRate > 0 &&
                            (invoiceUserFromCurrency || '').toUpperCase() !== (shopCurrency || '').toUpperCase() && (
                              <span className="text-slate-400">
                                {' '}
                                ≈{' '}
                                {Number((Number(invoiceMeta.invoiceTotalTax) * fxRate).toFixed(2))}{' '}
                                {shopCurrency}
                              </span>
                            )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {ocrWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-xs space-y-1">
                  {ocrWarnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              )}
              <div className="relative z-[80] isolate flex flex-wrap gap-3 items-end pointer-events-auto">
                <div className="relative z-[80]">
                  <label className="block text-[11px] text-slate-400 mb-1">{language === 'ar' ? 'الفرع (المخزن)' : 'Branch'}</label>
                  <select
                    value={invoiceBranchId}
                    onChange={(e) => setInvoiceBranchId(e.target.value)}
                    className="relative z-[80] cursor-pointer appearance-auto bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm min-w-[200px] min-h-[40px] text-slate-100"
                  >
                    <option value="">{language === 'ar' ? 'تلقائي / من الصورة' : 'Auto / from image'}</option>
                    {branchesList.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative z-[80]">
                  <label className="block text-[11px] text-slate-400 mb-1">{language === 'ar' ? 'المورد' : 'Supplier'}</label>
                  <select
                    value={invoiceSupplierId}
                    onChange={(e) => setInvoiceSupplierId(e.target.value)}
                    className="relative z-[80] cursor-pointer appearance-auto bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm min-w-[200px] min-h-[40px] text-slate-100"
                  >
                    <option value="">{language === 'ar' ? '— اختياري —' : '— optional —'}</option>
                    {suppliersList.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordPurchaseInvoice}
                    onChange={(e) => setRecordPurchaseInvoice(e.target.checked)}
                    className="rounded border-slate-500"
                  />
                  {language === 'ar' ? 'تسجيل فاتورة شراء (محاسبة + مخزن)' : 'Record purchase invoice (accounting + stock)'}
                </label>
              </div>
              {invoiceDocLines.length > 0 && (
                <div className="flex flex-wrap gap-4 items-end rounded-lg border border-slate-600/40 bg-slate-900/40 p-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {language === 'ar' ? 'عملة أسعار المستند' : 'Invoice line currency'}
                    </label>
                    <select
                      value={invoiceUserFromCurrency}
                      onChange={(e) => setInvoiceUserFromCurrency(e.target.value)}
                      className="cursor-pointer bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm min-w-[120px] text-slate-100"
                    >
                      {INVOICE_FX_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-slate-400 max-w-md">
                    <div>
                      {language === 'ar' ? 'عملة المتجر (الاستيراد): ' : 'Shop / import currency: '}
                      <span className="text-cyan-200">{shopCurrency}</span>
                    </div>
                    {fxLoading && <div className="mt-1 text-amber-200/90">{language === 'ar' ? 'جاري جلب سعر الصرف…' : 'Loading exchange rate…'}</div>}
                    {!fxLoading && fxRate != null && invoiceUserFromCurrency !== shopCurrency && (
                      <div className="mt-1">
                        {language === 'ar' ? 'سعر تقريبي: ' : 'Approx. rate: '}
                        1 {invoiceUserFromCurrency} = {fxRate.toFixed(6)} {shopCurrency}
                        <span className="block text-slate-500 mt-0.5">
                          {language === 'ar'
                            ? 'المصدر: أسعار يومية تقريبية (currency-api). الجدول يعرض الأسعار بعملة المتجر بعد التحويل.'
                            : 'Source: approximate daily rates (currency-api). Table shows shop currency after conversion.'}
                        </span>
                      </div>
                    )}
                    {!fxLoading && fxRate == null && invoiceUserFromCurrency !== shopCurrency && invoiceDocLines.length > 0 && (
                      <div className="mt-1 text-amber-200/90">
                        {language === 'ar'
                          ? 'تعذر جلب سعر الصرف. عدّل العملة أو حاول لاحقاً؛ الأسعار المعروضة قد تبقى بعملة المستند.'
                          : 'Could not load FX rate. Try another currency or later; amounts may stay in document currency.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {invoiceParseMessage && invoiceDocLines.length === 0 && (
                <p className="text-amber-200 text-sm">{invoiceParseMessage}</p>
              )}
              {(invoiceDocLines.length > 0 || invoiceParseMessage) && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 border-collapse">
                      <thead>
                        <tr className="border-b border-fuchsia-500/20">
                          <th className="text-left p-2">{language === 'ar' ? 'المنتج' : 'Item'}</th>
                          <th className="text-left p-2">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                          <th className="text-left p-2">
                            {language === 'ar' ? `شراء (${shopCurrency})` : `Buy (${shopCurrency})`}
                          </th>
                          <th className="text-left p-2">
                            {language === 'ar' ? `بيع (${shopCurrency})` : `Sell (${shopCurrency})`}
                          </th>
                          <th className="text-left p-2">{language === 'ar' ? 'باركود' : 'Barcode'}</th>
                          <th className="text-left p-2">{language === 'ar' ? 'تاريخ الصلاحية' : 'Expiry'}</th>
                          <th className="text-left p-2">{language === 'ar' ? 'ضريبة %' : 'Tax %'}</th>
                          <th className="text-left p-2">
                            {language === 'ar' ? `مبلغ الضريبة (${shopCurrency})` : `Tax amt (${shopCurrency})`}
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDisplayLines.map((it, i) => (
                          <tr key={i} className="border-b border-fuchsia-500/10">
                            <td className="p-2">
                              <input
                                value={it.itemName}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    n[i] = { ...n[i], itemName: ev.target.value };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-full"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={it.qty}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    n[i] = { ...n[i], qty: parseInt(ev.target.value, 10) || 0 };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-20"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={it.buyPrice ?? ''}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    const r = fxRate != null && fxRate > 0 ? fxRate : 1;
                                    const raw = ev.target.value;
                                    const display = raw === '' ? NaN : parseFloat(raw);
                                    const docBuy = raw === '' || !Number.isFinite(display) ? null : display / r;
                                    n[i] = { ...n[i], buyPrice: docBuy };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-24"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={it.sellPrice ?? ''}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    const r = fxRate != null && fxRate > 0 ? fxRate : 1;
                                    const raw = ev.target.value;
                                    const display = raw === '' ? NaN : parseFloat(raw);
                                    const docSell = raw === '' || !Number.isFinite(display) ? null : display / r;
                                    n[i] = { ...n[i], sellPrice: docSell };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-24"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                value={it.barcode ?? ''}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    n[i] = { ...n[i], barcode: ev.target.value || null };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-28"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                placeholder="YYYY-MM-DD"
                                value={it.expiryDate ?? ''}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    const v = ev.target.value.trim();
                                    n[i] = { ...n[i], expiryDate: v ? v : null };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-28"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={it.taxPercent ?? ''}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    const raw = ev.target.value;
                                    const p = raw === '' ? NaN : parseFloat(raw);
                                    n[i] = {
                                      ...n[i],
                                      taxPercent: raw === '' || !Number.isFinite(p) ? null : p,
                                    };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-16"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={it.taxAmount ?? ''}
                                onChange={(ev) =>
                                  setInvoiceDocLines((prev) => {
                                    const n = [...prev];
                                    const r = fxRate != null && fxRate > 0 ? fxRate : 1;
                                    const raw = ev.target.value;
                                    const display = raw === '' ? NaN : parseFloat(raw);
                                    const docTax = raw === '' || !Number.isFinite(display) ? null : display / r;
                                    n[i] = {
                                      ...n[i],
                                      taxAmount: docTax,
                                    };
                                    return n;
                                  })
                                }
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-20"
                              />
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => setInvoiceDocLines((prev) => prev.filter((_, j) => j !== i))}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setInvoiceDocLines((prev) => [
                          ...prev,
                          {
                            itemName: '',
                            qty: 0,
                            buyPrice: null,
                            sellPrice: null,
                            barcode: null,
                            expiryDate: null,
                            taxPercent: null,
                            taxAmount: null,
                          },
                        ])
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-500 text-slate-300 text-sm inline-flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      {language === 'ar' ? 'إضافة صف' : 'Add row'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const toImport = invoiceDisplayLines.filter((it) => String(it.itemName || '').trim());
                        if (toImport.length === 0) {
                          alert(language === 'ar' ? 'أضف عنصراً واحداً على الأقل' : 'Add at least one item');
                          return;
                        }
                        if (invoiceUserFromCurrency !== shopCurrency && (fxRate == null || fxRate <= 0)) {
                          alert(
                            language === 'ar'
                              ? 'تعذر التأكيد: سعر الصرف غير متاح. انتظر التحميل أو غيّر العملة.'
                              : 'Cannot confirm: exchange rate unavailable. Wait or change currency.'
                          );
                          return;
                        }
                        setInvoiceStep('importing');
                        try {
                          const res = await apiFetch('/import/invoice-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              items: toImport.map((it) => ({
                                itemName: it.itemName,
                                qty: it.qty,
                                buyPrice: it.buyPrice,
                                sellPrice: it.sellPrice,
                                barcode: it.barcode,
                                expiryDate: it.expiryDate ?? undefined,
                                taxPercent: it.taxPercent ?? undefined,
                                taxAmount: it.taxAmount ?? undefined,
                              })),
                              meta: invoiceMeta,
                              branch_id: invoiceBranchId ? Number(invoiceBranchId) : undefined,
                              supplier_id: invoiceSupplierId ? Number(invoiceSupplierId) : undefined,
                              record_purchase_invoice: recordPurchaseInvoice,
                            }),
                          });
                          const data: InvoiceImportResponse = await res.json().catch(() => ({}));
                          if (!res.ok || data.ok === false) {
                            setError(data.error || (language === 'ar' ? 'فشل التأكيد' : 'Confirm failed'));
                            setInvoiceStep('preview');
                            return;
                          }
                          setInvoiceImportResult(data);
                          window.dispatchEvent(new CustomEvent('products-imported'));
                          setInvoiceStep('done');
                          void loadBranchesAndSuppliers();
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : 'Import failed');
                        }
                      }}
                      disabled={
                        invoiceStep === 'importing' ||
                        invoiceDisplayLines.filter((it) => String(it.itemName || '').trim()).length === 0
                      }
                      className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {invoiceStep === 'importing'
                        ? (language === 'ar' ? 'جاري الاستيراد...' : 'Importing...')
                        : (language === 'ar' ? 'تأكيد الاستيراد' : 'Confirm import')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceStep('idle');
                        setInvoiceDocLines([]);
                        setInvoiceParseMessage(null);
                        setInvoiceImportResult(null);
                        setInvoiceMeta(null);
                        setOcrWarnings([]);
                        setRecordPurchaseInvoice(false);
                        setInvoiceUserFromCurrency(shopCurrency);
                        setFxRate(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 text-sm"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </>
              )}
              {invoiceStep === 'done' && invoiceImportResult && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-green-200 text-sm">
                    {language === 'ar' ? (
                      <>
                        جديد: {invoiceImportResult.inserted ?? 0} — محدّث: {invoiceImportResult.updated ?? 0}
                        {(invoiceImportResult.purchase_invoice_id != null && invoiceImportResult.purchase_invoice_id > 0) && (
                          <span className="block mt-1 text-cyan-200">
                            فاتورة شراء #{invoiceImportResult.purchase_invoice_id}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        New: {invoiceImportResult.inserted ?? 0} — Updated: {invoiceImportResult.updated ?? 0}
                        {(invoiceImportResult.purchase_invoice_id != null && invoiceImportResult.purchase_invoice_id > 0) && (
                          <span className="block mt-1 text-cyan-200">Purchase invoice #{invoiceImportResult.purchase_invoice_id}</span>
                        )}
                      </>
                    )}
                    {(invoiceImportResult.failedCount ?? 0) > 0 && (
                      <span className="block text-amber-200 mt-1">
                        {language === 'ar' ? 'فشل صفوف: ' : 'Failed rows: '}
                        {invoiceImportResult.failedCount}
                      </span>
                    )}
                  </div>
                  {Array.isArray(invoiceImportResult.warnings) && invoiceImportResult.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-xs space-y-1">
                      <div className="font-semibold text-amber-200">
                        {language === 'ar' ? 'تنبيهات بعد الحفظ' : 'Post-save warnings'}
                      </div>
                      {invoiceImportResult.warnings.map((w, i) => (
                        <div key={i}>{w}</div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(invoiceImportResult.row_errors) && invoiceImportResult.row_errors.length > 0 && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-xs">
                      {invoiceImportResult.row_errors.slice(0, 8).map((e, i) => (
                        <div key={i}>
                          #{e.row}: {e.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Excel/CSV upload */}
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-white"
            />
            {(file ?? fileRef.current) && (step === 'idle' || step === 'mapping' || step === 'summary') && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400 text-sm">{(file ?? fileRef.current)?.name}</span>
                {(parsed?.sheetNames?.length ?? 0) > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-slate-400 text-sm">{language === 'ar' ? 'الورقة:' : 'Sheet:'}</label>
                    <select
                      value={sheetIndex}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10);
                        setSheetIndex(idx);
                        setStep('idle');
                        if (parsed) {
                          const sheet = parsed.sheets[idx] || parsed.sheets[0];
                          if (sheet) {
                            const maxCol = Math.max(...sheet.rawRows.map((r) => r.length), 0);
                            const headerRowIdx = Math.min(headerRowIndex, sheet.rawRows.length - 1);
                            const rawHeaderRow = sheet.rawRows[headerRowIdx] || [];
                            const headers = buildHeadersWithFallback(rawHeaderRow, maxCol);
                            const dataRows = sheet.rawRows.slice(headerRowIdx + 1).filter((r) =>
                              r.some((c) => String(c ?? '').trim() !== '')
                            );
                            const previewRows = dataRows.slice(0, 50).map((values) => {
                              const obj: Record<string, string | null> = {};
                              headers.forEach((h, i) => {
                                obj[h] = values[i] !== undefined && String(values[i]).trim() !== '' ? String(values[i]).trim() : null;
                              });
                              return obj;
                            });
                            setParsed({
                              ...parsed,
                              headers,
                              previewRows,
                              totalRows: dataRows.length,
                              totalColumns: headers.length,
                            });
                            const suggested: Record<string, string> = {};
                            headers.forEach((h) => {
                              const mapped = heuristicMap(h);
                              if (mapped) suggested[h] = mapped;
                            });
                            setColumnMapping(suggested);
                          }
                        }
                      }}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    >
                      {parsed?.sheetNames?.map((s, i) => (
                        <option key={i} value={i}>{s || `Sheet ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm">{language === 'ar' ? 'صف العناوين:' : 'Header row:'}</label>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      setHeaderRowIndex(idx);
                      setStep('idle');
                      rebuildFromHeaderRow(idx);
                    }}
                    className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                    title={language === 'ar' ? 'صف 1 = أول صف (0-based index 0)' : 'Row 1 = first row (0-based index 0)'}
                  >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <option key={i} value={i}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={runAnalyze}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {step === 'idle' ? (language === 'ar' ? 'تحليل' : 'Analyze') : (language === 'ar' ? 'إعادة التحليل' : 'Re-analyze')}
                </button>
              </div>
            )}
          </div>

          {loading && (
            <p className="text-slate-400 text-sm mt-4">{language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}</p>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Read success + Preview */}
          {parsed && (step === 'summary' || step === 'mapping') && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <h3 className="text-green-200 font-semibold mb-2">
                  {language === 'ar' ? 'تم القراءة بنجاح' : 'Read success'}
                </h3>
                <p className="text-slate-300 text-sm">
                  <strong>{parsed.totalRows}</strong> {language === 'ar' ? 'صف' : 'rows'} / <strong>{parsed.totalColumns}</strong> {language === 'ar' ? 'عمود' : 'columns'}
                </p>
                {unmappedColumns.length > 0 && (
                  <p className="text-amber-200 text-sm mt-2">
                    {language === 'ar' ? 'أعمدة غير معينة:' : 'Unmapped columns:'} {unmappedColumns.slice(0, 8).join(', ')}
                    {unmappedColumns.length > 8 ? '…' : ''}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4 overflow-x-auto">
                <h3 className="text-cyan-200 font-semibold mb-2">
                  {language === 'ar' ? 'معاينة (أول 50 صفاً)' : 'Preview (first 50 rows)'}
                </h3>
                <table className="w-full text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-500/20">
                      {parsed.headers.map((k) => (
                        <th key={k} className="text-left p-2 min-w-[80px]">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.previewRows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-cyan-500/10">
                        {parsed.headers.map((h, j) => (
                          <td key={j} className="p-2 max-w-[120px] truncate">{String(row[h] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mapping UI */}
              <div className="space-y-3">
                <h3 className="text-cyan-200 font-semibold">
                  {language === 'ar' ? 'ربط الأعمدة → حقول المنتج' : 'Map columns → product fields'}
                </h3>
                <div className="space-y-2">
                  {parsed.headers.map((header) => (
                    <div key={header} className="flex items-center gap-4 flex-wrap">
                      <span className="text-slate-300 min-w-[140px] truncate" title={header}>
                        {header}
                      </span>
                      <span className="text-slate-500">→</span>
                      <select
                        value={columnMapping[header] ?? 'ignore'}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            [header]: e.target.value,
                          }))
                        }
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm min-w-[160px]"
                      >
                        {CANONICAL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {language === 'ar' ? opt.labelAr : opt.labelEn}
                            {opt.required ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {!hasNameMapped && (
                  <p className="text-amber-200 text-sm">
                    {language === 'ar' ? 'الاسم غير معيّن. يمكن الاستيراد وسيتم استخدام قيم افتراضية.' : 'Name not mapped. Import allowed; backend will use fallback values.'}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep('idle')}
                    className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 text-sm"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={confirmMappingAndImport}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm"
                  >
                    {language === 'ar' ? 'تأكيد و متابعة' : 'Confirm & Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => runImport(columnMapping)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm disabled:opacity-50"
                  >
                    {language === 'ar' ? 'استيراد مباشرة' : 'Import Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary + Import */}
          {parsed && step === 'summary' && (
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-200 text-sm disabled:opacity-50"
              >
                {language === 'ar' ? 'رفع ملف آخر' : 'Upload another file'}
              </button>
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 text-sm"
              >
                {language === 'ar' ? 'تعديل الربط' : 'Edit mapping'}
              </button>
              <button
                type="button"
                onClick={() => runImport(columnMapping)}
                disabled={loading || mappedFields.size === 0}
                className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? (language === 'ar' ? 'جاري الاستيراد...' : 'Importing...') : (language === 'ar' ? 'استيراد' : 'Import')}
              </button>
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
                <h3 className="font-semibold mb-2">{language === 'ar' ? 'تم الاستيراد' : 'Import complete'}</h3>
                <p className="mb-1">
                  {importResult.messageAr ?? (language === 'ar' ? `تم استيراد ${importResult.inserted ?? 0} صنف` : `Imported: ${importResult.inserted ?? 0}`)}
                </p>
                {(importResult.failedCount ?? 0) > 0 && (
                  <p className="text-amber-200">
                    {language === 'ar' ? 'تعذر استيراد:' : 'Failed:'} {importResult.failedCount}
                  </p>
                )}
                {(importResult.parsedRowsCount != null || importResult.skippedRowsCount != null) && (
                  <div className="mt-2 text-xs text-slate-400">
                    {language === 'ar' ? 'المعالجة:' : 'Pipeline:'} parsed={importResult.parsedRowsCount ?? '—'} valid={importResult.validRowsCount ?? '—'} skipped={importResult.skippedRowsCount ?? '—'}
                  </div>
                )}
                {Array.isArray(importResult.skipped) && importResult.skipped.length > 0 && (
                  <div className="mt-2 text-xs text-amber-200">
                    {language === 'ar' ? 'صفوف متخطاة:' : 'Skipped:'} {importResult.skipped.slice(0, 5).map((s) => `#${s.row}: ${s.reason}`).join('; ')}
                    {importResult.skipped.length > 5 ? '…' : ''}
                  </div>
                )}
                {Array.isArray(importResult.row_errors) && importResult.row_errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-300">
                    {language === 'ar' ? 'أخطاء:' : 'Errors:'} {importResult.row_errors.slice(0, 5).map((e) => `#${e.row}: ${e.reason}`).join('; ')}
                    {importResult.row_errors.length > 5 ? '…' : ''}
                  </div>
                )}
              </div>
              {Array.isArray(importResult.warnings) && importResult.warnings.length > 0 && (
                <div className="text-yellow-200 text-sm">
                  {importResult.warnings.slice(0, 10).map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                {(importResult.failedCount ?? 0) > 0 && importResult.batchId && (
                  <Link
                    href={`/inventory/import-fixes/${importResult.batchId}`}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"
                  >
                    {language === 'ar' ? 'فتح شاشة التصحيح' : 'Open Fix Screen'}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm"
                >
                  {language === 'ar' ? 'استيراد ملف آخر' : 'Import another file'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
