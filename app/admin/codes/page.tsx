'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiRequest, useAuth } from '../../contexts/AuthContext';
import { useRouteGuard } from '../../guards/useRouteGuard';

interface LicenseItem {
  id: number;
  license_key: string;
  plan: string;
  duration: string;
  duration_days?: number | null;
  status: string;
  used_by_user_id: number | null;
  used_by_shop_id?: number | null;
  used_at: string | null;
  expires_at?: string | null;
  code_expires_at?: string | null;
  permissions?: Record<string, boolean>;
  created_at: string;
}

interface AiCodeItem {
  id: number;
  code: string;
  ai_messages: number;
  ocr_credits: number;
  expires_at: string | null;
  is_used: number;
  used_by_shop_id: number | null;
  used_at: string | null;
  created_at: string;
}

type ListFilter =
  | 'all'
  | 'activated'
  | 'not_activated'
  | 'expired'
  | 'ai_addon'
  | 'ai_active'
  | 'ai_expired';

type UnifiedRow =
  | { kind: 'license'; key: string; created_at: string; license: LicenseItem }
  | { kind: 'ai'; key: string; created_at: string; ai: AiCodeItem };

function aiRowStatus(ai: AiCodeItem): 'active' | 'unused' | 'expired' {
  if (Number(ai.is_used)) return 'active';
  if (ai.expires_at) {
    const ex = new Date(ai.expires_at);
    if (!isNaN(ex.getTime()) && ex.getTime() < Date.now()) return 'expired';
  }
  return 'unused';
}

export default function AdminCodesPage() {
  const { direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'admin_codes', effectiveRole, showDenied: true });
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [aiCodes, setAiCodes] = useState<AiCodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListFilter>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const [licenseForm, setLicenseForm] = useState({
    plan: 'bronze',
    duration: 'monthly',
    count: '1',
    customDays: '',
    validDays: '',
  });
  const [generatedPlanCodes, setGeneratedPlanCodes] = useState<string[]>([]);
  const [planGenerating, setPlanGenerating] = useState(false);

  const [aiMessagesInput, setAiMessagesInput] = useState<string>('100');
  const [ocrCreditsInput, setOcrCreditsInput] = useState<string>('20');
  /** Days until unused code expires (same idea as plan code validity). */
  const [aiCodeValidDays, setAiCodeValidDays] = useState<string>('90');
  const [aiCodeGenerating, setAiCodeGenerating] = useState(false);
  const [generatedAiCode, setGeneratedAiCode] = useState<string | null>(null);
  const [aiCodeError, setAiCodeError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const aiFilterMap: Record<string, string> = {
        ai_addon: 'all',
        ai_active: 'active',
        ai_expired: 'expired',
      };

      if (filter === 'all') {
        const [licData, aiData] = await Promise.all([
          apiRequest('/licenses?filter=all'),
          apiRequest('/admin/ai-codes?filter=all'),
        ]);
        setLicenses(Array.isArray(licData) ? licData : []);
        setAiCodes(Array.isArray(aiData) ? aiData : []);
      } else if (filter in aiFilterMap) {
        const aiData = await apiRequest(`/admin/ai-codes?filter=${aiFilterMap[filter]}`);
        setLicenses([]);
        setAiCodes(Array.isArray(aiData) ? aiData : []);
      } else {
        const licData = await apiRequest(`/licenses?filter=${filter}`);
        setLicenses(Array.isArray(licData) ? licData : []);
        setAiCodes([]);
      }
      setSelectedKeys(new Set());
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to load codes');
      setError(
        msg.includes('not found') || msg.includes('404')
          ? language === 'ar'
            ? 'الخدمة غير متوفرة. تأكد من تشغيل الخادم.'
            : 'Service not found. Please ensure the backend is running.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, [filter, language]);

  useEffect(() => {
    if (authLoading || !user || !allowed) return;
    if (user.role !== 'super_admin') return;
    loadData();
  }, [authLoading, user, allowed, loadData]);

  const mergedRows: UnifiedRow[] = useMemo(() => {
    const out: UnifiedRow[] = [];
    for (const license of licenses) {
      out.push({
        kind: 'license',
        key: `l-${license.id}`,
        created_at: license.created_at,
        license,
      });
    }
    for (const ai of aiCodes) {
      out.push({
        kind: 'ai',
        key: `a-${ai.id}`,
        created_at: ai.created_at,
        ai,
      });
    }
    out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return out;
  }, [licenses, aiCodes]);

  const generatePlanCodes = async () => {
    if (user?.role !== 'super_admin') return;
    setError(null);
    setGeneratedPlanCodes([]);
    try {
      setPlanGenerating(true);
      const result = (await apiRequest('/licenses/generate', {
        method: 'POST',
        body: JSON.stringify({
          plan: licenseForm.plan,
          duration: licenseForm.duration,
          count: parseInt(licenseForm.count || '1', 10),
          customDays: licenseForm.customDays ? parseInt(licenseForm.customDays, 10) : undefined,
          validDays: licenseForm.validDays ? parseInt(licenseForm.validDays, 10) : undefined,
        }),
      })) as { codes?: string[] };
      const codes = result.codes || [];
      setGeneratedPlanCodes(codes);
      toast.success(language === 'ar' ? 'تم توليد الأكواد' : 'Codes generated');
      await loadData();
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل توليد الأكواد' : 'Failed to generate codes'));
    } finally {
      setPlanGenerating(false);
    }
  };

  const generateAiAddonCode = async () => {
    if (user?.role !== 'super_admin') return;
    setAiCodeError(null);
    setGeneratedAiCode(null);
    const aiMessages = Math.max(0, Math.floor(Number(aiMessagesInput) || 0));
    const ocrCredits = Math.max(0, Math.floor(Number(ocrCreditsInput) || 0));
    if (aiMessages === 0 && ocrCredits === 0) {
      setAiCodeError(
        language === 'ar' ? 'أدخل رقمًا أكبر من صفر لرسائل AI أو لمسح الفواتير.' : 'Enter at least one AI message or one OCR credit.'
      );
      return;
    }
    const validDays = Math.floor(Number(aiCodeValidDays) || 0);
    if (validDays < 1) {
      setAiCodeError(
        language === 'ar' ? 'أدخل عدد أيام صالحة للكود (1 أو أكثر).' : 'Enter code validity in days (1 or more).'
      );
      return;
    }
    try {
      setAiCodeGenerating(true);
      const body: Record<string, unknown> = { aiMessages, ocrCredits, validDays };
      const res = (await apiRequest('/admin/ai-codes', {
        method: 'POST',
        body: JSON.stringify(body),
      })) as { ok?: boolean; code?: string; error?: string };
      if (res?.ok && res.code) {
        setGeneratedAiCode(String(res.code));
        toast.success(language === 'ar' ? 'تم إنشاء كود الإضافة' : 'Add-on code created');
        await loadData();
      } else {
        setAiCodeError(res?.error || (language === 'ar' ? 'فشل إنشاء الكود' : 'Failed to generate code'));
      }
    } catch (err: any) {
      setAiCodeError(String(err?.message || (language === 'ar' ? 'فشل إنشاء الكود' : 'Failed to generate code')));
    } finally {
      setAiCodeGenerating(false);
    }
  };

  const deleteLicenseRow = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/licenses/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to delete');
      setError(
        msg.includes('not found') || msg.includes('404')
          ? language === 'ar'
            ? 'الكود غير موجود أو تم حذفه.'
            : 'Code not found or already deleted.'
          : msg
      );
    }
  };

  const deleteAiRow = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/admin/ai-codes/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      setError(String(err?.message || (language === 'ar' ? 'فشل الحذف' : 'Delete failed')));
    }
  };

  const bulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    setError(null);
    const licenseIds: number[] = [];
    const aiIds: number[] = [];
    for (const k of selectedKeys) {
      if (k.startsWith('l-')) licenseIds.push(Number(k.slice(2)));
      else if (k.startsWith('a-')) aiIds.push(Number(k.slice(2)));
    }
    try {
      if (licenseIds.length > 0) {
        await apiRequest('/licenses/bulk-delete', {
          method: 'POST',
          body: JSON.stringify({ ids: licenseIds }),
        });
      }
      for (const id of aiIds) {
        await apiRequest(`/admin/ai-codes/${id}`, { method: 'DELETE' });
      }
      await loadData();
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to bulk delete');
      setError(
        msg.includes('not found') || msg.includes('404')
          ? language === 'ar'
            ? 'الخدمة غير متوفرة. تأكد من تشغيل الخادم.'
            : 'Service not found. Please ensure the backend is running.'
          : msg
      );
    }
  };

  const archiveActivated = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await apiRequest('/licenses/archive-activated', { method: 'POST' });
      const deleted = result?.deleted ?? 0;
      setSuccess(language === 'ar' ? `تم أرشفة ${deleted} كود` : `${deleted} codes archived`);
      await loadData();
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to archive');
      setError(
        msg.includes('not found') || msg.includes('404')
          ? language === 'ar'
            ? 'الخدمة غير متوفرة. تأكد من تشغيل الخادم.'
            : 'Service not found. Please ensure the backend is running.'
          : msg
      );
    }
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === mergedRows.length) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(mergedRows.map((r) => r.key)));
  };

  const title = language === 'ar' ? 'قائمة الأكواد' : 'Codes List';
  const subtitle = language === 'ar' ? 'إدارة أكواد التفعيل والإضافات' : 'Manage activation & add-on codes';

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">{title}</h1>
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            {language === 'ar' ? 'العودة للإدارة' : 'Back to Admin'}
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">{success}</div>
        )}

        {user?.role === 'super_admin' && (
          <>
            <div className="mb-8 p-6 rounded-xl border border-cyan-500/30 bg-[#0a1628]/80 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold text-cyan-200">
                  {language === 'ar' ? 'مولد أكواد الباقات' : 'Subscription plan code generator'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  value={licenseForm.plan}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, plan: e.target.value }))}
                >
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="branches">Branches</option>
                </select>
                <select
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  value={licenseForm.duration}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, duration: e.target.value }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="custom">Custom (days)</option>
                </select>
                {licenseForm.duration === 'custom' && (
                  <input
                    type="number"
                    className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder="Custom days"
                    value={licenseForm.customDays}
                    onChange={(e) => setLicenseForm((prev) => ({ ...prev, customDays: e.target.value }))}
                  />
                )}
                <input
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'الكمية' : 'Count'}
                  value={licenseForm.count}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, count: e.target.value }))}
                />
                <input
                  type="number"
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder={language === 'ar' ? 'صلاحية الكود (أيام)' : 'Code validity (days)'}
                  value={licenseForm.validDays}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, validDays: e.target.value }))}
                />
              </div>
              <button
                type="button"
                disabled={planGenerating}
                onClick={generatePlanCodes}
                className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50"
              >
                {planGenerating ? (language === 'ar' ? 'جاري التوليد...' : 'Generating...') : language === 'ar' ? 'توليد الأكواد' : 'Generate Codes'}
              </button>
              {generatedPlanCodes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {generatedPlanCodes.map((code) => (
                    <div
                      key={code}
                      className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#0f172a] px-3 py-2 text-sm text-cyan-200"
                    >
                      <code className="flex-1 font-mono">{code}</code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          toast.success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                        }}
                        className="p-1.5 rounded border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300"
                        title={language === 'ar' ? 'نسخ' : 'Copy'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8 p-6 rounded-xl border border-cyan-500/30 bg-[#0a1628]/80 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
              <h2 className="text-lg font-bold text-cyan-200 mb-1">
                {language === 'ar' ? 'أكواد إضافة الذكاء الاصطناعي / OCR' : 'AI Add-on Codes'}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                {language === 'ar'
                  ? 'أنشئ كودًا لمرة واحدة يزيد حدود المساعد الذكي و/أو قراءة فواتير المسح الضوئي لمتجر العميل. يظهر الكود في الجدول أدناه بعد التوليد.'
                  : 'Generate a one-time code for AI/OCR credits; it appears in the table below after creation.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-cyan-400/90 mb-1.5">
                    {language === 'ar' ? 'عدد رسائل المساعد الذكي' : 'AI assistant messages'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-[#0f172a] border border-cyan-500/25 rounded-lg px-3 py-2 text-sm text-cyan-100"
                    value={aiMessagesInput}
                    onChange={(e) => setAiMessagesInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-400/90 mb-1.5">
                    {language === 'ar' ? 'عدد عمليات مسح الفواتير (OCR)' : 'Invoice OCR uploads'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-[#0f172a] border border-cyan-500/25 rounded-lg px-3 py-2 text-sm text-cyan-100"
                    value={ocrCreditsInput}
                    onChange={(e) => setOcrCreditsInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-400/90 mb-1.5">
                    {language === 'ar' ? 'صلاحية الكود (أيام)' : 'Code validity (days)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full bg-[#0f172a] border border-cyan-500/25 rounded-lg px-3 py-2 text-sm text-cyan-100"
                    placeholder="90"
                    value={aiCodeValidDays}
                    onChange={(e) => setAiCodeValidDays(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {language === 'ar'
                      ? 'المدة التي يظل فيها الكود غير المستخدم صالحاً (يُحسب من لحظة الإنشاء).'
                      : 'How long an unused code stays valid (from creation).'}
                  </p>
                </div>
              </div>
              {aiCodeError && (
                <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-sm">{aiCodeError}</div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={aiCodeGenerating}
                  onClick={generateAiAddonCode}
                  className="px-5 py-2.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white font-semibold text-sm border border-cyan-400/30 disabled:opacity-50"
                >
                  {aiCodeGenerating
                    ? language === 'ar'
                      ? 'جاري التوليد...'
                      : 'Generating...'
                    : language === 'ar'
                      ? 'توليد كود ذكاء اصطناعي'
                      : 'Generate AI Code'}
                </button>
                {generatedAiCode && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-2">
                    <span className="text-xs text-slate-400">{language === 'ar' ? 'الكود:' : 'Code:'}</span>
                    <code className="font-mono text-emerald-300 text-sm tracking-wide">{generatedAiCode}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedAiCode);
                        toast.success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                      }}
                      className="p-1.5 rounded border border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300"
                      title={language === 'ar' ? 'نسخ' : 'Copy'}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm max-w-[min(100%,280px)]"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ListFilter)}
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="activated">{language === 'ar' ? 'المفعلة (باقات)' : 'Activated (plans)'}</option>
            <option value="not_activated">{language === 'ar' ? 'غير المفعلة (باقات)' : 'Not activated (plans)'}</option>
            <option value="expired">{language === 'ar' ? 'منتهية (باقات)' : 'Expired (plans)'}</option>
            <option value="ai_addon">{language === 'ar' ? 'أكواد إضافة الذكاء / OCR' : 'AI / OCR add-on codes'}</option>
            <option value="ai_active">{language === 'ar' ? 'إضافة ذكاء — فعّالة' : 'AI add-on — active'}</option>
            <option value="ai_expired">{language === 'ar' ? 'إضافة ذكاء — منتهية' : 'AI add-on — expired'}</option>
          </select>
          {selectedKeys.size > 0 && (
            <button
              onClick={bulkDelete}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500"
            >
              {language === 'ar' ? `حذف المحدد (${selectedKeys.size})` : `Delete selected (${selectedKeys.size})`}
            </button>
          )}
          {filter === 'activated' && licenses.length > 0 && (
            <button
              onClick={archiveActivated}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500"
            >
              {language === 'ar' ? 'أرشفة الأكواد المفعلة' : 'Archive activated codes'}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cyan-500/20">
            <table className="w-full text-sm">
              <thead className="text-cyan-400 border-b border-cyan-500/20 bg-[#0f172a]">
                <tr>
                  <th className="py-2 px-3 text-left">
                    <input
                      type="checkbox"
                      checked={mergedRows.length > 0 && selectedKeys.size === mergedRows.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="py-2 px-3 w-10"></th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'الباقة / الوصف' : 'Plan / detail'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'المدة / الرصيد' : 'Duration / credits'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'تاريخ التفعيل' : 'Activation'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expires'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map((row) => {
                  if (row.kind === 'license') {
                    const item = row.license;
                    return (
                      <tr key={row.key} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(row.key)}
                            onChange={() => toggleSelect(row.key)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-xs">{language === 'ar' ? 'باقة' : 'Plan'}</td>
                        <td className="py-2 px-3 font-mono text-cyan-200">{item.license_key}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.license_key);
                              toast.success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                            }}
                            className="p-1.5 rounded border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300"
                            title={language === 'ar' ? 'نسخ الكود' : 'Copy code'}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-2 px-3 capitalize">{item.plan}</td>
                        <td className="py-2 px-3 capitalize">
                          {item.duration === 'custom' && item.duration_days
                            ? `${language === 'ar' ? 'مخصص' : 'Custom'} (${item.duration_days} ${language === 'ar' ? 'يوم' : 'days'})`
                            : item.duration}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={
                              item.status === 'active'
                                ? 'text-green-400'
                                : item.status === 'unused'
                                  ? 'text-slate-400'
                                  : 'text-amber-400'
                            }
                          >
                            {item.status === 'active'
                              ? language === 'ar'
                                ? 'مفعل'
                                : 'Activated'
                              : item.status === 'unused'
                                ? language === 'ar'
                                  ? 'غير مفعل'
                                  : 'Not activated'
                                : item.status === 'expired'
                                  ? language === 'ar'
                                    ? 'منتهي'
                                    : 'Expired'
                                  : item.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {item.used_at
                            ? new Date(item.used_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                            : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {item.used_at && item.expires_at
                            ? new Date(item.expires_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                            : item.code_expires_at
                              ? new Date(item.code_expires_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                              : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => deleteLicenseRow(item.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            {language === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  const ai = row.ai;
                  const st = aiRowStatus(ai);
                  return (
                    <tr key={row.key} className="border-b border-violet-500/10 hover:bg-violet-500/5">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(row.key)}
                          onChange={() => toggleSelect(row.key)}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-violet-300 text-xs font-medium">
                        {language === 'ar' ? 'إضافة ذكاء' : 'AI add-on'}
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-200">{ai.code}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ai.code);
                            toast.success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                          }}
                          className="p-1.5 rounded border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300"
                          title={language === 'ar' ? 'نسخ الكود' : 'Copy code'}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {language === 'ar' ? 'إضافة ذكاء / OCR' : 'AI / OCR add-on'}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {ai.ai_messages} AI · {ai.ocr_credits} OCR
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            st === 'active' ? 'text-green-400' : st === 'unused' ? 'text-slate-400' : 'text-amber-400'
                          }
                        >
                          {st === 'active'
                            ? language === 'ar'
                              ? 'مفعل'
                              : 'Activated'
                            : st === 'unused'
                              ? language === 'ar'
                                ? 'غير مفعل'
                                : 'Not activated'
                              : language === 'ar'
                                ? 'منتهي'
                                : 'Expired'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {ai.used_at
                          ? new Date(ai.used_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                          : '—'}
                      </td>
                      <td className="py-2 px-3">
                        {ai.expires_at
                          ? new Date(ai.expires_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                          : '—'}
                      </td>
                      <td className="py-2 px-3">
                        <button onClick={() => deleteAiRow(ai.id)} className="text-red-400 hover:text-red-300 text-xs">
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {mergedRows.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                {language === 'ar' ? 'لا توجد أكواد' : 'No codes found'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
