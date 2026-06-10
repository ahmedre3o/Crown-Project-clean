'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { formatHrDateOnly, formatHrDateTime } from '@/lib/hrDisplay';
import { HrPrintButton } from '@/components/HrPrintButton';

type Emp = {
  id: number;
  name: string;
  phone: string | null;
  role: string | null;
  salary_type: string;
  salary_amount: number;
  working_hours_per_day: number;
  overtime_rate_per_hour: number;
  annual_leave_limit?: number;
  monthly_bonus?: number;
  monthly_deduction?: number;
  extra_overtime_hours_per_day?: number;
  monthly_tax?: number;
  monthly_insurance?: number;
  annual_raise_percent?: number;
  annual_raise_amount?: number;
  biometric_punch_code?: string | null;
  hire_date: string | null;
  status: string;
  created_at?: string | null;
  leave_balance_available?: number;
  leave_balance_used?: number;
};

const emptyForm = {
  name: '',
  phone: '',
  role: '',
  salary_type: 'monthly',
  salary_amount: '',
  working_hours_per_day: '8',
  overtime_rate_per_hour: '0',
  annual_leave_limit: '21',
  monthly_bonus: '0',
  monthly_deduction: '0',
  extra_overtime_hours_per_day: '0',
  monthly_tax: '0',
  monthly_insurance: '0',
  annual_raise_percent: '0',
  annual_raise_amount: '0',
  biometric_punch_code: '',
  hire_date: '',
  status: 'active',
};

export default function HrEmployeesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_employees', effectiveRole, showDenied: true });
  const [rows, setRows] = useState<Emp[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [leaveYear, setLeaveYear] = useState(() => new Date().getFullYear());

  const ar = language === 'ar';
  const locale = ar ? 'ar' : 'en';

  const load = () =>
    apiRequest(`/hr/employees?year=${leaveYear}`)
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setErr(e.message));

  useEffect(() => {
    if (allowed) load();
  }, [allowed, leaveYear]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((e) => {
      const idStr = String(e.id);
      const name = e.name.toLowerCase();
      const phone = (e.phone || '').toLowerCase();
      const bio = String(e.biometric_punch_code || '').toLowerCase();
      return name.includes(q) || idStr.includes(q) || phone.includes(q) || bio.includes(q);
    });
  }, [rows, search]);

  if (authLoading || !allowed) return null;

  const save = async () => {
    setErr(null);
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        salary_type: form.salary_type === 'daily' ? 'daily' : 'monthly',
        salary_amount: Number(form.salary_amount) || 0,
        working_hours_per_day: Number(form.working_hours_per_day) || 8,
        overtime_rate_per_hour: Number(form.overtime_rate_per_hour) || 0,
        annual_leave_limit: Number(form.annual_leave_limit) || 21,
        monthly_bonus: Number(form.monthly_bonus) || 0,
        monthly_deduction: Number(form.monthly_deduction) || 0,
        extra_overtime_hours_per_day: Number(form.extra_overtime_hours_per_day) || 0,
        monthly_tax: Number(form.monthly_tax) || 0,
        monthly_insurance: Number(form.monthly_insurance) || 0,
        annual_raise_percent: Number(form.annual_raise_percent) || 0,
        annual_raise_amount: Number(form.annual_raise_amount) || 0,
        biometric_punch_code: form.biometric_punch_code.trim() || null,
        hire_date: form.hire_date || null,
        status: form.status === 'inactive' ? 'inactive' : 'active',
      };
      if (editingId) {
        await apiRequest(`/hr/employees/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiRequest('/hr/employees', { method: 'POST', body: JSON.stringify(body) });
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  const startEdit = (e: Emp) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      phone: e.phone || '',
      role: e.role || '',
      salary_type: e.salary_type,
      salary_amount: String(e.salary_amount),
      working_hours_per_day: String(e.working_hours_per_day),
      overtime_rate_per_hour: String(e.overtime_rate_per_hour ?? 0),
      annual_leave_limit: String(e.annual_leave_limit ?? 21),
      monthly_bonus: String(e.monthly_bonus ?? 0),
      monthly_deduction: String(e.monthly_deduction ?? 0),
      extra_overtime_hours_per_day: String(e.extra_overtime_hours_per_day ?? 0),
      monthly_tax: String(e.monthly_tax ?? 0),
      monthly_insurance: String(e.monthly_insurance ?? 0),
      annual_raise_percent: String(e.annual_raise_percent ?? 0),
      annual_raise_amount: String(e.annual_raise_amount ?? 0),
      biometric_punch_code: e.biometric_punch_code || '',
      hire_date: e.hire_date ? e.hire_date.slice(0, 10) : '',
      status: e.status,
    });
  };

  const del = async (id: number) => {
    if (!confirm(ar ? 'حذف الموظف؟' : 'Delete employee?')) return;
    setErr(null);
    try {
      await apiRequest(`/hr/employees/${id}`, { method: 'DELETE' });
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
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'الموظفون' : 'Employees'}</h1>
        <p className="text-xs text-slate-500 mb-2 max-w-3xl">
          {ar
            ? '«كود البصمة» يرسله الجهاز بدل رقم الموظف إن لزم. الضرائب والتأمينات شهرية تُخصم عند احتساب الراتب. الزيادة السنوية: نسبة + مبلغ على الأساس قبل احتساب اليومية.'
            : '«Biometric code» is sent by the device if it is not the HR employee id. Tax/insurance are monthly payroll deductions. Annual raise: % + fixed amount on base before daily calc.'}
        </p>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        <div className="mb-6 flex flex-wrap gap-3 items-end border border-cyan-500/20 rounded-xl p-4 bg-[#0f172a]">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'الاسم' : 'Name'}</label>
            <input
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'الهاتف' : 'Phone'}</label>
            <input
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'الوظيفة' : 'Job role'}</label>
            <input
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'نوع الراتب' : 'Salary type'}</label>
            <select
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.salary_type}
              onChange={(e) => setForm((f) => ({ ...f, salary_type: e.target.value }))}
            >
              <option value="monthly">{ar ? 'شهري' : 'Monthly'}</option>
              <option value="daily">{ar ? 'يومي' : 'Daily'}</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'الراتب' : 'Salary'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.salary_amount}
              onChange={(e) => setForm((f) => ({ ...f, salary_amount: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'ساعات العمل/يوم' : 'Hours/day'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-20"
              value={form.working_hours_per_day}
              onChange={(e) => setForm((f) => ({ ...f, working_hours_per_day: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'سعر الساعة الإضافية' : 'OT rate/hr'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-28"
              value={form.overtime_rate_per_hour}
              onChange={(e) => setForm((f) => ({ ...f, overtime_rate_per_hour: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'أوفرتايم/يوم' : 'OT hours/day'}</label>
            <input
              type="number"
              step="0.25"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-28"
              value={form.extra_overtime_hours_per_day}
              onChange={(e) => setForm((f) => ({ ...f, extra_overtime_hours_per_day: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'مكافأة شهرية' : 'Monthly bonus'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.monthly_bonus}
              onChange={(e) => setForm((f) => ({ ...f, monthly_bonus: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'خصم شهري' : 'Monthly deduction'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.monthly_deduction}
              onChange={(e) => setForm((f) => ({ ...f, monthly_deduction: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'ضريبة شهرية' : 'Monthly tax'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.monthly_tax}
              onChange={(e) => setForm((f) => ({ ...f, monthly_tax: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'تأمينات شهرية' : 'Monthly insurance'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.monthly_insurance}
              onChange={(e) => setForm((f) => ({ ...f, monthly_insurance: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'زيادة سنوية %' : 'Annual raise %'}</label>
            <input
              type="number"
              step="0.01"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.annual_raise_percent}
              onChange={(e) => setForm((f) => ({ ...f, annual_raise_percent: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'زيادة سنوية (مبلغ)' : 'Annual raise (amt)'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-24"
              value={form.annual_raise_amount}
              onChange={(e) => setForm((f) => ({ ...f, annual_raise_amount: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'حد الإجازة السنوية' : 'Annual leave limit'}</label>
            <input
              type="number"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-20"
              value={form.annual_leave_limit}
              onChange={(e) => setForm((f) => ({ ...f, annual_leave_limit: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'كود البصمة' : 'Punch code'}</label>
            <input
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-28"
              value={form.biometric_punch_code}
              onChange={(e) => setForm((f) => ({ ...f, biometric_punch_code: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'تاريخ التعيين' : 'Hire date'}</label>
            <input
              type="date"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.hire_date}
              onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'حالة' : 'Status'}</label>
            <select
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">{ar ? 'نشط' : 'Active'}</option>
              <option value="inactive">{ar ? 'غير نشط' : 'Inactive'}</option>
            </select>
          </div>
          <button type="button" onClick={save} className="px-3 py-1 rounded bg-cyan-600 text-sm font-semibold">
            {editingId ? (ar ? 'تحديث' : 'Update') : ar ? 'إضافة' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="px-3 py-1 rounded border border-slate-500 text-sm"
            >
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
          )}
        </div>
        <div className="mb-3 flex flex-wrap gap-3 items-center">
          <label className="text-sm text-slate-400">
            {ar ? 'سنة رصيد الإجازات' : 'Leave balance year'}
            <select
              className="ml-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={leaveYear}
              onChange={(e) => setLeaveYear(Number(e.target.value))}
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() + 1]
                .sort((a, b) => b - a)
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            {ar ? 'بحث (رقم، اسم، هاتف)' : 'Search (ID, name, phone)'}
            <input
              type="search"
              className="mr-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 min-w-[200px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="rounded-xl border border-cyan-500/20 overflow-x-auto">
          <table className="data-table text-xs min-w-[1600px]">
            <thead>
              <tr>
                <th>{ar ? 'المعرف' : 'ID'}</th>
                <th>{ar ? 'الاسم' : 'Name'}</th>
                <th>{ar ? 'الهاتف' : 'Phone'}</th>
                <th>{ar ? 'كود بصمة' : 'Punch'}</th>
                <th>{ar ? 'حد إجازة' : 'Leave limit'}</th>
                <th>{ar ? 'رصيد إجازات (متاح/مستخدم)' : 'Leave balance (avail/used)'}</th>
                <th>{ar ? 'الراتب' : 'Salary'}</th>
                <th>{ar ? 'س/يوم' : 'h/day'}</th>
                <th>{ar ? 'سعر أوفر/س' : 'OT /h'}</th>
                <th>{ar ? 'أوفر/يوم' : 'OT h/day'}</th>
                <th>{ar ? 'مكافأة' : 'Bonus'}</th>
                <th>{ar ? 'خصم' : 'Deduct.'}</th>
                <th>{ar ? 'ضريبة' : 'Tax'}</th>
                <th>{ar ? 'تأمين' : 'Insur.'}</th>
                <th>{ar ? 'زيادة %' : 'Raise %'}</th>
                <th>{ar ? 'زيادة +' : 'Raise +'}</th>
                <th>{ar ? 'حالة' : 'Status'}</th>
                <th>{ar ? 'تعيين' : 'Hire'}</th>
                <th>{ar ? 'أُنشئ' : 'Created'}</th>
                <th className="print-hide-col" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-cyan-200/90">{e.id}</td>
                  <td>{e.name}</td>
                  <td>{e.phone ?? '—'}</td>
                  <td className="font-mono">{e.biometric_punch_code ?? '—'}</td>
                  <td>{e.annual_leave_limit ?? 21}</td>
                  <td className="text-cyan-200/90">
                    {e.leave_balance_available ?? '—'} {ar ? 'متاح' : 'avail'} / {e.leave_balance_used ?? '—'} {ar ? 'مستخدم' : 'used'}
                    {(e.leave_balance_used ?? 0) > (e.annual_leave_limit ?? 21) && (
                      <span className="text-red-400 text-[10px]"> {ar ? '(تجاوز)' : '(exceeded)'}</span>
                    )}
                  </td>
                  <td>
                    {e.salary_type} {Number(e.salary_amount).toFixed(2)}
                  </td>
                  <td>{Number(e.working_hours_per_day).toFixed(2)}</td>
                  <td>{Number(e.overtime_rate_per_hour ?? 0).toFixed(2)}</td>
                  <td>{Number(e.extra_overtime_hours_per_day ?? 0).toFixed(2)}</td>
                  <td>{Number(e.monthly_bonus ?? 0).toFixed(2)}</td>
                  <td>{Number(e.monthly_deduction ?? 0).toFixed(2)}</td>
                  <td>{Number(e.monthly_tax ?? 0).toFixed(2)}</td>
                  <td>{Number(e.monthly_insurance ?? 0).toFixed(2)}</td>
                  <td>{Number(e.annual_raise_percent ?? 0).toFixed(2)}</td>
                  <td>{Number(e.annual_raise_amount ?? 0).toFixed(2)}</td>
                  <td>{e.status}</td>
                  <td>{e.hire_date ? formatHrDateOnly(e.hire_date) : '—'}</td>
                  <td className="whitespace-nowrap">{e.created_at ? formatHrDateTime(e.created_at, locale) : '—'}</td>
                  <td className="flex gap-2 print-hide-col">
                    <button type="button" className="text-cyan-400 text-xs" onClick={() => startEdit(e)}>
                      {ar ? 'تعديل' : 'Edit'}
                    </button>
                    <button type="button" className="text-red-400 text-xs" onClick={() => del(e.id)}>
                      {ar ? 'حذف' : 'Del'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
