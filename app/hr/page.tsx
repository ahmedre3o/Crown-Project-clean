'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { HrPrintButton } from '@/components/HrPrintButton';

export default function HrDashboardPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_dashboard', effectiveRole, showDenied: true });
  const [data, setData] = useState<{
    employeeCount: number;
    presentToday: number;
    absentToday: number;
    unpaidPayrollTotal: number;
  } | null>(null);

  useEffect(() => {
    if (!allowed) return;
    apiRequest('/hr/dashboard')
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, [allowed]);

  if (authLoading || !allowed) return null;
  const ar = language === 'ar';

  const Kpi = ({ title, value }: { title: string; value: string | number }) => (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0f172a] p-4">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-cyan-200">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto print-area">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <HrPrintButton label={ar ? 'طباعة' : 'Print'} />
        </div>
        <h1 className="text-2xl font-bold text-cyan-200 mb-2">{ar ? 'لوحة HR' : 'HR Dashboard'}</h1>
        <p className="text-sm text-slate-400 mb-6">{ar ? 'ملخص سريع' : 'Quick overview'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi title={ar ? 'عدد الموظفين' : 'Employees'} value={data?.employeeCount ?? '—'} />
          <Kpi title={ar ? 'الحضور اليوم' : 'Present today'} value={data?.presentToday ?? '—'} />
          <Kpi title={ar ? 'الغياب اليوم' : 'Absent today'} value={data?.absentToday ?? '—'} />
          <Kpi
            title={ar ? 'إجمالي الرواتب غير المصروفة' : 'Unpaid payroll total'}
            value={data?.unpaidPayrollTotal != null ? Number(data.unpaidPayrollTotal).toFixed(2) : '—'}
          />
        </div>
      </div>
    </div>
  );
}
