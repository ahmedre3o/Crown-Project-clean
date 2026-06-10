'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { apiRequest } from '@/contexts/AuthContext';
import { Plus, Printer, Pencil } from 'lucide-react';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';

interface JournalEntry {
  id: number;
  shop_id: number;
  date: string;
  reference?: string | null;
  description?: string | null;
  source_type?: string | null;
  source_id?: number | null;
  created_at?: string;
  total_debit?: number | string | null;
  total_credit?: number | string | null;
}

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
}

/** Debit/credit use null = empty field (so 0 displays as 0, not as —) */
interface JournalLineForm {
  account_id: number;
  debit: number | null;
  credit: number | null;
}

function emptyLine(): JournalLineForm {
  return { account_id: 0, debit: null, credit: null };
}

function isManualJournalEntry(e: JournalEntry): boolean {
  const t = (e.source_type && String(e.source_type).trim()) || '';
  return !t || t === 'manual';
}

export default function JournalEntriesPage() {
  const { language, direction } = useLanguage();
  const branchCtx = useBranch();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'journal_entries', effectiveRole, showDenied: true });
  const canCreateOrEditJournal =
    effectiveRole === 'super_admin' || effectiveRole === 'shop_owner';

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    lines: [emptyLine()] as JournalLineForm[],
  });

  const resetForm = useCallback(() => {
    setEditingEntryId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      description: '',
      lines: [emptyLine()],
    });
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      const url = q.toString() ? `/admin/journal?${q.toString()}` : '/admin/journal';
      const data = await apiRequest(url);
      const raw = Array.isArray(data) ? data : [];
      setEntries(
        raw.map((r: any) => {
          const debit = r.total_debit ?? r.totalDebit;
          const credit = r.total_credit ?? r.totalCredit;
          const dNum = debit !== null && debit !== undefined && debit !== '' ? Number(debit) : null;
          const cNum = credit !== null && credit !== undefined && credit !== '' ? Number(credit) : null;
          return {
            ...r,
            total_debit: dNum !== null && !Number.isNaN(dNum) ? dNum : null,
            total_credit: cNum !== null && !Number.isNaN(cNum) ? cNum : null,
          };
        })
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (language === 'ar' ? 'فشل تحميل القيود' : 'Failed to load journal');
      setError(msg);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [language, from, to]);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiRequest('/admin/accounts');
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      loadEntries();
      loadAccounts();
    }
  }, [allowed, loadEntries, loadAccounts]);

  const lineToPayload = (l: JournalLineForm) => ({
    account_id: Number(l.account_id),
    debit: l.debit != null && !Number.isNaN(l.debit) ? l.debit : 0,
    credit: l.credit != null && !Number.isNaN(l.credit) ? l.credit : 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = form.lines
      .map(lineToPayload)
      .filter((l) => l.account_id > 0 && (l.debit > 0 || l.credit > 0));
    if (validLines.length === 0) {
      setError(language === 'ar' ? 'أضف سطراً واحداً على الأقل (حساب ومدين أو دائن)' : 'Add at least one line with account and debit or credit');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingEntryId != null) {
        await apiRequest(`/admin/journal/${editingEntryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: form.date,
            description: form.description.trim() || null,
            lines: validLines,
          }),
        });
      } else {
        await apiRequest('/admin/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: form.date,
            description: form.description.trim() || null,
            lines: validLines,
          }),
        });
      }
      resetForm();
      setShowForm(false);
      await loadEntries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (language === 'ar' ? 'فشل حفظ القيد' : 'Failed to save entry');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));

  const updateLineAccount = (i: number, account_id: number) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, idx) => (idx === i ? { ...l, account_id } : l)),
    }));
  };

  const updateLineDebit = (i: number, raw: string) => {
    const val = raw === '' ? null : parseFloat(raw);
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, idx) =>
        idx === i ? { ...l, debit: raw === '' || Number.isNaN(val as number) ? null : (val as number) } : l
      ),
    }));
  };

  const updateLineCredit = (i: number, raw: string) => {
    const val = raw === '' ? null : parseFloat(raw);
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, idx) =>
        idx === i ? { ...l, credit: raw === '' || Number.isNaN(val as number) ? null : (val as number) } : l
      ),
    }));
  };

  const removeLine = (i: number) => setForm((f) => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const openEdit = async (id: number) => {
    setLoadingEdit(true);
    setError(null);
    try {
      const shopId = user?.shop_id ?? (user as any)?.shopId ?? null;
      const q = Number.isFinite(shopId) && shopId > 0 ? `?shopId=${shopId}` : '';
      const data = await apiRequest(`/admin/journal/${id}${q}`);
      const entry = data?.entry;
      const lines = Array.isArray(data?.lines) ? data.lines : [];
      if (!entry) throw new Error('Invalid response');
      const dateRaw = entry.date != null ? String(entry.date) : '';
      const dateStr = dateRaw.includes('T') ? dateRaw.slice(0, 10) : dateRaw.slice(0, 10);
      setForm({
        date: dateStr || new Date().toISOString().slice(0, 10),
        description: entry.description != null ? String(entry.description) : '',
        lines:
          lines.length > 0
            ? lines.map((l: { account_id: number; debit: unknown; credit: unknown }) => ({
                account_id: Number(l.account_id) || 0,
                debit: l.debit != null && l.debit !== '' ? Number(l.debit) : null,
                credit: l.credit != null && l.credit !== '' ? Number(l.credit) : null,
              }))
            : [emptyLine()],
      });
      setEditingEntryId(id);
      setShowForm(true);
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : (language === 'ar' ? 'فشل تحميل القيد' : 'Failed to load entry');
      if (typeof (e as any)?.status === 'number' && (e as any).status === 404) {
        msg = language === 'ar' ? 'القيد غير موجود أو الخادم يحتاج تحديثاً' : 'Entry not found or server may need an update';
      }
      setError(msg);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handlePrint = async () => {
    await logPrintAudit('daily_journal', 0, branchCtx.activeBranchId ?? undefined);
    window.print();
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'القيد اليومي' : 'Journal Entries';
  const fmtDate = (d: string | undefined) => {
    if (!d) return '—';
    const s = String(d);
    return s.includes('T') ? s.slice(0, 10) : s.slice(0, 10);
  };

  /** "—" only when null/undefined/empty string; 0 and 0.01 always show as numbers. */
  const fmtAmt = (v: unknown) => {
    if (v === null || v === undefined) return '—';
    if (v === '') return '—';
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const displayDebitCredit = (v: unknown) =>
    v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? fmtAmt(v) : '—';

  /** Read amount from entry (API may send total_debit or totalDebit). */
  const getTotalDebit = (e: JournalEntry) => e.total_debit ?? (e as any).totalDebit;
  const getTotalCredit = (e: JournalEntry) => e.total_credit ?? (e as any).totalCredit;

  const descCell = (e: JournalEntry) => {
    if (e.description !== null && e.description !== undefined && String(e.description).trim() !== '') {
      return String(e.description);
    }
    if (e.reference !== null && e.reference !== undefined && String(e.reference).trim() !== '') {
      return String(e.reference);
    }
    return '—';
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-cyan-200">{title}</h1>
          <div className="flex items-center gap-2 print:hidden">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-sm"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-sm"
            />
            <button type="button" onClick={loadEntries} className="px-3 py-1 rounded border border-cyan-500/50 text-cyan-300 text-sm">
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
            {canCreateOrEditJournal && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'قيد جديد' : 'New entry'}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
            >
              <Printer className="h-4 w-4" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 text-sm print:hidden">{error}</div>
        )}

        {showForm && canCreateOrEditJournal && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl border border-cyan-500/30 bg-slate-900/50 print:hidden">
            <h2 className="text-lg font-semibold text-cyan-200 mb-3">
              {editingEntryId != null
                ? language === 'ar'
                  ? `تعديل القيد #${editingEntryId}`
                  : `Edit journal entry #${editingEntryId}`
                : language === 'ar'
                  ? 'قيد جديد'
                  : 'New journal entry'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
                required
              />
              <input
                type="text"
                placeholder={language === 'ar' ? 'الوصف' : 'Description'}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
              />
            </div>
            <div className="space-y-2">
              {form.lines.map((line, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    value={line.account_id || ''}
                    onChange={(e) => updateLineAccount(i, Number(e.target.value))}
                    className="px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-white min-w-[180px]"
                  >
                    <option value="">{language === 'ar' ? 'اختر الحساب' : 'Select account'}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} – {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={language === 'ar' ? 'مدين' : 'Debit'}
                    value={line.debit !== null && line.debit !== undefined ? line.debit : ''}
                    onChange={(e) => updateLineDebit(i, e.target.value)}
                    className="w-28 px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={language === 'ar' ? 'دائن' : 'Credit'}
                    value={line.credit !== null && line.credit !== undefined ? line.credit : ''}
                    onChange={(e) => updateLineCredit(i, e.target.value)}
                    className="w-28 px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-white"
                  />
                  {form.lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:underline text-sm">
                      {language === 'ar' ? 'حذف' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <button type="button" onClick={addLine} className="px-3 py-1 rounded border border-cyan-500/50 text-cyan-300 text-sm">
                + {language === 'ar' ? 'سطر' : 'Line'}
              </button>
              <button type="submit" disabled={saving || loadingEdit} className="px-4 py-2 rounded-lg bg-cyan-600 text-white disabled:opacity-50">
                {saving
                  ? language === 'ar'
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : editingEntryId != null
                    ? language === 'ar'
                      ? 'تحديث'
                      : 'Update'
                    : language === 'ar'
                      ? 'حفظ'
                      : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-cyan-500/30 overflow-hidden accounting-print">
          <div className="hidden print:block print-branch text-black border-b border-gray-300 p-4">
            <div className="font-bold">Crown ERP</div>
            <div>{title}</div>
            <div>
              {language === 'ar' ? 'الفرع: ' : 'Branch: '}
              {getBranchDisplayName(branchCtx.activeBranch, language)}
            </div>
          </div>
          {loading ? (
            <p className="p-8 text-center text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : entries.length === 0 ? (
            <p className="p-8 text-center text-gray-400">{language === 'ar' ? 'لا توجد قيود بعد' : 'No journal entries yet'}</p>
          ) : (
            <div className={`table-scroll table-rtl-wrap ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
              <table className="data-table text-sm text-slate-200 min-w-[1100px]">
                <thead>
                  <tr>
                    <th className="table-col-compact">ID</th>
                    <th className="table-col-date">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="table-col-long">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                    <th className="table-col-currency">{language === 'ar' ? 'مدين' : 'Debit'}</th>
                    <th className="table-col-currency">{language === 'ar' ? 'دائن' : 'Credit'}</th>
                    {canCreateOrEditJournal && (
                      <th className="table-col-compact print:hidden">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="data-table-num table-col-compact">{e.id}</td>
                      <td className="data-table-num table-col-date">
                        <span dir="ltr" className="tabular-nums">
                          {fmtDate(e.date)}
                        </span>
                      </td>
                      <td className="table-col-long">{descCell(e)}</td>
                      <td className="data-table-num table-col-currency">
                        <span dir="ltr" className="tabular-nums">
                          {displayDebitCredit(getTotalDebit(e))}
                        </span>
                      </td>
                      <td className="data-table-num table-col-currency">
                        <span dir="ltr" className="tabular-nums">
                          {displayDebitCredit(getTotalCredit(e))}
                        </span>
                      </td>
                      {canCreateOrEditJournal && (
                        <td className="print:hidden">
                          {isManualJournalEntry(e) ? (
                            <button
                              type="button"
                              disabled={loadingEdit}
                              onClick={() => openEdit(e.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/40 text-cyan-300 text-xs hover:bg-cyan-500/10 disabled:opacity-50"
                            >
                              <Pencil className="h-3 w-3" />
                              {language === 'ar' ? 'تعديل' : 'Edit'}
                            </button>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
