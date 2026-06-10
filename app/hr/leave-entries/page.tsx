'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { formatHrDateOnly } from '@/lib/hrDisplay';
import { HrPrintButton } from '@/components/HrPrintButton';

const LEAVE_TYPES = [
  { value: 'annual', ar: 'اجازه سنوية', en: 'Annual' },
  { value: 'sick', ar: 'مرضى', en: 'Sick' },
  { value: 'emergency', ar: 'اجازه عرضه', en: 'Emergency' },
  { value: 'maternity', ar: 'اجازه وضع', en: 'Maternity' },
] as const;

type Entry = {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  leave_year: number;
  notes: string | null;
  created_at?: string;
};

type Emp = { id: number; name: string };

export default function HrLeaveEntriesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_leave_entries', effectiveRole, showDenied: true });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [employeeId, setEmployeeId] = useState('');
  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    days: '',
    notes: '',
  });
  const [err, setErr] = useState<string | null>(null);

  const ar = language === 'ar';

  const loadEntries = () => {
    const params = new URLSearchParams({ year: String(year) });
    if (employeeId) params.set('employee_id', employeeId);
    return apiRequest(`/hr/leave-entries?${params}`)
      .then((r) => setEntries(Array.isArray(r) ? r : []))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    if (!allowed) return;
    loadEntries();
  }, [allowed, year, employeeId]);

  useEffect(() => {
    if (!allowed) return;
    apiRequest('/hr/employees')
      .then((r) => setEmployees(Array.isArray(r) ? r.map((x: any) => ({ id: x.id, name: x.name })) : []))
      .catch(() => setEmployees([]));
  }, [allowed]);

  if (authLoading || !allowed) return null;

  const submit = async () => {
    const eid = Number(form.employee_id);
    if (!eid) {
      setErr(ar ? 'اختر الموظف' : 'Select employee');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setErr(ar ? 'أدخل تاريخ البداية والنهاية' : 'Enter start and end date');
      return;
    }
    setErr(null);
    try {
      await apiRequest('/hr/leave-entries', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: eid,
          leave_type: form.leave_type,
          start_date: form.start_date,
          end_date: form.end_date,
          days: form.days ? Number(form.days) : undefined,
          notes: form.notes.trim() || null,
        }),
      });
      setForm({ employee_id: form.employee_id, leave_type: 'annual', start_date: '', end_date: '', days: '', notes: '' });
      await loadEntries();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  const leaveLabel = (t: string) => LEAVE_TYPES.find((x) => x.value === t)?.[ar ? 'ar' : 'en'] || t;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-x-auto print-area">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <HrPrintButton label={ar ? 'طباعة' : 'Print'} />
          <Link href="/hr/attendance" className="text-cyan-400 text-sm hover:underline">
            {ar ? '← الحضور' : '← Attendance'}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'رصيد الإجازات - سجل الإجازات' : 'Leave balance - Leave entries'}</h1>
        <p className="text-xs text-slate-500 mb-4 max-w-3xl">
          {ar
            ? 'سجل إجازات الموظفين: اجازه سنوية، مرضى، اجازه عرضه، اجازه وضع. يُحدّث الحضور تلقائياً ليوم إجازة.'
            : 'Leave entries: annual, sick, emergency, maternity. Attendance is updated automatically for leave days.'}
        </p>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}

        <div className="mb-6 flex flex-wrap gap-3 items-end border border-cyan-500/20 rounded-xl p-4 bg-[#0f172a] print-hide-col">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'الموظف' : 'Employee'}</label>
            <select
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm min-w-[180px]"
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
            >
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  #{e.id} {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'نوع الإجازة' : 'Leave type'}</label>
            <select
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.leave_type}
              onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
            >
              {LEAVE_TYPES.map((x) => (
                <option key={x.value} value={x.value}>
                  {ar ? x.ar : x.en}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'من تاريخ' : 'From'}</label>
            <input
              type="date"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'إلى تاريخ' : 'To'}</label>
            <input
              type="date"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'أيام (اختياري)' : 'Days (optional)'}</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm w-20"
              value={form.days}
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400">{ar ? 'ملاحظات' : 'Notes'}</label>
            <input
              className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm min-w-[120px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button type="button" onClick={submit} className="px-3 py-1 rounded bg-cyan-600 text-sm font-semibold">
            {ar ? 'إضافة إجازة' : 'Add leave'}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-3 items-center">
          <label className="text-sm text-slate-400">
            {ar ? 'السنة' : 'Year'}
            <select
              className="ml-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year, year - 1, year + 1].sort((a, b) => b - a).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            {ar ? 'موظف' : 'Employee'}
            <select
              className="ml-2 bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 text-sm min-w-[160px]"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">{ar ? 'الكل' : 'All'}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  #{e.id} {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-cyan-500/20 overflow-x-auto">
          <table className="data-table text-xs min-w-[800px]">
            <thead>
              <tr>
                <th>{ar ? 'المعرف' : 'ID'}</th>
                <th>{ar ? 'الموظف' : 'Employee'}</th>
                <th>{ar ? 'نوع الإجازة' : 'Type'}</th>
                <th>{ar ? 'من' : 'From'}</th>
                <th>{ar ? 'إلى' : 'To'}</th>
                <th>{ar ? 'أيام' : 'Days'}</th>
                <th>{ar ? 'سنة' : 'Year'}</th>
                <th>{ar ? 'ملاحظات' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-cyan-200/90">{e.id}</td>
                  <td>#{e.employee_id} {e.employee_name}</td>
                  <td>{leaveLabel(e.leave_type)}</td>
                  <td>{formatHrDateOnly(e.start_date)}</td>
                  <td>{formatHrDateOnly(e.end_date)}</td>
                  <td>{Number(e.days).toFixed(1)}</td>
                  <td>{e.leave_year}</td>
                  <td className="max-w-[120px] truncate">{e.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
