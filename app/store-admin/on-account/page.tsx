'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { Wallet, ChevronDown, ChevronUp, Check } from 'lucide-react';

type Debt = {
  id: number;
  customer_name: string;
  customer_phone: string | null;
  total_due: number;
  remaining?: number;
  status?: string;
  created_at: string;
  updated_at: string;
};

type DebtDetail = {
  debt: Debt;
  items: Array<{ quantity: number; unit_price: number; total: number; name_ar?: string; name_en?: string }>;
  totalPaid: number;
  remaining: number;
};

export default function OnAccountPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'on_account', effectiveRole, showDenied: true });
  const { symbol, currency } = useCurrency();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [debtDetail, setDebtDetail] = useState<DebtDetail | null>(null);
  const [payModal, setPayModal] = useState<{ debtId: number; remaining: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; title: string; detail?: string } | null>(null);

  const loadDebts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      p.set('status', statusFilter);
      const data = await apiRequest(`/customer-debts?${p.toString()}`);
      setDebts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.status === 404) {
        setDebts([]);
      } else {
        setError(err?.message || (language === 'ar' ? 'فشل تحميل الديون' : 'Failed to load'));
      }
    } finally {
      setLoading(false);
    }
  }, [language, search, statusFilter]);

  const loadDebtDetail = useCallback(async (id: number) => {
    try {
      const data = await apiRequest(`/customer-debts/${id}`);
      setDebtDetail(data as DebtDetail);
    } catch {
      setDebtDetail(null);
    }
  }, []);

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDebtDetail(null);
    } else {
      setExpandedId(id);
      loadDebtDetail(id);
    }
  };

  const handlePayClick = (debtId: number, remaining: number) => {
    setPayModal({ debtId, remaining });
    setPayAmount(String(remaining));
  };

  const handlePaySubmit = async () => {
    if (!payModal) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) {
      setFeedback({
        kind: 'error',
        title: language === 'ar' ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount',
      });
      return;
    }
    if (amt > payModal.remaining + 0.0001) {
      setFeedback({
        kind: 'error',
        title: language === 'ar' ? 'المبلغ أكبر من المستحق' : 'Amount exceeds balance due',
        detail: language === 'ar' ? `الحد الأقصى: ${formatCurrency(payModal.remaining, 'ar', currency, symbol)}` : `Max: ${formatCurrency(payModal.remaining, 'en', currency, symbol)}`,
      });
      return;
    }
    const debtIdForRefresh = payModal.debtId;
    try {
      setPaying(true);
      setFeedback(null);
      const result = await apiRequest(`/customer-debts/${debtIdForRefresh}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount: amt }),
      });
      setPayModal(null);
      setPayAmount('');
      const rem = result?.remainingAfter != null ? Number(result.remainingAfter) : null;
      const applied = result?.appliedAmount != null ? Number(result.appliedAmount) : amt;
      const capped = Boolean(result?.paymentCapped);

      if (result?.converted) {
        loadDebts();
        setExpandedId(null);
        setDebtDetail(null);
        setFeedback({
          kind: 'success',
          title: language === 'ar' ? 'تم السداد بنجاح' : 'Payment completed',
          detail: language === 'ar' ? 'تم إغلاق الحساب وتحويله إلى فاتورة.' : 'Account closed and converted to a sale invoice.',
        });
      } else {
        loadDebtDetail(debtIdForRefresh);
        loadDebts();
        const remLabel =
          rem != null && Number.isFinite(rem)
            ? formatCurrency(rem, language === 'ar' ? 'ar' : 'en', currency, symbol)
            : '—';
        const paidLabel = formatCurrency(applied, language === 'ar' ? 'ar' : 'en', currency, symbol);
        setFeedback({
          kind: 'success',
          title: language === 'ar' ? 'تم تسجيل السداد' : 'Payment recorded',
          detail:
            language === 'ar'
              ? `تم قبض ${paidLabel}. المتبقي على العميل: ${remLabel}.${capped ? ' (تم تعديل المبلغ ليطابق المستحق)' : ''}`
              : `Collected ${paidLabel}. Customer balance: ${remLabel}.${capped ? ' (Amount adjusted to match due balance.)' : ''}`,
        });
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error ||
        (language === 'ar' ? 'تعذر تنفيذ السداد' : 'Payment could not be processed');
      setFeedback({
        kind: 'error',
        title: language === 'ar' ? 'فشل السداد' : 'Payment failed',
        detail: typeof msg === 'string' ? msg : String(msg),
      });
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (!authLoading && allowed) loadDebts();
  }, [authLoading, allowed, loadDebts]);

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6 flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          {language === 'ar' ? 'دفع أجل' : 'On Account'}
        </h1>
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex gap-2">
            {(['all', 'unpaid', 'paid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === s
                    ? 'bg-cyan-600 text-white border border-cyan-500'
                    : 'border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                {s === 'all' ? (language === 'ar' ? 'الكل' : 'All') : s === 'unpaid' ? (language === 'ar' ? 'غير مدفوع' : 'Unpaid') : (language === 'ar' ? 'مدفوع' : 'Paid')}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
            className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-slate-100 w-full max-w-md"
          />
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="neon-card rounded-xl p-6">
            {debts.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                {statusFilter === 'unpaid'
                  ? (language === 'ar' ? 'لا توجد ديون مستحقة' : 'No outstanding debts')
                  : statusFilter === 'paid'
                    ? (language === 'ar' ? 'لا توجد مدفوعات' : 'No paid items')
                    : (language === 'ar' ? 'لا توجد سجلات' : 'No records')}
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2 md:mx-0">
                <table className="w-full text-sm min-w-[700px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <thead className="text-cyan-400 border-b border-cyan-500/20">
                    <tr>
                      <th className="py-2 text-left w-8"></th>
                      <th className="py-2 text-left whitespace-normal break-words leading-relaxed">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                      <th className="py-2 text-left tabular-nums whitespace-normal break-words leading-relaxed">{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                      <th className="py-2 text-left tabular-nums whitespace-normal leading-relaxed">{language === 'ar' ? 'المبلغ المستحق' : 'Amount Due'}</th>
                      <th className="py-2 text-left whitespace-normal leading-relaxed">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2 text-left whitespace-normal leading-relaxed">{language === 'ar' ? 'تفاصيل' : 'Details'}</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {debts.map((d) => (
                      <React.Fragment key={d.id}>
                        <tr className="border-b border-cyan-500/10">
                          <td className="py-2 w-8">
                            <button
                              onClick={() => handleExpand(d.id)}
                              className="text-cyan-400 hover:text-cyan-300 p-1"
                            >
                              {expandedId === d.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="py-2 whitespace-normal break-words leading-relaxed">{d.customer_name}</td>
                          <td className="py-2 tabular-nums whitespace-normal break-all leading-relaxed">{d.customer_phone || '-'}</td>
                          <td className="py-2 font-semibold text-amber-400 tabular-nums whitespace-normal leading-relaxed">
                            {formatCurrency(d.remaining ?? d.total_due, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                          </td>
                          <td className="py-2">
                            {(d.status === 'paid' || d.status === 'converted') ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40">
                                {language === 'ar' ? 'مدفوع / مكتمل' : 'Paid / Completed'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                {language === 'ar' ? 'غير مدفوع' : 'Unpaid'}
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => handleExpand(d.id)}
                              className="text-cyan-400 hover:underline text-xs"
                            >
                              {language === 'ar' ? 'عرض التفاصيل' : 'View details'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === d.id && debtDetail && (
                          <tr>
                            <td colSpan={6} className="py-4 bg-black/20">
                              <div className="space-y-4 pl-4">
                                <div className="border border-cyan-500/20 rounded-lg p-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-cyan-300">
                                      {language === 'ar' ? 'المبلغ الأصلي' : 'Original'}: {formatCurrency(debtDetail.debt.total_due, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                                    </span>
                                    <span className="text-green-400">
                                      {language === 'ar' ? 'المدفوع' : 'Paid'}: {formatCurrency(debtDetail.totalPaid, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                                    </span>
                                  </div>
                                  <ul className="text-sm text-slate-300 mb-3 space-y-1">
                                    {debtDetail.items?.map((it, i) => (
                                      <li key={i}>
                                        {it.quantity}× {language === 'ar' ? it.name_ar : it.name_en || it.name_ar} — {formatCurrency(it.total || it.quantity * it.unit_price, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-amber-400">
                                      {language === 'ar' ? 'المتبقي' : 'Remaining'}: {formatCurrency(debtDetail.remaining, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                                    </span>
                                    <button
                                      onClick={() => handlePayClick(d.id, debtDetail.remaining)}
                                      disabled={debtDetail.remaining <= 0}
                                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                                    >
                                      <Check className="w-4 h-4" />
                                      {language === 'ar' ? 'تم الدفع' : 'Pay Now'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !paying && setPayModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-[#0b1220] border border-cyan-500/30 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-cyan-200 mb-4">
              {language === 'ar' ? 'سداد' : 'Pay'}
            </h3>
            <p className="text-slate-400 text-sm mb-2">
              {language === 'ar' ? 'المبلغ المستحق (يمكنك سداداً جزئياً أو كاملاً)' : 'Amount due (partial or full payment)'}:{' '}
              {formatCurrency(payModal.remaining, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              max={payModal.remaining}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={language === 'ar' ? 'المبلغ' : 'Amount'}
              className="w-full px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-white mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handlePaySubmit}
                disabled={paying}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-medium disabled:opacity-50"
              >
                {paying ? (language === 'ar' ? 'جاري...' : 'Processing...') : (language === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
              <button
                onClick={() => !paying && setPayModal(null)}
                disabled={paying}
                className="px-4 py-2 border border-cyan-500/50 rounded-xl text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setFeedback(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              feedback.kind === 'success'
                ? 'bg-[#0a1f18] border-emerald-500/50'
                : 'bg-[#1a0f12] border-red-500/40'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`text-lg font-bold mb-2 ${feedback.kind === 'success' ? 'text-emerald-300' : 'text-red-300'}`}
            >
              {feedback.title}
            </h3>
            {feedback.detail ? <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{feedback.detail}</p> : null}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className={`mt-6 w-full py-2.5 rounded-xl font-medium ${
                feedback.kind === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-red-600/90 hover:bg-red-500 text-white'
              }`}
            >
              {language === 'ar' ? 'حسناً' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
