'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { ShopSwitcher, getActiveShopId } from '@/components/ShopSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { getPlanFeatures, canAccess } from '@/permissions';
import { useRouteGuard } from '@/guards/useRouteGuard';

type CrmCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  owner_user_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

type FollowUp = {
  id: number;
  user_id: number;
  body: string;
  next_follow_up_at?: string | null;
  created_at?: string;
};

type UserRow = { id: number; username: string; role: string };

export default function CrmCustomersPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const role = (effectiveRole ?? user?.role) as string;
  const planFeats = getPlanFeatures(user?.package);
  const canSeeBalances = canAccess(role as any, 'crm_customer_balances', planFeats);

  const { allowed } = useRouteGuard(user, authLoading, { feature: 'crm_customers', effectiveRole, showDenied: true });
  const isSuperAdmin = user?.role === 'super_admin';
  const needsShop = isSuperAdmin && !getActiveShopId();

  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [creating, setCreating] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ customer: CrmCustomer; followUps: FollowUp[] } | null>(null);
  const [followBody, setFollowBody] = useState('');
  const [nextFollow, setNextFollow] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const canReassign = useMemo(
    () => ['super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role),
    [role]
  );

  const loadCustomers = useCallback(async () => {
    if (needsShop) {
      setCustomers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/crm/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.message === 'SHOP_ID_REQUIRED') {
        setError(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
        setCustomers([]);
      } else {
        setError(e?.message || 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  }, [needsShop, language]);

  useEffect(() => {
    if (!authLoading && allowed) void loadCustomers();
  }, [authLoading, allowed, loadCustomers]);

  useEffect(() => {
    const onShop = () => void loadCustomers();
    window.addEventListener('crown-shop-changed', onShop);
    return () => window.removeEventListener('crown-shop-changed', onShop);
  }, [loadCustomers]);

  useEffect(() => {
    if (!allowed || !canReassign || needsShop) return;
    apiRequest('/users')
      .then((rows) => setUsers(Array.isArray(rows) ? rows : []))
      .catch(() => setUsers([]));
  }, [allowed, canReassign, needsShop]);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    setFollowBody('');
    setNextFollow('');
    setReassignUserId('');
    setDetailLoading(true);
    try {
      const res = await apiRequest(`/crm/customers/${id}`);
      setDetail({
        customer: res.customer,
        followUps: Array.isArray(res.followUps) ? res.followUps : [],
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load customer');
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const createCustomer = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiRequest('/crm/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      setForm({ name: '', phone: '', email: '', notes: '' });
      await loadCustomers();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const addFollowUp = async () => {
    if (!detailId || !followBody.trim()) return;
    try {
      await apiRequest(`/crm/customers/${detailId}/follow-ups`, {
        method: 'POST',
        body: JSON.stringify({
          body: followBody.trim(),
          next_follow_up_at: nextFollow.trim() || null,
        }),
      });
      setFollowBody('');
      setNextFollow('');
      await openDetail(detailId);
      await loadCustomers();
    } catch (e: any) {
      setError(e?.message || 'Failed to add follow-up');
    }
  };

  const reassign = async () => {
    if (!detailId || !reassignUserId) return;
    try {
      await apiRequest(`/crm/customers/${detailId}/reassign`, {
        method: 'PATCH',
        body: JSON.stringify({ owner_user_id: Number(reassignUserId) }),
      });
      await openDetail(detailId);
      await loadCustomers();
    } catch (e: any) {
      setError(e?.message || 'Reassign failed');
    }
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'العملاء — CRM' : 'Customers — CRM';
  const subtitle =
    language === 'ar'
      ? 'إدارة العملاء والمتابعات. يظهر لكل مندوب مبيعات عملاءه فقط.'
      : 'Manage customers and follow-ups. Sales users only see their own.';

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        {isSuperAdmin && (
          <div className="mb-4">
            <ShopSwitcher />
            {needsShop && (
              <p className="mt-2 text-sm text-amber-400">
                {language === 'ar' ? 'اختر المتجر أولاً' : 'Select a shop first'}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">{title}</h1>
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          </div>
          {canSeeBalances && (
            <Link
              href="/store-admin/crm/balances"
              className="text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-500/40 rounded-lg px-3 py-2"
            >
              {language === 'ar' ? 'أرصدة العملاء (آجل)' : 'Customer balances (on account)'}
            </Link>
          )}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>}

        <div className="neon-card rounded-xl p-4 mb-8 border border-cyan-500/20">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">{language === 'ar' ? 'عميل جديد' : 'New customer'}</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px]"
              placeholder={language === 'ar' ? 'الاسم *' : 'Name *'}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]"
              placeholder={language === 'ar' ? 'الهاتف' : 'Phone'}
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
              placeholder={language === 'ar' ? 'البريد' : 'Email'}
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm flex-[2] min-w-[200px]"
              placeholder={language === 'ar' ? 'ملاحظات' : 'Notes'}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
            <button
              type="button"
              onClick={createCustomer}
              disabled={creating || !form.name.trim() || needsShop}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50"
            >
              {creating ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : language === 'ar' ? 'إضافة' : 'Add'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table text-sm text-slate-200 min-w-[640px]">
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th>{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th>{language === 'ar' ? 'البريد' : 'Email'}</th>
                  <th>{language === 'ar' ? 'المسؤول' : 'Owner user'}</th>
                  <th className="col-center">{language === 'ar' ? 'تفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-cyan-100/90">{c.name}</td>
                    <td className="data-table-num">{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td className="data-table-num">{c.owner_user_id ?? '—'}</td>
                    <td className="data-table-center">
                      <button
                        type="button"
                        onClick={() => openDetail(c.id)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs"
                      >
                        {language === 'ar' ? 'فتح' : 'Open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && !needsShop && (
              <p className="text-slate-500 text-sm mt-4">{language === 'ar' ? 'لا يوجد عملاء بعد.' : 'No customers yet.'}</p>
            )}
          </div>
        )}

        {detailId != null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => !detailLoading && setDetailId(null)}
          >
            <div
              className="neon-card rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
              ) : detail ? (
                <>
                  <h3 className="text-lg font-bold text-cyan-200 mb-2">{detail.customer.name}</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    {[detail.customer.phone, detail.customer.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {detail.customer.notes && <p className="text-sm text-slate-300 mb-4">{detail.customer.notes}</p>}

                  {canReassign && users.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-[#0f172a] border border-cyan-500/15">
                      <p className="text-xs text-cyan-300 mb-2">{language === 'ar' ? 'إعادة تعيين المسؤول' : 'Reassign owner'}</p>
                      <div className="flex gap-2 flex-wrap">
                        <select
                          className="bg-black border border-cyan-500/20 rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[160px]"
                          value={reassignUserId}
                          onChange={(e) => setReassignUserId(e.target.value)}
                        >
                          <option value="">{language === 'ar' ? 'اختر مستخدمًا' : 'Select user'}</option>
                          {users.map((u) => (
                            <option key={u.id} value={String(u.id)}>
                              {u.username} ({u.role})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={reassign}
                          disabled={!reassignUserId}
                          className="px-3 py-1.5 rounded-lg bg-cyan-700 text-white text-sm disabled:opacity-50"
                        >
                          {language === 'ar' ? 'تعيين' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  )}

                  <h4 className="text-sm font-semibold text-cyan-300 mb-2">{language === 'ar' ? 'متابعات' : 'Follow-ups'}</h4>
                  <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto text-sm text-slate-300">
                    {detail.followUps.map((f) => (
                      <li key={f.id} className="border-b border-cyan-500/10 pb-2">
                        <div>{f.body}</div>
                        {f.next_follow_up_at && (
                          <div className="text-xs text-slate-500 mt-1">
                            {language === 'ar' ? 'التالي: ' : 'Next: '}
                            {f.next_follow_up_at}
                          </div>
                        )}
                      </li>
                    ))}
                    {detail.followUps.length === 0 && (
                      <li className="text-slate-500">{language === 'ar' ? 'لا توجد متابعات.' : 'No follow-ups yet.'}</li>
                    )}
                  </ul>

                  <div className="space-y-2">
                    <textarea
                      className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                      placeholder={language === 'ar' ? 'متابعة جديدة...' : 'New follow-up...'}
                      value={followBody}
                      onChange={(e) => setFollowBody(e.target.value)}
                    />
                    <input
                      type="datetime-local"
                      className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                      value={nextFollow}
                      onChange={(e) => setNextFollow(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setDetailId(null)}
                        className="px-3 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm"
                      >
                        {language === 'ar' ? 'إغلاق' : 'Close'}
                      </button>
                      <button
                        type="button"
                        onClick={addFollowUp}
                        disabled={!followBody.trim()}
                        className="px-3 py-2 rounded-lg bg-cyan-600 text-white text-sm disabled:opacity-50"
                      >
                        {language === 'ar' ? 'إضافة متابعة' : 'Add follow-up'}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
