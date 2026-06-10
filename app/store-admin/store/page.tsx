'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiRequest, useAuth } from '../../contexts/AuthContext';
import { useRouteGuard } from '../../guards/useRouteGuard';
import { canSeeDomainSection } from '../../permissions';

type DomainStatus = 'pending' | 'verified' | 'active' | 'inactive';
type VerificationMethod = 'txt' | 'cname';

type DomainRow = {
  id: number;
  domain: string;
  status: DomainStatus;
  is_active: number;
  verification_method: VerificationMethod;
  verification_token: string;
  verified_at: string | null;
  activated_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

type DomainsResponse = {
  config: { verifyRecordPrefix: string; cnameRoot: string };
  domains: DomainRow[];
};

export default function StoreManagementPage() {
  const { direction, language, t } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, {
    feature: 'store_management',
    effectiveRole,
    showDenied: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [cfg, setCfg] = useState({ verifyRecordPrefix: '_crown-verify', cnameRoot: 'verify.crowncs.org' });
  const [form, setForm] = useState<{ domain: string; method: VerificationMethod }>({ domain: '', method: 'txt' });

  const showDomainSection = canSeeDomainSection(effectiveRole as any);

  const slugify = (v: string) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'shop';

  const previewUrl = useMemo(() => {
    const id = Number(shopProfile?.id || 0);
    if (!id) return null;
    const baseName =
      language === 'ar'
        ? shopProfile?.business_name_ar || shopProfile?.business_name || shopProfile?.business_name_en
        : shopProfile?.business_name_en || shopProfile?.business_name || shopProfile?.business_name_ar;
    const name = baseName || shopProfile?.name || 'shop';
    return `/store/${id}-${slugify(String(name))}`;
  }, [shopProfile?.id, shopProfile?.business_name, shopProfile?.business_name_ar, shopProfile?.business_name_en, shopProfile?.name, language]);

  const storefrontLink = useMemo(() => {
    const id = Number(shopProfile?.id || 0);
    if (!id) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin || ''}/storefront?shopId=${id}`;
  }, [shopProfile?.id]);

  const loadDomains = async () => {
    if (!showDomainSection) return;
    try {
      setError(null);
      setLoading(true);
      const data = (await apiRequest('/domains')) as DomainsResponse;
      setCfg(data.config || cfg);
      setDomains(data.domains || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const loadShopProfile = async () => {
    try {
      const data = await apiRequest('/shops/profile');
      setShopProfile(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!allowed) return;
    loadShopProfile();
    if (showDomainSection) loadDomains();
    else setLoading(false);
  }, [allowed, showDomainSection]);

  const addDomain = async () => {
    if (!showDomainSection) return;
    setError(null);
    const domain = form.domain.trim();
    if (!domain) return;
    try {
      setSaving(true);
      await apiRequest('/domains/add', {
        method: 'POST',
        body: JSON.stringify({ domain, verificationMethod: form.method }),
      });
      setForm((f) => ({ ...f, domain: '' }));
      await loadDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const verifyDomain = async (domain: string) => {
    setError(null);
    try {
      setSaving(true);
      await apiRequest('/domains/verify', { method: 'POST', body: JSON.stringify({ domain }) });
      await loadDomains();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setSaving(false);
    }
  };

  const activateDomain = async (domain: string) => {
    setError(null);
    try {
      setSaving(true);
      await apiRequest('/domains/activate', { method: 'POST', body: JSON.stringify({ domain }) });
      await loadDomains();
    } catch (err: any) {
      setError(err.message || 'Activation failed');
    } finally {
      setSaving(false);
    }
  };

  const deactivateDomain = async (domain: string) => {
    setError(null);
    try {
      setSaving(true);
      await apiRequest('/domains/deactivate', { method: 'POST', body: JSON.stringify({ domain }) });
      await loadDomains();
    } catch (err: any) {
      setError(err.message || 'Deactivation failed');
    } finally {
      setSaving(false);
    }
  };

  const recordNameFor = (domainValue: string) => `${cfg.verifyRecordPrefix}.${domainValue}`;
  const recordValueFor = (row: Pick<DomainRow, 'verification_method' | 'verification_token'>) =>
    row.verification_method === 'cname'
      ? `${row.verification_token}.${cfg.cnameRoot}`
      : `crown-site-verification=${row.verification_token}`;
  const safeDomains = Array.isArray(domains) ? domains : [];

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">
          {language === 'ar' ? 'إدارة المتجر' : 'Store Management'}
        </h1>

        {/* Online Store Preview - visible to all (owner, branch_manager, cashier) */}
        <div className="neon-card rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-cyan-200 mb-3">
            {language === 'ar' ? 'معاينة المتجر الأونلاين' : 'Online Store Preview'}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {language === 'ar'
              ? 'معاينة واجهة المتجر كما يراها العملاء.'
              : 'Preview your storefront as customers see it.'}
          </p>
          {previewUrl ? (
            <>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/40 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold"
              >
                👁️ {language === 'ar' ? 'فتح المعاينة' : 'Open Preview'}
              </a>
              {storefrontLink ? (
                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-1">
                    {language === 'ar' ? 'رابط المتجر' : 'Store link'}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      readOnly
                      value={storefrontLink}
                      className="flex-1 min-w-[220px] bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-xs text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(storefrontLink);
                        } catch {}
                      }}
                      className="px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-xs"
                    >
                      {language === 'ar' ? 'نسخ' : 'Copy'}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-slate-400">{t('common.loading')}</div>
          )}
        </div>

        {/* Domain section - ONLY owner + super_admin */}
        {showDomainSection && (
          <>
            <div className="neon-card rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold text-cyan-200 mb-4">
                {language === 'ar' ? 'إدارة الدومينات' : 'Domain Management'}
              </h2>
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">
                    {language === 'ar' ? 'الدومين' : 'Domain'}
                  </label>
                  <input
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    placeholder="example.com"
                    value={form.domain}
                    onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {language === 'ar' ? 'طريقة التحقق' : 'Verification'}
                  </label>
                  <select
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                    value={form.method}
                    onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value as VerificationMethod }))}
                  >
                    <option value="txt">TXT</option>
                    <option value="cname">CNAME</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={addDomain}
                  disabled={saving || !form.domain.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50"
                >
                  {saving ? t('common.loading') : language === 'ar' ? 'إضافة دومين' : 'Add domain'}
                </button>
              </div>
            </div>

            <div className="neon-card rounded-xl p-6">
              {loading ? (
                <div className="text-sm text-slate-300">{t('common.loading')}</div>
              ) : domains.length === 0 ? (
                <div className="text-sm text-slate-400">
                  {language === 'ar' ? 'لا توجد دومينات' : 'No domains yet'}
                </div>
              ) : (
                <div className="table-scroll accounting-print">
                  <table className="data-table text-sm text-slate-200">
                    <thead>
                      <tr>
                        <th>{language === 'ar' ? 'الدومين' : 'Domain'}</th>
                        <th>{language === 'ar' ? 'الحالة' : 'Status'}</th>
                        <th>DNS</th>
                        <th className="col-center actions-column">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeDomains.map((row) => {
                        const active = Number(row.is_active) === 1 && row.status === 'active';
                        const recordName = recordNameFor(row.domain);
                        const recordValue = recordValueFor(row);
                        const type = row.verification_method === 'cname' ? 'CNAME' : 'TXT';
                        return (
                          <tr key={row.id}>
                            <td className="data-table-wrap align-top">
                              <div className="font-semibold text-white">{row.domain}</div>
                              <div className="text-xs text-slate-400">
                                {language === 'ar' ? 'مضاف:' : 'Added:'}{' '}
                                {row.created_at
                                  ? new Date(row.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                                  : '—'}
                              </div>
                            </td>
                            <td className="data-table-wrap align-top whitespace-nowrap">
                              <div
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
                                  active
                                    ? 'border-green-500/40 bg-green-500/10 text-green-200'
                                    : row.status === 'verified'
                                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                                    : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                                }`}
                              >
                                {row.status}
                              </div>
                            </td>
                            <td className="data-table-wrap align-top">
                              <div className="text-xs text-slate-300">
                                <div className="text-cyan-200 font-semibold">{type}</div>
                                <div className="mt-1">
                                  <div className="text-slate-400">{language === 'ar' ? 'الاسم:' : 'Name:'}</div>
                                  <div className="break-all">{recordName}</div>
                                </div>
                                <div className="mt-2">
                                  <div className="text-slate-400">{language === 'ar' ? 'القيمة:' : 'Value:'}</div>
                                  <div className="break-all">{recordValue}</div>
                                </div>
                              </div>
                            </td>
                            <td className="data-table-center align-top actions-column">
                              <div className="flex flex-col gap-2 items-stretch max-w-[140px] mx-auto">
                                <button
                                  onClick={() => verifyDomain(row.domain)}
                                  disabled={saving}
                                  className="px-3 py-2 rounded-lg border border-cyan-500/40 text-cyan-200 text-xs hover:bg-cyan-500/10 disabled:opacity-50"
                                >
                                  {language === 'ar' ? 'تحقق' : 'Verify'}
                                </button>
                                <button
                                  onClick={() => activateDomain(row.domain)}
                                  disabled={saving || active}
                                  className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-500 disabled:opacity-50"
                                >
                                  {language === 'ar' ? 'تفعيل' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => deactivateDomain(row.domain)}
                                  disabled={saving || !active}
                                  className="px-3 py-2 rounded-lg border border-red-500/40 text-red-200 text-xs hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  {language === 'ar' ? 'إيقاف' : 'Deactivate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
