'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { canAccess, getPlanFeatures } from '@/permissions';
import { formatHrDateOnly } from '@/lib/hrDisplay';
import { HrPrintButton } from '@/components/HrPrintButton';

function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

function fmtDate(iso: string | null | undefined, ar: boolean, withTime = false) {
  if (!iso) return '—';
  if (!withTime) return formatHrDateOnly(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleString(ar ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtNum(v: unknown, decimals = 2): string {
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}

export default function HrReportsPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_reports', effectiveRole, showDenied: true });
  const [tab, setTab] = useState<'attendance' | 'payroll' | 'overtime' | 'absence'>('attendance');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [from, setFrom] = useState(() => monthRange(month).from);
  const [to, setTo] = useState(() => monthRange(month).to);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ar = language === 'ar';
  const planFeatures = getPlanFeatures(user?.package);
  const canPayroll = canAccess(effectiveRole as any, 'hr_payroll', planFeatures);

  const { from: mf, to: mt } = useMemo(() => monthRange(month), [month]);

  useEffect(() => {
    setData([]);
    setErr(null);
  }, [tab]);

  if (authLoading || !allowed) return null;

  const run = async () => {
    setErr(null);
    setLoading(true);
    try {
      let url = '';
      if (tab === 'attendance') url = `/hr/reports/attendance?from=${from}&to=${to}`;
      else if (tab === 'payroll') {
        if (!canPayroll) {
          setErr(ar ? 'غير مسموح' : 'Not allowed');
          setLoading(false);
          return;
        }
        url = `/hr/reports/payroll?month=${encodeURIComponent(month)}`;
      } else if (tab === 'overtime') url = `/hr/reports/overtime?from=${mf}&to=${mt}`;
      else if (tab === 'absence') {
        if (!canPayroll) {
          setErr(ar ? 'غير مسموح' : 'Not allowed');
          setLoading(false);
          return;
        }
        url = `/hr/reports/absence?month=${encodeURIComponent(month)}`;
      }
      const r = await apiRequest(url);
      setData(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setErr(e.message || 'Error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const tabs = (
    <div className="flex flex-wrap gap-2 mb-4">
      {(['attendance', 'overtime', 'payroll', 'absence'] as const).map((t) => {
        if ((t === 'payroll' || t === 'absence') && !canPayroll) return null;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded text-sm font-semibold transition ${
              tab === t ? 'bg-cyan-600 text-white' : 'bg-[#0f172a] border border-cyan-500/20 text-slate-300 hover:border-cyan-400/50'
            }`}
          >
            {t === 'attendance' && (ar ? 'الحضور والانصراف' : 'Attendance')}
            {t === 'payroll' && (ar ? 'الرواتب' : 'Payroll')}
            {t === 'overtime' && (ar ? 'الأوفر تايم' : 'Overtime')}
            {t === 'absence' && (ar ? 'الغياب' : 'Absence')}
          </button>
        );
      })}
    </div>
  );

  const emptyMsg = ar ? 'لا توجد بيانات. اضغط «تشغيل التقرير».' : 'No data. Click “Run report”.';

  const tableShell = (children: React.ReactNode) => (
    <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628] overflow-x-auto max-h-[65vh] overflow-y-auto">
      <table className="data-table text-sm min-w-full">{children}</table>
    </div>
  );

  const renderAttendance = () => {
    if (!data.length) return <p className="text-slate-500 text-sm py-8 text-center">{emptyMsg}</p>;
    return tableShell(
      <>
        <thead>
          <tr>
            <th>{ar ? 'المعرف' : 'ID'}</th>
            <th>{ar ? 'الموظف' : 'Employee'}</th>
            <th>{ar ? 'التاريخ' : 'Date'}</th>
            <th>{ar ? 'دخول' : 'Check-in'}</th>
            <th>{ar ? 'خروج' : 'Check-out'}</th>
            <th>{ar ? 'الساعات' : 'Hours'}</th>
            <th>{ar ? 'أوفر' : 'OT'}</th>
            <th>{ar ? 'الحالة' : 'Status'}</th>
            <th>{ar ? 'المصدر' : 'Source'}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              <td className="font-mono text-cyan-200/90">{String(row.employee_id ?? '—')}</td>
              <td className="font-medium text-cyan-100/90">{String(row.employee_name ?? '—')}</td>
              <td>{formatHrDateOnly((row as any).date_display ?? row.date)}</td>
              <td className="font-mono text-xs whitespace-nowrap">{fmtDate(String(row.check_in ?? ''), ar, true)}</td>
              <td className="font-mono text-xs whitespace-nowrap">{fmtDate(String(row.check_out ?? ''), ar, true)}</td>
              <td>{fmtNum(row.total_hours, 2)}</td>
              <td>{fmtNum((row as any).overtime_hours_effective ?? row.overtime_hours, 2)}</td>
              <td>{String(row.status ?? '—')}</td>
              <td>{String(row.source ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </>
    );
  };

  const renderOvertime = () => {
    if (!data.length) return <p className="text-slate-500 text-sm py-8 text-center">{emptyMsg}</p>;
    return tableShell(
      <>
        <thead>
          <tr>
            <th>{ar ? 'المعرف' : 'ID'}</th>
            <th>{ar ? 'الموظف' : 'Employee'}</th>
            <th>{ar ? 'إجمالي ساعات الأوفر' : 'Total OT hours'}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={String(row.employee_id ?? i)}>
              <td className="font-mono text-cyan-200/90">{String(row.employee_id ?? '—')}</td>
              <td className="font-medium text-cyan-100/90">{String(row.employee_name ?? '—')}</td>
              <td>{fmtNum(row.overtime_hours, 2)}</td>
            </tr>
          ))}
        </tbody>
      </>
    );
  };

  const renderPayroll = () => {
    if (!data.length) return <p className="text-slate-500 text-sm py-8 text-center">{emptyMsg}</p>;
    return tableShell(
      <>
        <thead>
          <tr>
            <th>{ar ? 'المعرف' : 'ID'}</th>
            <th>{ar ? 'الموظف' : 'Employee'}</th>
            <th>{ar ? 'الشهر' : 'Month'}</th>
            <th>{ar ? 'الأساس' : 'Base'}</th>
            <th>{ar ? 'أيام حضور' : 'Present days'}</th>
            <th>{ar ? 'أيام غياب' : 'Absent'}</th>
            <th>{ar ? 'س. أوفر' : 'OT hrs'}</th>
            <th>{ar ? 'مبلغ أوفر' : 'OT amt'}</th>
            <th>{ar ? 'خصومات' : 'Deduct.'}</th>
            <th>{ar ? 'مكافآت' : 'Bonus'}</th>
            <th>{ar ? 'إجمالي قبل ضريبة' : 'Gross'}</th>
            <th>{ar ? 'ضريبة' : 'Tax'}</th>
            <th>{ar ? 'تأمين' : 'Insur.'}</th>
            <th>{ar ? 'الصافي' : 'Net'}</th>
            <th>{ar ? 'مدفوع' : 'Paid'}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              <td className="font-mono text-cyan-200/90">{String((row as any).employee_id ?? '—')}</td>
              <td className="font-medium text-cyan-100/90">{String(row.employee_name ?? '—')}</td>
              <td>{String(row.month ?? '—')}</td>
              <td>{fmtNum(row.base_salary, 2)}</td>
              <td>{String(row.attendance_days ?? '—')}</td>
              <td>{String(row.absent_days ?? '—')}</td>
              <td>{fmtNum(row.overtime_hours, 2)}</td>
              <td>{fmtNum(row.overtime_amount, 2)}</td>
              <td>{fmtNum(row.deductions, 2)}</td>
              <td>{fmtNum(row.bonuses, 2)}</td>
              <td>{fmtNum((row as any).gross_salary, 2)}</td>
              <td>{fmtNum((row as any).tax_amount, 2)}</td>
              <td>{fmtNum((row as any).insurance_amount, 2)}</td>
              <td className="font-semibold text-cyan-200">{fmtNum(row.total_salary, 2)}</td>
              <td>{Number(row.paid) === 1 ? (ar ? 'نعم' : 'Yes') : ar ? 'لا' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </>
    );
  };

  const renderAbsence = () => {
    if (!data.length) return <p className="text-slate-500 text-sm py-8 text-center">{emptyMsg}</p>;
    return tableShell(
      <>
        <thead>
          <tr>
            <th>{ar ? 'الموظف' : 'Employee'}</th>
            <th>{ar ? 'أيام الحضور' : 'Present days'}</th>
            <th>{ar ? 'أيام الغياب' : 'Absent days'}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={String(row.employee_id ?? i)}>
              <td className="font-medium text-cyan-100/90">{String(row.name ?? '—')}</td>
              <td>{String(row.present_days ?? '—')}</td>
              <td className="text-amber-200/90">{String(row.absent_days ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-x-auto print-area">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <HrPrintButton label={ar ? 'طباعة التقرير' : 'Print report'} />
        </div>
        <h1 className="text-2xl font-bold text-cyan-200 mb-2">{ar ? 'تقارير HR' : 'HR Reports'}</h1>
        <p className="text-sm text-slate-500 mb-4">
          {ar ? 'جداول منظمة حسب نوع التقرير' : 'Structured tables by report type'}
        </p>
        {tabs}
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        {tab === 'attendance' && (
          <div className="flex flex-wrap gap-2 mb-3 items-center print-hide-col">
            <span className="text-xs text-slate-400">{ar ? 'من' : 'From'}</span>
            <input
              type="date"
              className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-xs text-slate-400">{ar ? 'إلى' : 'To'}</span>
            <input
              type="date"
              className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        )}
        {(tab === 'payroll' || tab === 'absence' || tab === 'overtime') && (
          <div className="flex flex-wrap gap-2 mb-3 items-center print-hide-col">
            <span className="text-xs text-slate-400">{ar ? 'الشهر' : 'Month'}</span>
            <input
              type="month"
              className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1.5 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="mb-6 px-4 py-2 rounded-lg bg-cyan-600 text-sm font-semibold disabled:opacity-50 hover:bg-cyan-500 transition print-hide-col"
        >
          {loading ? (ar ? 'جاري التحميل…' : 'Loading…') : ar ? 'تشغيل التقرير' : 'Run report'}
        </button>

        {tab === 'attendance' && renderAttendance()}
        {tab === 'overtime' && renderOvertime()}
        {tab === 'payroll' && renderPayroll()}
        {tab === 'absence' && renderAbsence()}
      </div>
    </div>
  );
}
