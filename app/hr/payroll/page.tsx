'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { HrPrintButton } from '@/components/HrPrintButton';
import { formatHrDateTime } from '@/lib/hrDisplay';

type Row = {
  id: number;
  employee_id: number;
  employee_name: string;
  month: string;
  base_salary: number;
  attendance_days: number;
  absent_days: number;
  leave_days?: number;
  overtime_hours: number;
  overtime_amount: number;
  deductions: number;
  bonuses: number;
  gross_salary?: number;
  tax_amount?: number;
  insurance_amount?: number;
  total_salary: number;
  paid: number;
  paid_at?: string | null;
  leave_balance_available?: number;
  leave_balance_used?: number;
  leave_balance_limit?: number;
};

type PayslipDetail = Row & {
  employee_phone?: string | null;
  job_role?: string | null;
  employee_salary_type?: string;
  contract_salary_amount?: number;
  annual_raise_percent?: number;
  annual_raise_amount?: number;
};

export default function HrPayrollPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_payroll', effectiveRole, showDenied: true });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [payAccount, setPayAccount] = useState<'cash' | 'bank'>('cash');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payslip, setPayslip] = useState<PayslipDetail | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const ar = language === 'ar';
  const locale = ar ? 'ar' : 'en';

  const load = () =>
    apiRequest(`/hr/payroll?month=${encodeURIComponent(month)}`)
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setErr(e.message));

  useEffect(() => {
    if (allowed) load();
  }, [allowed, month]);

  if (authLoading || !allowed) return null;

  const calc = async () => {
    setBusy(true);
    setErr(null);
    try {
      await apiRequest('/hr/payroll/calculate', { method: 'POST', body: JSON.stringify({ month }) });
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const payAll = async () => {
    if (!confirm(ar ? 'صرف المرتبات لهذا الشهر؟' : 'Pay all payroll for this month?')) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiRequest('/hr/payroll/pay', {
        method: 'POST',
        body: JSON.stringify({ month, payment_account: payAccount }),
      });
      alert(ar ? `تم صرف ${res.paid ?? 0}` : `Paid: ${res.paid ?? 0}`);
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const patchRow = async (id: number, bonuses: number, deductions: number) => {
    setErr(null);
    try {
      await apiRequest(`/hr/payroll/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ bonuses, deductions }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  const openPayslip = async (id: number) => {
    setPayslipLoading(true);
    setErr(null);
    try {
      const data = await apiRequest(`/hr/payroll/${id}/payslip`);
      setPayslip(data as PayslipDetail);
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setPayslipLoading(false);
    }
  };

  const fmt = (n: unknown) => (n != null && !Number.isNaN(Number(n)) ? Number(n).toFixed(2) : '—');

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-x-auto print-area">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <HrPrintButton label={ar ? 'طباعة الجدول' : 'Print table'} />
        </div>
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'الرواتب' : 'Payroll'}</h1>
        <p className="text-xs text-slate-500 mb-2 max-w-3xl">
          {ar
            ? 'بعد الاحتساب: الإجمالي قبل الضريبة والتأمينات = أساس بعد الحضور + أوفر + مكافأة − خصومات البطاقة. الصافي = ذلك − ضريبة وتأمينات شهرية من بطاقة الموظف. كشف الراتب متاح بعد الصرف.'
            : 'Gross = attendance base + OT + bonus − card deductions. Net = gross − monthly tax & insurance from employee card. Payslip after payment.'}
        </p>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        <div className="flex flex-wrap gap-3 mb-4 items-center print-hide-col">
          <input
            type="month"
            className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button type="button" disabled={busy} onClick={calc} className="px-3 py-1 rounded bg-cyan-600 text-sm disabled:opacity-50">
            {ar ? 'احسب المرتبات' : 'Calculate payroll'}
          </button>
          <select
            className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 text-sm"
            value={payAccount}
            onChange={(e) => setPayAccount(e.target.value as 'cash' | 'bank')}
          >
            <option value="cash">{ar ? 'نقدية' : 'Cash'}</option>
            <option value="bank">{ar ? 'بنك' : 'Bank'}</option>
          </select>
          <button type="button" disabled={busy} onClick={payAll} className="px-3 py-1 rounded bg-emerald-700 text-sm disabled:opacity-50">
            {ar ? 'صرف المرتبات' : 'Pay payroll'}
          </button>
        </div>
        <div className="rounded-xl border border-cyan-500/20 overflow-x-auto">
          <table className="data-table text-xs min-w-[1480px]">
            <thead>
              <tr>
                <th>{ar ? 'المعرف' : 'ID'}</th>
                <th>{ar ? 'الموظف' : 'Employee'}</th>
                <th>{ar ? 'أساس' : 'Base'}</th>
                <th>{ar ? 'أيام' : 'Days'}</th>
                <th>{ar ? 'إجازة' : 'Leave'}</th>
                <th>{ar ? 'رصيد إجازات' : 'Leave balance'}</th>
                <th>{ar ? 'غياب' : 'Absent'}</th>
                <th>{ar ? 'س. أوفر' : 'OT hrs'}</th>
                <th>{ar ? 'مبلغ أوفر' : 'OT amt'}</th>
                <th>{ar ? 'مكافآت' : 'Bonus'}</th>
                <th>{ar ? 'خصومات' : 'Deduct.'}</th>
                <th>{ar ? 'إجمالي قبل ضريبة' : 'Gross'}</th>
                <th>{ar ? 'ضريبة' : 'Tax'}</th>
                <th>{ar ? 'تأمين' : 'Insur.'}</th>
                <th>{ar ? 'الصافي' : 'Net'}</th>
                <th>{ar ? 'مدفوع' : 'Paid'}</th>
                <th className="print-hide-col">{ar ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-cyan-200/90">{r.employee_id}</td>
                  <td className="font-medium text-cyan-100/90">{r.employee_name}</td>
                  <td>{Number(r.base_salary).toFixed(2)}</td>
                  <td>{r.attendance_days}</td>
                  <td>{r.leave_days ?? 0}</td>
                  <td className="text-cyan-200/80">
                    {ar ? 'متاح ' : 'avail '}
                    {r.leave_balance_available ?? '—'}
                    {ar ? '، مستخدم ' : ', used '}
                    {r.leave_balance_used ?? '—'}
                  </td>
                  <td>{r.absent_days}</td>
                  <td>{Number(r.overtime_hours).toFixed(2)}</td>
                  <td>{Number(r.overtime_amount).toFixed(2)}</td>
                  <td>{Number(r.bonuses).toFixed(2)}</td>
                  <td>{Number(r.deductions).toFixed(2)}</td>
                  <td>
                    {fmt(
                      r.gross_salary != null && r.gross_salary !== undefined && !Number.isNaN(Number(r.gross_salary))
                        ? r.gross_salary
                        : Number(r.total_salary) + Number(r.tax_amount || 0) + Number(r.insurance_amount || 0)
                    )}
                  </td>
                  <td>{fmt(r.tax_amount)}</td>
                  <td>{fmt(r.insurance_amount)}</td>
                  <td className="font-semibold text-cyan-200">{Number(r.total_salary).toFixed(2)}</td>
                  <td>{r.paid ? (ar ? 'نعم' : 'Yes') : ar ? 'لا' : 'No'}</td>
                  <td className="print-hide-col">
                    {!r.paid && (
                      <span className="flex flex-wrap gap-1 items-center">
                        <input
                          type="number"
                          defaultValue={r.bonuses}
                          className="w-16 bg-black/40 border border-cyan-500/20 rounded px-1 text-xs"
                          id={`b-${r.id}`}
                          title={ar ? 'مكافأة' : 'Bonus'}
                        />
                        <input
                          type="number"
                          defaultValue={r.deductions}
                          className="w-16 bg-black/40 border border-cyan-500/20 rounded px-1 text-xs"
                          id={`d-${r.id}`}
                          title={ar ? 'خصم' : 'Deduction'}
                        />
                        <button
                          type="button"
                          className="text-cyan-400 text-xs"
                          onClick={() => {
                            const b = Number((document.getElementById(`b-${r.id}`) as HTMLInputElement)?.value || 0);
                            const d = Number((document.getElementById(`d-${r.id}`) as HTMLInputElement)?.value || 0);
                            patchRow(r.id, b, d);
                          }}
                        >
                          OK
                        </button>
                      </span>
                    )}
                    {!!r.paid && (
                      <button
                        type="button"
                        className="text-emerald-400 text-xs underline"
                        disabled={payslipLoading}
                        onClick={() => openPayslip(r.id)}
                      >
                        {ar ? 'كشف راتب / PDF' : 'Payslip / PDF'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payslip && (
          <>
            <div
              className="fixed inset-0 bg-black/75 z-[100] print:hidden"
              aria-hidden
              onClick={() => setPayslip(null)}
            />
            <div
              className="fixed z-[101] inset-4 md:inset-auto md:left-1/2 md:top-10 md:-translate-x-1/2 md:max-w-xl md:w-full print:static print:inset-auto print:translate-x-0 print:max-w-none print:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 print:shadow-none print:rounded-none print:border-0 print-area max-h-[90vh] overflow-y-auto payslip-sheet"
                dir={direction}
              >
                {/* رأس الكشف */}
                <div className="payslip-header px-6 pt-6 pb-4 border-b border-cyan-600/30 bg-gradient-to-b from-cyan-50 to-white">
                  <p className="text-[11px] font-semibold tracking-wider text-cyan-800/80 uppercase text-center mb-1">
                    {ar ? 'كشف راتب' : 'Payslip'}
                  </p>
                  <h2 className="text-center text-2xl font-bold text-slate-900 tracking-tight">{payslip.employee_name}</h2>
                  <p className="text-center text-sm text-slate-500 mt-1">
                    {ar ? 'فترة الراتب' : 'Pay period'}:{' '}
                    <span className="font-mono font-semibold text-slate-700">{payslip.month}</span>
                  </p>
                </div>

                <div className="px-4 sm:px-6 py-5 space-y-5">
                  {/* جدول موحّد بأقسام */}
                  <table className="w-full border-collapse text-sm payslip-table">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="text-start font-semibold text-slate-600 pb-2 pt-1 border-b-2 border-slate-200 w-[58%]"
                        >
                          {ar ? 'البيان' : 'Description'}
                        </th>
                        <th
                          scope="col"
                          className="text-end font-semibold text-slate-600 pb-2 pt-1 border-b-2 border-slate-200 w-[42%]"
                        >
                          {ar ? 'القيمة' : 'Amount'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="payslip-section">
                        <td colSpan={2} className="bg-slate-100 text-slate-800 font-bold text-xs py-2 px-3 payslip-section-cell">
                          {ar ? 'بيانات الموظف' : 'Employee details'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'رقم الموظف' : 'Employee ID'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums font-medium text-slate-900">
                          {payslip.employee_id}
                        </td>
                      </tr>
                      {payslip.employee_phone ? (
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 px-3 text-slate-600">{ar ? 'الهاتف' : 'Phone'}</td>
                          <td className="py-2.5 px-3 text-end font-mono tabular-nums">{payslip.employee_phone}</td>
                        </tr>
                      ) : null}
                      {payslip.job_role ? (
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 px-3 text-slate-600">{ar ? 'الوظيفة' : 'Job'}</td>
                          <td className="py-2.5 px-3 text-end font-medium">{payslip.job_role}</td>
                        </tr>
                      ) : null}
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'أساس مُعدّل (بعد الزيادة السنوية)' : 'Adjusted base'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums font-semibold text-slate-900">
                          {fmt(payslip.base_salary)}
                        </td>
                      </tr>

                      <tr className="payslip-section">
                        <td colSpan={2} className="bg-slate-100 text-slate-800 font-bold text-xs py-2 px-3 payslip-section-cell">
                          {ar ? 'الحضور والإضافات' : 'Attendance & additions'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'أيام حضور' : 'Attendance days'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums">{payslip.attendance_days}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'أيام إجازة' : 'Leave days'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums">{payslip.leave_days ?? 0}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'رصيد الإجازات' : 'Leave balance'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums">
                          {ar ? 'متاح ' : 'avail '}
                          {payslip.leave_balance_available ?? '—'}
                          {ar ? '، مستخدم ' : ', used '}
                          {payslip.leave_balance_used ?? '—'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'أيام غياب' : 'Absent days'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums">{payslip.absent_days}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'ساعات أوفر' : 'Overtime hours'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums">{fmt(payslip.overtime_hours)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'مبلغ أوفر' : 'Overtime amount'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums">{fmt(payslip.overtime_amount)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'مكافآت' : 'Bonuses'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums text-emerald-700">
                          {fmt(payslip.bonuses)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'خصومات' : 'Deductions'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums text-rose-700">
                          {fmt(payslip.deductions)}
                        </td>
                      </tr>

                      <tr className="payslip-section">
                        <td colSpan={2} className="bg-slate-100 text-slate-800 font-bold text-xs py-2 px-3 payslip-section-cell">
                          {ar ? 'الإجماليات والخصومات القانونية' : 'Totals & statutory'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {ar ? 'إجمالي قبل ضريبة وتأمين' : 'Gross (before tax & insurance)'}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums font-bold text-slate-900">
                          {fmt(payslip.gross_salary)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'ضريبة' : 'Tax'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums text-rose-700">− {fmt(payslip.tax_amount)}</td>
                      </tr>
                      <tr className="border-b-2 border-slate-300">
                        <td className="py-2.5 px-3 text-slate-600">{ar ? 'تأمينات' : 'Insurance'}</td>
                        <td className="py-2.5 px-3 text-end font-mono tabular-nums text-rose-700">− {fmt(payslip.insurance_amount)}</td>
                      </tr>

                      <tr className="bg-cyan-700 text-white payslip-net-row">
                        <td className="py-4 px-4 text-base font-bold">{ar ? 'صافي المستحق' : 'Net pay'}</td>
                        <td className="py-4 px-4 text-end text-xl font-extrabold font-mono tabular-nums tracking-tight">
                          {fmt(payslip.total_salary)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {payslip.paid_at ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-slate-500 px-1 border-t border-dashed border-slate-200 pt-4">
                      <span className="font-medium text-slate-600">{ar ? 'تاريخ الصرف' : 'Payment date'}</span>
                      <span className="font-mono text-slate-800">{formatHrDateTime(payslip.paid_at, locale)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-0 print:hidden">
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-semibold shadow-md shadow-cyan-600/20 hover:bg-cyan-700 transition"
                    onClick={() => window.print()}
                  >
                    {ar ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
                  </button>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
                    onClick={() => setPayslip(null)}
                  >
                    {ar ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
