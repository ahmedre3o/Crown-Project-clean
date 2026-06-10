'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { HrPrintButton } from '@/components/HrPrintButton';

type Dev = { id: number; name: string; type: string; api_url: string | null; created_at: string };
type Emp = { id: number; name: string; biometric_punch_code?: string | null; phone?: string | null };

export default function HrDevicesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'hr_devices', effectiveRole, showDenied: true });
  const [rows, setRows] = useState<Dev[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [name, setName] = useState('Biometric 1');
  const [type, setType] = useState<'fingerprint' | 'face'>('fingerprint');
  const [apiUrl, setApiUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const ar = language === 'ar';

  const load = () =>
    apiRequest('/hr/devices')
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setErr(e.message));

  useEffect(() => {
    if (!allowed) return;
    load();
    apiRequest('/hr/employees')
      .then((r) => setEmployees(Array.isArray(r) ? r : []))
      .catch(() => setEmployees([]));
  }, [allowed]);

  if (authLoading || !allowed) return null;

  const add = async () => {
    setErr(null);
    try {
      const res = await apiRequest('/hr/devices', {
        method: 'POST',
        body: JSON.stringify({ name, type, api_url: apiUrl || null }),
      });
      const secret = String((res as any).api_secret || '');
      const sampleBody = {
        employee_id: ar ? 'رقم_الموظف_أو_كود_البصمة' : 'employee_id_or_punch_code',
        timestamp: new Date().toISOString(),
        device_id: (res as any).id,
        api_secret: secret,
        date: 'YYYY-MM-DD (optional; default: day in Africa/Cairo from timestamp)',
      };
      alert(
        (ar ? 'احفظ السر للجهاز:\n' : 'Save device secret:\n') +
          secret +
          '\n\nPOST /api/hr/device-log\n' +
          JSON.stringify(sampleBody, null, 2)
      );
      await load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  };

  const del = async (id: number) => {
    if (!confirm(ar ? 'حذف الجهاز؟' : 'Delete device?')) return;
    try {
      await apiRequest(`/hr/devices/${id}`, { method: 'DELETE' });
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
        <h1 className="text-2xl font-bold text-cyan-200 mb-4">{ar ? 'أجهزة البصمة' : 'Biometric devices'}</h1>
        <div className="text-xs text-slate-500 mb-4 space-y-2 max-w-4xl">
          <p>
            {ar
              ? 'يستقبل الخادم: employee_id (رقم الموظف في النظام) أو نفس القيمة المخزنة في «كود البصمة» لبطاقة الموظف + timestamp + api_secret (أو ترويسة X-HR-Device-Key). أول بصمة في اليوم = دخول، ثاني بصمة = خروج ويُحسب الساعات. يمكن إرسال date اختياري بصيغة YYYY-MM-DD.'
              : 'Server accepts employee_id (HR id) or the same value as employee «Punch code» + timestamp + api_secret (or X-HR-Device-Key). First punch = check-in, second = check-out. Optional date YYYY-MM-DD.'}
          </p>
          <p className="text-cyan-200/80">
            {ar
              ? 'ثبّت على الجهاز نفس الرقم: إما id الموظف أو كود البصمة من الجدول أدناه حتى يُعرَف الاسم تلقائياً ويُسجَّل في الحضور.'
              : 'Configure the device to send the HR employee id or the punch code below so attendance auto-fills.'}
          </p>
        </div>
        {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
        <div className="flex flex-wrap gap-2 mb-6 items-end border border-cyan-500/20 rounded-xl p-4 bg-[#0f172a] print-hide-col">
          <input
            className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={ar ? 'اسم الجهاز' : 'Device name'}
          />
          <select
            className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as 'fingerprint' | 'face')}
          >
            <option value="fingerprint">{ar ? 'بصمة' : 'Fingerprint'}</option>
            <option value="face">{ar ? 'وجه' : 'Face'}</option>
          </select>
          <input
            className="bg-black/40 border border-cyan-500/20 rounded px-2 py-1 text-sm flex-1 min-w-[200px]"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="api_url (optional)"
          />
          <button type="button" onClick={add} className="px-3 py-1 rounded bg-cyan-600 text-sm">
            {ar ? 'إضافة جهاز' : 'Add device'}
          </button>
        </div>
        <h2 className="text-sm font-semibold text-cyan-300 mb-2">{ar ? 'الأجهزة' : 'Devices'}</h2>
        <table className="data-table text-sm mb-8">
          <thead>
            <tr>
              <th>ID</th>
              <th>{ar ? 'الاسم' : 'Name'}</th>
              <th>{ar ? 'النوع' : 'Type'}</th>
              <th>api_url</th>
              <th className="print-hide-col" />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.name}</td>
                <td>{d.type}</td>
                <td className="max-w-xs truncate">{d.api_url ?? '—'}</td>
                <td className="print-hide-col">
                  <button type="button" className="text-red-400 text-xs" onClick={() => del(d.id)}>
                    {ar ? 'حذف' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-sm font-semibold text-cyan-300 mb-2">
          {ar ? 'ربط الموظفين بالبصمة (أرسل للجهاز id أو كود البصمة)' : 'Employees — device sends id or punch code'}
        </h2>
        <div className="rounded-xl border border-cyan-500/20 overflow-x-auto">
          <table className="data-table text-sm min-w-[480px]">
            <thead>
              <tr>
                <th>{ar ? 'المعرف' : 'ID'}</th>
                <th>{ar ? 'الاسم' : 'Name'}</th>
                <th>{ar ? 'الهاتف' : 'Phone'}</th>
                <th>{ar ? 'كود البصمة' : 'Punch code'}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-cyan-200/90">{e.id}</td>
                  <td>{e.name}</td>
                  <td>{e.phone ?? '—'}</td>
                  <td className="font-mono">{e.biometric_punch_code ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
