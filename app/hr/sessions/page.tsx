'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';

type Row = {
  id: number;
  employee_name: string;
  login_time: string;
  logout_time: string | null;
};

export default function HrSessionsPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_sessions', effectiveRole, showDenied: true });
  const [rows, setRows] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [empId, setEmpId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const ar = language === 'ar';
  const r = String(effectiveRole || user?.role || '');
  const isStaff =
    ['super_admin', 'shop_owner', 'hr_manager', 'branch_manager', 'multi_branch_manager'].includes(r) &&
    !['employee', 'hr_employee'].includes(r);

  const load = () =>
    apiRequest('/hr/employee-sessions')
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setErr(e.message));

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  useEffect(() => {
    if (!allowed || !isStaff) return;
    apiRequest('/hr/employees')
      .then((r) => {
        const list = Array.isArray(r) ? r : [];
        setEmployees(list.map((x: any) => ({ id: x.id, name: x.name })));
      })
      .catch(() => setEmployees([]));
  }, [allowed, isStaff]);

  if (authLoading || !allowed) return null;

  const start = async () => {
    setErr(null);
    if (isStaff && !empId) {
      setErr(ar ? 'اختر الموظف' : 'Select employee');
      return;
    }
    try {
      const body: Record<string, number> = {};
      if (isStaff && empId) body.employee_id = Number(empId);
      await apiRequest('/hr/employee-sessions/start', { method: 'POST', body: JSON.stringify(body) });
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  const end = async () => {
    setErr(null);
    try {
      const body: Record<string, number> = {};
      if (isStaff && empId) body.employee_id = Number(empId);
      await apiRequest('/hr/employee-sessions/end', { method: 'POST', body: JSON.stringify(body) });
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-x-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'تسجيل الدخول' : 'Login tracking'}</h1>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {isStaff && (
            <select
              className="bg-[#0f172a] border border-cyan-500/20 rounded px-2 py-1 text-sm"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
            >
              <option value="">{ar ? '(اختياري) موظف' : '(optional) Employee'}</option>
              {employees.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={start} className="px-3 py-1 rounded bg-cyan-600 text-sm">
            {ar ? 'بدء جلسة' : 'Start session'}
          </button>
          <button type="button" onClick={end} className="px-3 py-1 rounded border border-slate-500 text-sm">
            {ar ? 'إنهاء جلسة' : 'End session'}
          </button>
        </div>
        <table className="data-table text-sm min-w-[640px]">
          <thead>
            <tr>
              <th>{ar ? 'الموظف' : 'Employee'}</th>
              <th>{ar ? 'دخول' : 'Login'}</th>
              <th>{ar ? 'خروج' : 'Logout'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.employee_name}</td>
                <td className="font-mono text-xs">{new Date(r.login_time).toLocaleString()}</td>
                <td className="font-mono text-xs">{r.logout_time ? new Date(r.logout_time).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
