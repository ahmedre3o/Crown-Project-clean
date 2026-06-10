'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { formatHrDateOnly, formatHrDateTime, formatHrHours } from '@/lib/hrDisplay';
import { HrPrintButton } from '@/components/HrPrintButton';

function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Row = {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_phone?: string | null;
  employee_salary_type?: string;
  employee_salary_amount?: number;
  employee_working_hours_per_day?: number;
  employee_monthly_bonus?: number;
  employee_monthly_deduction?: number;
  date_display?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  overtime_hours_effective?: number;
  status: string;
};

function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

export default function HrAttendancePage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_attendance', effectiveRole, showDenied: true });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string; phone: string | null }[]>([]);
  const [empId, setEmpId] = useState('');
  const [workDate, setWorkDate] = useState(() => localYmd());
  const [search, setSearch] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const ar = language === 'ar';
  const locale = ar ? 'ar' : 'en';
  /** Punch for others: owner/HR/branch managers (not employee self-login). */
  const r = String(effectiveRole || user?.role || '');
  const canCheck =
    ['super_admin', 'shop_owner', 'hr_manager', 'branch_manager', 'multi_branch_manager'].includes(r) &&
    !['employee', 'hr_employee'].includes(r);

  const { from, to } = useMemo(() => monthRange(month), [month]);

  const load = () => {
    const q = `?from=${from}&to=${to}`;
    return apiRequest(`/hr/attendance${q}`)
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed, from, to]);

  useEffect(() => {
    if (!allowed || !canCheck) return;
    apiRequest('/hr/employees')
      .then((r) => {
        const list = Array.isArray(r) ? r : [];
        setEmployees(list.map((x: any) => ({ id: x.id, name: x.name, phone: x.phone ?? null })));
      })
      .catch(() => setEmployees([]));
  }, [allowed, canCheck]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const idStr = String(row.employee_id ?? '');
      const name = String(row.employee_name ?? '').toLowerCase();
      return name.includes(q) || idStr.includes(q);
    });
  }, [rows, search]);

  if (authLoading || !allowed) return null;

  const punch = async () => {
    if (!empId) return;
    setErr(null);
    try {
      await apiRequest('/hr/attendance/check', {
        method: 'POST',
        body: JSON.stringify({ employee_id: Number(empId), date: workDate }),
      });
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-x-auto print-area">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <HrPrintButton label={ar ? 'طباعة' : 'Print'} />
        </div>
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'الحضور والانصراف' : 'Attendance'}</h1>
        <p className="text-xs text-slate-500 mb-2 max-w-3xl">
          {ar
            ? 'عمود «أوفر» يجمع ساعات الأوفر المحسوبة من الدخول/الخروج مع «ساعات إضافية/يوم» من بطاقة الموظف (وليس سعر الساعة).'
            : '«OT» shows punch-based overtime plus per-day extra hours from the employee card (not the hourly rate).'}
        </p>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        <div className="flex flex-wrap gap-3 mb-4 items-center print-hide-col">
          <label className="text-sm text-slate-400">
            {ar ? 'الشهر' : 'Month'}
            <input
              type="month"
              className="ml-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-400">
            {ar ? 'بحث (اسم أو رقم الموظف)' : 'Search (name or employee ID)'}
            <input
              type="search"
              className="ml-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 min-w-[180px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? 'مثال: محمد أو 3' : 'e.g. Ali or 3'}
            />
          </label>
          {canCheck && (
            <>
              <label className="text-sm text-slate-400">
                {ar ? 'تاريخ الحضور' : 'Work date'}
                <input
                  type="date"
                  className="ml-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </label>
              <select
                className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 text-sm min-w-[200px]"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
              >
                <option value="">{ar ? 'موظف (رقم + اسم)' : 'Employee (ID + name)'}</option>
                {employees.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    #{e.id} — {e.name}
                    {e.phone ? ` (${e.phone})` : ''}
                  </option>
                ))}
              </select>
              <button type="button" onClick={punch} className="px-3 py-1 rounded bg-cyan-600 text-sm">
                {ar ? 'تسجيل دخول/خروج' : 'Check in / out'}
              </button>
            </>
          )}
        </div>
        <div className="rounded-xl border border-cyan-500/20 overflow-x-auto">
          <table className="data-table text-xs min-w-[1100px]">
            <thead>
              <tr>
                <th>{ar ? 'رقم الموظف' : 'Employee ID'}</th>
                <th>{ar ? 'الاسم' : 'Name'}</th>
                <th>{ar ? 'الهاتف' : 'Phone'}</th>
                <th>{ar ? 'الراتب' : 'Salary'}</th>
                <th>{ar ? 'س/يوم' : 'h/day'}</th>
                <th>{ar ? 'التاريخ' : 'Date'}</th>
                <th>{ar ? 'دخول' : 'Check-in'}</th>
                <th>{ar ? 'خروج' : 'Check-out'}</th>
                <th>{ar ? 'ساعات' : 'Hours'}</th>
                <th>{ar ? 'أوفر (إجمالي)' : 'OT (total)'}</th>
                <th>{ar ? 'مكافأة شهرية' : 'Monthly bonus'}</th>
                <th>{ar ? 'خصم شهري' : 'Monthly deduct.'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-cyan-200/90">{r.employee_id}</td>
                  <td>{r.employee_name}</td>
                  <td>{r.employee_phone ?? '—'}</td>
                  <td>
                    {r.employee_salary_type != null && r.employee_salary_amount != null
                      ? `${r.employee_salary_type} ${Number(r.employee_salary_amount).toFixed(2)}`
                      : '—'}
                  </td>
                  <td>{formatHrHours(r.employee_working_hours_per_day, 2)}</td>
                  <td className="whitespace-nowrap">{formatHrDateOnly(r.date_display ?? r.date)}</td>
                  <td className="font-mono whitespace-nowrap">{formatHrDateTime(r.check_in, locale)}</td>
                  <td className="font-mono whitespace-nowrap">{formatHrDateTime(r.check_out, locale)}</td>
                  <td>{r.total_hours != null ? Number(r.total_hours).toFixed(2) : '—'}</td>
                  <td className="text-amber-200/90">
                    {formatHrHours(r.overtime_hours_effective ?? r.overtime_hours, 2)}
                  </td>
                  <td>{r.employee_monthly_bonus != null ? Number(r.employee_monthly_bonus).toFixed(2) : '—'}</td>
                  <td>{r.employee_monthly_deduction != null ? Number(r.employee_monthly_deduction).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
