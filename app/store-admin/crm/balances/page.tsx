'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { ShopSwitcher, getActiveShopId } from '@/components/ShopSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';

type BalanceRow = {
  customer_name: string;
  customer_phone: string | null;
  total_due: number;
  debt_count: number;
};

export default function CrmBalancesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'crm_customer_balances', effectiveRole, showDenied: true });
  const isSuperAdmin = user?.role === 'super_admin';
  const needsShop = isSuperAdmin && !getActiveShopId();

  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (needsShop) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/crm/customer-balances');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.message === 'SHOP_ID_REQUIRED') {
        setError(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
      } else {
        setError(e?.message || 'Failed to load');
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [needsShop, language]);

  useEffect(() => {
    if (!authLoading && allowed) void load();
  }, [authLoading, allowed, load]);

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        {isSuperAdmin && (
          <div className="mb-4">
            <ShopSwitcher />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Link href="/store-admin/crm" className="text-sm text-cyan-400 hover:text-cyan-300">
            ← {language === 'ar' ? 'العملاء' : 'Customers'}
          </Link>
          <h1 className="text-2xl font-bold text-cyan-200">
            {language === 'ar' ? 'أرصدة العملاء (آجل)' : 'Customer balances (on account)'}
          </h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          {language === 'ar'
            ? 'ملخص من سجل الديون حسب اسم العميل ورقم الهاتف.'
            : 'Summary from on-account debts by customer name and phone.'}
        </p>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table text-sm text-slate-200 min-w-[520px]">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th>{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th className="text-end">{language === 'ar' ? 'إجمالي المستحق' : 'Total due'}</th>
                  <th className="text-end">{language === 'ar' ? 'عدد السجلات' : 'Records'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.customer_name}-${r.customer_phone}-${i}`}>
                    <td>{r.customer_name}</td>
                    <td className="data-table-num">{r.customer_phone || '—'}</td>
                    <td className="data-table-num text-end font-mono">{Number(r.total_due).toFixed(2)}</td>
                    <td className="data-table-num text-end">{r.debt_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && !needsShop && (
              <p className="text-slate-500 text-sm mt-4">{language === 'ar' ? 'لا توجد أرصدة.' : 'No balances.'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
