'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { HrPrintButton } from '@/components/HrPrintButton';

function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

type Row = { employee_id: number; employee_name: string; overtime_hours: number };

export default function HrOvertimePage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_overtime', effectiveRole, showDenied: true });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rows, setRows] = useState<Row[]>([]);
  const ar = language === 'ar';

  const { from, to } = useMemo(() => monthRange(month), [month]);

  useEffect(() => {
    if (!allowed) return;
    apiRequest(`/hr/overtime?from=${from}&to=${to}`)
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => setRows([]));
  }, [allowed, from, to]);

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-x-auto print-area">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <HrPrintButton label={ar ? 'طباعة' : 'Print'} />
        </div>
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'الأوفر تايم' : 'Overtime'}</h1>
        <input
          type="month"
          className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 mb-4 print-hide-col"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <table className="data-table text-sm min-w-[480px]">
          <thead>
            <tr>
              <th>{ar ? 'المعرف' : 'ID'}</th>
              <th>{ar ? 'الموظف' : 'Employee'}</th>
              <th>{ar ? 'ساعات أوفر' : 'Overtime hours'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employee_id}>
                <td className="font-mono text-cyan-200/90">{r.employee_id}</td>
                <td>{r.employee_name}</td>
                <td>{Number(r.overtime_hours).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
