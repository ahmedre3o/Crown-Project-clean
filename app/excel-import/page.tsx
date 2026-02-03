'use client';

import React, { useMemo, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { API_BASE_URL } from '../api-config';

type ImportReport = {
  importedCount: number;
  skipped: Array<{ row: number; reason: string }>;
  profile?: {
    totalRows: number;
    columns: Record<
      string,
      {
        emptyRatio: number;
        numericRatio: number;
        duplicateRatio: number;
      }
    >;
  };
  unmappedColumns?: string[];
  mappingGuide?: any;
  detectedHeaders?: string[];
  currentMapping?: Record<string, string>;
};

type ImportAnalyzeResponse = {
  ok?: boolean;
  error?: string | null;
  mode?: 'analyze';
  limit?: {
    allowed?: boolean;
    remaining?: number;
    maxProducts?: number;
    existingCount?: number;
  };
  mappingValidation?: {
    ok: boolean;
    missingFields: Array<'name' | 'sellPrice'>;
  };
  analysis?: {
    totalRows: number;
    validRows: number;
    readyRows: number;
    missingNameCount: number;
    missingPriceCount: number;
    duplicateSkuCount: number;
    duplicateBarcodeCount: number;
    duplicateNameCount: number;
    productLimitReachedCount: number;
  };
  issueSamples?: {
    missingName?: Array<{ row: number; value?: string }>;
    missingPrice?: Array<{ row: number; value?: string }>;
  };
  samples?: Record<string, string[]>;
  unmappedColumns?: string[];
  detectedHeaders?: string[];
  currentMapping?: Record<string, string>;
  mappingGuide?: any;
  profile?: ImportReport['profile'];
};

type ImportField =
  | ''
  | 'name'
  | 'nameAr'
  | 'brand'
  | 'sku'
  | 'barcode'
  | 'qrCode'
  | 'category'
  | 'buyPrice'
  | 'sellPrice'
  | 'stockQuantity'
  | 'minStockLevel'
  | 'imageUrl';

type FieldOption = {
  id: ImportField;
  labelEn: string;
  labelAr: string;
};

const FIELD_OPTIONS: FieldOption[] = [
  { id: '', labelEn: 'Ignore', labelAr: 'تجاهل' },
  { id: 'name', labelEn: 'Part_Name (Product Name)', labelAr: 'Part_Name (اسم المنتج)' },
  { id: 'nameAr', labelEn: 'Part Name (AR)', labelAr: 'اسم المنتج (AR)' },
  { id: 'brand', labelEn: 'Brand', labelAr: 'الماركة' },
  { id: 'sku', labelEn: 'SKU / Code', labelAr: 'SKU / كود' },
  { id: 'barcode', labelEn: 'Barcode', labelAr: 'باركود' },
  { id: 'qrCode', labelEn: 'QR Code', labelAr: 'QR' },
  { id: 'buyPrice', labelEn: 'BuyPrice', labelAr: 'BuyPrice (سعر الشراء)' },
  { id: 'sellPrice', labelEn: 'SellPrice', labelAr: 'SellPrice (سعر البيع)' },
  { id: 'stockQuantity', labelEn: 'Stock', labelAr: 'Stock (المخزون)' },
  { id: 'minStockLevel', labelEn: 'Min Stock', labelAr: 'حد أدنى' },
  { id: 'category', labelEn: 'Category', labelAr: 'الفئة' },
  { id: 'imageUrl', labelEn: 'Image_URL', labelAr: 'Image_URL (رابط الصورة)' },
];

export default function ExcelImportPage() {
  const { t, direction, language } = useLanguage();
  const [step, setStep] = useState<'idle' | 'analyzing' | 'mapping' | 'validating' | 'ready' | 'importing' | 'done'>(
    'idle'
  );
  const [file, setFile] = useState<File | null>(null);
  const [analyze, setAnalyze] = useState<ImportAnalyzeResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField>>({});
  const [missingPricePolicy, setMissingPricePolicy] = useState<'skip' | 'default' | 'zero'>('skip');
  const [defaultSellPrice, setDefaultSellPrice] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUploadHeaders = () => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.shopId) headers['x-shop-id'] = String(parsed.shopId);
      }
    } catch {
      // ignore
    }
    return headers;
  };

  const optionLabel = (id: ImportField) => {
    const opt = FIELD_OPTIONS.find((o) => o.id === id);
    if (!opt) return id || (language === 'ar' ? 'تجاهل' : 'Ignore');
    return language === 'ar' ? opt.labelAr : opt.labelEn;
  };

  const serializeMapping = (m: Record<string, ImportField>) => {
    const out: Record<string, string> = {};
    Object.entries(m).forEach(([header, field]) => {
      if (!field) return;
      out[header] = field;
    });
    return out;
  };

  const analyzeFile = async (targetFile: File, mappingOverride?: Record<string, ImportField>) => {
    const formData = new FormData();
    if (mappingOverride) {
      formData.append('columnMap', JSON.stringify(serializeMapping(mappingOverride)));
    }
    formData.append('file', targetFile);

    const response = await fetch(`${API_BASE_URL}/products/import-file?mode=analyze`, {
      method: 'POST',
      headers: buildUploadHeaders(),
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as ImportAnalyzeResponse;
    if (!response.ok) {
      throw new Error((data as any)?.error || (data as any)?.message || 'Analyze failed');
    }
    return data;
  };

  const importFile = async (targetFile: File) => {
    const formData = new FormData();
    formData.append('columnMap', JSON.stringify(serializeMapping(mapping)));
    formData.append('missingPricePolicy', missingPricePolicy);
    if (missingPricePolicy === 'default') {
      formData.append('defaultSellPrice', defaultSellPrice);
    }
    formData.append('file', targetFile);

    const response = await fetch(`${API_BASE_URL}/products/import-file?mode=import`, {
      method: 'POST',
      headers: buildUploadHeaders(),
      body: formData,
    });

    const data = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      const message = data?.error || data?.message || 'Import failed';
      setError(message);
      if (data?.mappingGuide) {
        setReport({
          importedCount: data.importedCount || 0,
          skipped: data.skipped || [],
          profile: data.profile,
          unmappedColumns: data.unmappedColumns || [],
          mappingGuide: data.mappingGuide,
          detectedHeaders: data.detectedHeaders || [],
          currentMapping: data.currentMapping || {},
        });
      }
      throw new Error(message);
    }
    return data as any;
  };

  const onPickFile = async (picked: File) => {
    setFile(picked);
    setError(null);
    setReport(null);
    setAnalyze(null);
    setMapping({});
    setMissingPricePolicy('skip');
    setDefaultSellPrice('');

    setStep('analyzing');
    setLoading(true);
    try {
      const data = await analyzeFile(picked);
      setAnalyze(data);
      setMapping((data.currentMapping || {}) as any);
      setStep('mapping');
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze file');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const mappingWarnings = useMemo(() => {
    const selected = Object.values(mapping).filter(Boolean) as string[];
    const duplicates = selected.filter((f, idx) => selected.indexOf(f) !== idx);
    const missingName = !selected.includes('name') && !selected.includes('nameAr');
    const hasPrice = selected.includes('sellPrice') || selected.includes('buyPrice');
    const warnings: string[] = [];
    if (duplicates.length > 0) warnings.push(language === 'ar' ? 'فيه حقول مكررة في المطابقة.' : 'Some fields are mapped multiple times.');
    if (missingName) warnings.push(language === 'ar' ? 'لازم تختار عمود للاسم.' : 'Product name column is required.');
    if (!hasPrice) warnings.push(language === 'ar' ? 'لازم تختار عمود سعر بيع أو سعر شراء.' : 'Sell Price or Buy Price is required.');
    return warnings;
  }, [language, mapping]);

  const canValidate = useMemo(() => {
    const selected = Object.values(mapping).filter(Boolean) as string[];
    const hasName = selected.includes('name') || selected.includes('nameAr');
    const hasPrice = selected.includes('sellPrice') || selected.includes('buyPrice');
    return Boolean(file) && hasName && hasPrice;
  }, [file, mapping]);

  const onValidate = async () => {
    if (!file) return;
    setError(null);
    setReport(null);
    setStep('validating');
    setLoading(true);
    try {
      const data = await analyzeFile(file, mapping);
      setAnalyze(data);
      setStep('ready');
    } catch (err: any) {
      setError(err?.message || 'Failed to validate mapping');
      setStep('mapping');
    } finally {
      setLoading(false);
    }
  };

  const onImport = async () => {
    if (!file) return;
    setError(null);
    setReport(null);
    setLoading(true);
    setStep('importing');
    try {
      const result = await importFile(file);
      setReport({
        importedCount: result.importedCount || 0,
        skipped: result.skipped || [],
        profile: result.profile,
        unmappedColumns: result.unmappedColumns || [],
      });

      // Notify Dashboard after large imports complete (e.g. crown_products_5000.xlsx)
      try {
        localStorage.setItem(
          'crown:last-excel-import',
          JSON.stringify({
            ok: true,
            fileName: file?.name || '',
            importedCount: result.importedCount || 0,
            skippedCount: Array.isArray(result.skipped) ? result.skipped.length : 0,
            at: Date.now(),
          })
        );
      } catch {
        // ignore storage errors
      }

      setStep('done');
    } catch {
      setStep('ready');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('excel.title')}</h1>
        <div className="neon-card rounded-xl p-6">
          <div className="border border-cyan-500/30 rounded-xl p-8 text-center">
            <div className="text-slate-300 mb-2">
              {language === 'ar' ? 'استيراد مرن (زي Power Query)' : 'Flexible Import (Power Query-like)'}
            </div>
            <div className="text-xs text-slate-500 mb-4">
              {language === 'ar'
                ? 'هنقرا الهيدر، نقترح مطابقة، وبعدها تقدر تعدل قبل الحفظ.'
                : 'We read headers, suggest mapping, then you can adjust before saving.'}
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) void onPickFile(picked);
              }}
              className="block mx-auto text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-white file:font-semibold"
            />
            {file && (
              <div className="mt-4 text-xs text-slate-400">
                {language === 'ar' ? 'الملف:' : 'File:'} <span className="text-slate-200">{file.name}</span>
              </div>
            )}
          </div>
          {loading && <div className="mt-4 text-sm text-slate-300">{t('common.loading')}</div>}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Mapping Step */}
          {analyze && step === 'mapping' && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm text-slate-200">
                    {language === 'ar' ? 'خطوة المطابقة' : 'Mapping Step'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {language === 'ar'
                      ? `صفوف: ${analyze.analysis?.totalRows ?? 0} | أعمدة: ${analyze.detectedHeaders?.length ?? 0}`
                      : `Rows: ${analyze.analysis?.totalRows ?? 0} | Columns: ${analyze.detectedHeaders?.length ?? 0}`}
                  </div>
                </div>

                {Array.isArray(mappingWarnings) && mappingWarnings.length > 0 && (
                  <div className="mt-3 space-y-1 text-xs text-yellow-200">
                    {mappingWarnings.map((w, idx) => (
                      <div key={idx}>- {w}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-black/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-cyan-500/15 text-xs text-slate-300">
                  {language === 'ar'
                    ? 'اختار لكل عمود في الإكسيل هو بيروح فين عندنا.'
                    : 'Choose where each Excel column should map in the system.'}
                </div>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#0a0f18]">
                      <tr className="text-slate-300 text-xs">
                        <th className="text-left px-4 py-3">{language === 'ar' ? 'عمود الإكسيل' : 'Excel Header'}</th>
                        <th className="text-left px-4 py-3">{language === 'ar' ? 'أمثلة' : 'Samples'}</th>
                        <th className="text-left px-4 py-3">{language === 'ar' ? 'تطابق إلى' : 'Map To'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyze.detectedHeaders || []).map((header) => {
                        const samples = analyze.samples?.[header] || [];
                        const value = (mapping?.[header] || '') as ImportField;
                        return (
                          <tr key={header} className="border-t border-cyan-500/10">
                            <td className="px-4 py-3 text-slate-200 text-xs font-semibold">{header || '—'}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                              {samples.length > 0 ? samples.join(' | ') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={value}
                                onChange={(e) =>
                                  setMapping((prev) => ({
                                    ...prev,
                                    [header]: e.target.value as ImportField,
                                  }))
                                }
                                className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-xs text-slate-100"
                              >
                                {FIELD_OPTIONS.map((opt) => (
                                  <option key={opt.id || 'ignore'} value={opt.id}>
                                    {language === 'ar' ? opt.labelAr : opt.labelEn}
                                  </option>
                                ))}
                              </select>
                              <div className="mt-1 text-[10px] text-slate-500">
                                {language === 'ar' ? 'الحالي:' : 'Current:'} {optionLabel(value)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onValidate}
                  disabled={!canValidate || loading}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                >
                  {language === 'ar' ? 'تحقق (Validation)' : 'Validate'}
                </button>
              </div>
            </div>
          )}

          {/* Validation Summary */}
          {analyze && step === 'ready' && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4">
                <div className="text-sm text-slate-200 mb-2">{language === 'ar' ? 'ملخص قبل الحفظ' : 'Summary before saving'}</div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>
                    {language === 'ar'
                      ? `لقيت ${analyze.analysis?.totalRows ?? 0} صف.`
                      : `Found ${analyze.analysis?.totalRows ?? 0} rows.`}
                  </div>
                  <div>
                    {language === 'ar'
                      ? `صفوف صالحة: ${analyze.analysis?.validRows ?? 0}`
                      : `Valid rows: ${analyze.analysis?.validRows ?? 0}`}
                  </div>
                  <div>
                    {language === 'ar'
                      ? `أسماء ناقصة: ${analyze.analysis?.missingNameCount ?? 0}`
                      : `Missing names: ${analyze.analysis?.missingNameCount ?? 0}`}
                  </div>
                  <div className="text-yellow-200">
                    {language === 'ar'
                      ? `أسعار ناقصة: ${analyze.analysis?.missingPriceCount ?? 0}`
                      : `Missing prices: ${analyze.analysis?.missingPriceCount ?? 0}`}
                  </div>
                </div>
              </div>

              {(analyze.analysis?.missingPriceCount || 0) > 0 && (
                <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4">
                  <div className="text-sm font-semibold text-yellow-200 mb-2">
                    {language === 'ar'
                      ? `في ${analyze.analysis?.missingPriceCount} منتجات أسعارهم ناقصة — تعمل إيه؟`
                      : `${analyze.analysis?.missingPriceCount} items have missing prices — what should we do?`}
                  </div>
                  <div className="space-y-2 text-sm text-yellow-100/90">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="missingPricePolicy"
                        checked={missingPricePolicy === 'skip'}
                        onChange={() => setMissingPricePolicy('skip')}
                      />
                      {language === 'ar' ? 'تخطي الصفوف الناقصة' : 'Skip rows with missing prices'}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="missingPricePolicy"
                        checked={missingPricePolicy === 'default'}
                        onChange={() => setMissingPricePolicy('default')}
                      />
                      {language === 'ar' ? 'تعيين سعر بيع افتراضي' : 'Fill missing sell price with a default'}
                    </label>
                    {missingPricePolicy === 'default' && (
                      <input
                        value={defaultSellPrice}
                        onChange={(e) => setDefaultSellPrice(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: 10' : 'e.g. 10'}
                        className="mt-2 w-full bg-[#0f172a] border border-yellow-500/25 rounded-lg px-3 py-2 text-sm text-slate-100"
                      />
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="missingPricePolicy"
                        checked={missingPricePolicy === 'zero'}
                        onChange={() => setMissingPricePolicy('zero')}
                      />
                      {language === 'ar' ? 'استيراد بسعر 0' : 'Import with price = 0'}
                    </label>
                  </div>
                </div>
              )}

              {Array.isArray(analyze.issueSamples?.missingPrice) && analyze.issueSamples?.missingPrice.length > 0 && (
                <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4 text-xs text-slate-300">
                  <div className="text-slate-200 font-semibold mb-2">
                    {language === 'ar' ? 'أمثلة (أسعار ناقصة)' : 'Examples (missing prices)'}
                  </div>
                  <ul className="space-y-1">
                    {analyze.issueSamples.missingPrice.slice(0, 5).map((x) => (
                      <li key={x.row}>
                        #{x.row} {x.value ? `— ${x.value}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 text-sm"
                >
                  {language === 'ar' ? 'رجوع للمطابقة' : 'Back to mapping'}
                </button>
                <button
                  type="button"
                  onClick={onImport}
                  disabled={loading || (missingPricePolicy === 'default' && !(Number(defaultSellPrice) > 0))}
                  className="px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-[0_0_18px_rgba(236,72,153,0.28)]"
                >
                  {language === 'ar' ? 'ابدأ الاستيراد' : 'Import now'}
                </button>
              </div>
            </div>
          )}

          {/* Final Report */}
          {report && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="text-green-300">
                {language === 'ar'
                  ? `تم استيراد ${report.importedCount} منتج`
                  : `Imported ${report.importedCount} products`}
              </div>
              {report.mappingGuide && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                  <div className="font-semibold mb-2">
                    {language === 'ar' ? 'دليل مطابقة الأعمدة (Mapping Guide)' : 'Mapping Guide'}
                  </div>
                  {report.mappingGuide?.reason && (
                    <div className="text-xs text-yellow-100/80 mb-2">{String(report.mappingGuide.reason)}</div>
                  )}
                  {Array.isArray(report.mappingGuide?.missingFields) && report.mappingGuide.missingFields.length > 0 && (
                    <div className="text-sm mb-3">
                      {language === 'ar' ? 'حقول مطلوبة ناقصة:' : 'Missing required fields:'}{' '}
                      <span className="font-semibold">{report.mappingGuide.missingFields.join(', ')}</span>
                    </div>
                  )}
                  {Array.isArray(report.detectedHeaders) && report.detectedHeaders.length > 0 && (
                    <div className="text-xs text-yellow-100/80 mb-3">
                      {language === 'ar' ? 'عناوين الأعمدة الحالية:' : 'Detected headers:'}{' '}
                      {report.detectedHeaders.slice(0, 20).join(', ')}
                      {report.detectedHeaders.length > 20 ? ' ...' : ''}
                    </div>
                  )}
                  {Array.isArray(report.mappingGuide?.requiredFields) && report.mappingGuide.requiredFields.length > 0 && (
                    <div className="space-y-2 text-xs">
                      {report.mappingGuide.requiredFields.map((field: any) => (
                        <div key={field.field} className="rounded-lg border border-yellow-500/20 bg-black/20 p-3">
                          <div className="font-semibold mb-1">{String(field.field)}</div>
                          {field.note && <div className="text-yellow-100/80 mb-2">{String(field.note)}</div>}
                          {Array.isArray(field.acceptedHeaders) && field.acceptedHeaders.length > 0 && (
                            <div className="text-yellow-100/80">
                              {language === 'ar' ? 'أمثلة لعناوين مقبولة:' : 'Accepted header examples:'}{' '}
                              {field.acceptedHeaders.slice(0, 12).join(', ')}
                              {field.acceptedHeaders.length > 12 ? ' ...' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {report.skipped.length > 0 && (
                <div className="text-slate-300">
                  {language === 'ar' ? 'تم تخطي الصفوف:' : 'Skipped rows:'}
                  <ul className="mt-2 space-y-1">
                    {report.skipped.slice(0, 10).map((row) => (
                      <li key={`${row.row}-${row.reason}`}>
                        #{row.row}: {row.reason}
                      </li>
                    ))}
                    {report.skipped.length > 10 && (
                      <li>{language === 'ar' ? '...' : '...'}</li>
                    )}
                  </ul>
                </div>
              )}
              {report.profile && (
                <div className="text-slate-300">
                  <div className="text-cyan-300">
                    {language === 'ar' ? 'تحليل الأعمدة' : 'Column profiling'}
                  </div>
                  <div className="mt-2 space-y-1">
                    {Object.entries(report.profile.columns).slice(0, 8).map(([key, meta]) => (
                      <div key={key} className="text-xs text-slate-400">
                        {key}: {language === 'ar' ? 'فارغ' : 'Empty'} {(meta.emptyRatio * 100).toFixed(0)}%,
                        {language === 'ar' ? 'رقمي' : 'Numeric'} {(meta.numericRatio * 100).toFixed(0)}%,
                        {language === 'ar' ? 'تكرار' : 'Duplicate'} {(meta.duplicateRatio * 100).toFixed(0)}%
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.unmappedColumns && report.unmappedColumns.length > 0 && (
                <div className="text-yellow-300">
                  {language === 'ar'
                    ? `أعمدة غير معروفة: ${report.unmappedColumns.join(', ')}`
                    : `Unmapped columns: ${report.unmappedColumns.join(', ')}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

