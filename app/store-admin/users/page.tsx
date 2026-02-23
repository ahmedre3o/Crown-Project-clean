'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ShopSwitcher, getActiveShopId } from '@/components/ShopSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { getPlanFeatures } from '@/permissions';
import { useRouteGuard } from '@/guards/useRouteGuard';

interface UserItem {
  id: number;
  username: string;
  employee_id?: string | null;
  email?: string | null;
  role: string;
  created_at: string;
  branch_id?: number;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  name_ar?: string;
  name_en?: string;
}

const LIMIT_MSG_AR = 'لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك. قم بالترقية أو احذف مستخدمًا.';
const LIMIT_MSG_EN = "You have reached your plan's user limit. Upgrade your plan or remove a user.";

export default function UsersPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    canAddUser?: boolean;
    userLimit?: number;
    userLimitTotal?: number;
    additionalUsersLimit?: number;
    userCount?: number;
    userCountTotal?: number;
    additionalUsersCount?: number;
    planName?: string;
  } | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({ identifier: '', password: '', role: 'cashier' as string, branchId: '' });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [usersData, subData, branchesData] = await Promise.all([
        apiRequest('/users'),
        apiRequest('/subscription').catch(() => null),
        apiRequest('/admin/branches').catch(() => []),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      if (subData) setSubscription({
        canAddUser: subData.canAddUser,
        userLimit: subData.userLimit ?? subData.userLimitTotal,
        userLimitTotal: subData.userLimitTotal ?? subData.userLimit,
        additionalUsersLimit: subData.additionalUsersLimit,
        userCount: subData.userCount ?? subData.userCountTotal,
        userCountTotal: subData.userCountTotal ?? subData.userCount,
        additionalUsersCount: subData.additionalUsersCount,
        planName: subData.planName,
      });
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err: any) {
      if (err?.message === 'SHOP_ID_REQUIRED') {
        setUsers([]);
        setBranches([]);
        setSubscription(null);
        setError(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
        return;
      }
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const { allowed } = useRouteGuard(user, authLoading, { feature: 'users', effectiveRole });
  const isSuperAdmin = user?.role === 'super_admin';
  const needsShop = isSuperAdmin && !getActiveShopId();

  useEffect(() => {
    if (!authLoading && allowed) loadUsers();
  }, [authLoading, allowed]);

  useEffect(() => {
    const handler = () => loadUsers();
    window.addEventListener('crown-shop-changed', handler);
    return () => window.removeEventListener('crown-shop-changed', handler);
  }, []);

  const createUser = async () => {
    setError(null);
    if (needsShop) {
      setError(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
      return;
    }
    const payload: Record<string, unknown> = { username: form.identifier.trim(), password: form.password, role: validRole };
    if (showBranchSelector && form.branchId) payload.branchId = Number(form.branchId);
    setCreatingUser(true);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm({ identifier: '', password: '', role: creatableRoles[0] || 'cashier', branchId: '' });
      await loadUsers();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'SHOP_ID_REQUIRED') {
        setError(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
        return;
      }
      setError(msg === 'PLAN_USER_LIMIT_REACHED' ? (language === 'ar' ? LIMIT_MSG_AR : LIMIT_MSG_EN) : msg);
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err: any) {
      const msg = (err as any)?.message || '';
      setError(msg === 'OWNER_CANNOT_BE_DELETED' ? (language === 'ar' ? 'لا يمكن حذف حساب المالك' : 'Owner account cannot be deleted') : (msg || 'Failed to delete'));
    }
  };

  const [changePwModal, setChangePwModal] = useState<{ userId: number; username: string } | null>(null);
  const [changePwNew, setChangePwNew] = useState('');
  const [changePwConfirm, setChangePwConfirm] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);

  const changePassword = async () => {
    if (!changePwModal || !changePwNew || changePwNew !== changePwConfirm) return;
    setChangePwLoading(true);
    setError(null);
    try {
      await apiRequest(`/users/${changePwModal.userId}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: changePwNew }),
      });
      setChangePwModal(null);
      setChangePwNew('');
      setChangePwConfirm('');
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setChangePwLoading(false);
    }
  };

  const canAdd = subscription?.canAddUser !== false && !needsShop && !!form.identifier.trim() && !!form.password;
  const planFeats = getPlanFeatures(user?.package);
  const role = (effectiveRole ?? user?.role) as string;

  const CREATABLE_ROLES: Record<string, string[]> = {
    super_admin: ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'],
    shop_owner: ['branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'],
    branch_manager: ['cashier', 'warehouse'],
    multi_branch_manager: ['branch_manager', 'cashier', 'warehouse'],
  };
  const creatableRoles = CREATABLE_ROLES[role] || [];
  const validRole = creatableRoles.includes(form.role) ? form.role : (creatableRoles[0] || 'cashier');

  const showBranchSelector =
    role !== 'branch_manager' &&
    ['branch_manager', 'cashier', 'warehouse'].includes(form.role) &&
    (planFeats.branches || role === 'super_admin') &&
    branches.length > 0;
  const canDeleteUser = ['shop_owner', 'super_admin'].includes(role);
  const isOwnerRow = (item: UserItem) => item.role === 'shop_owner';
  const isSuperAdminRow = (item: UserItem) => item.role === 'super_admin';
  const canChangePasswordFor = (item: UserItem) => {
    if (item.role === 'super_admin') return role === 'super_admin';
    return ['super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);
  };
  const title = language === 'ar' ? 'إدارة المستخدمين' : 'User Management';
  const subtitle = language === 'ar' ? 'إضافة أو حذف المستخدمين حسب حد الباقة' : 'Add or remove users according to your plan limit';

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        {isSuperAdmin && (
          <div className="mb-4">
            <ShopSwitcher />
            {needsShop && (
              <p className="mt-2 text-sm text-amber-400">
                {language === 'ar' ? 'اختر المتجر أولاً لتفعيل زر إضافة مستخدم.' : 'Select a shop first to enable Add User.'}
              </p>
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold text-cyan-200 mb-2">{title}</h1>
        <p className="text-sm text-slate-400 mb-6">{subtitle}</p>

        {subscription && (
          <p className="text-xs text-slate-500 mb-4">
            {language === 'ar'
              ? `المستخدمون: ${subscription.userCountTotal ?? users.length} / ${subscription.userLimitTotal ?? '-'} (إضافي: ${subscription.additionalUsersCount ?? '-'} / ${subscription.additionalUsersLimit ?? '-'})`
              : `Users: ${subscription.userCountTotal ?? users.length} / ${subscription.userLimitTotal ?? '-'} (additional: ${subscription.additionalUsersCount ?? '-'} / ${subscription.additionalUsersLimit ?? '-'})`}
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
        )}

        <div className="flex flex-wrap items-end gap-3 mb-6">
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={language === 'ar' ? 'اسم المستخدم أو البريد أو رقم الموظف' : 'Username, Email, or Employee ID'}
            value={form.identifier}
            onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
          />
          <input
            type="password"
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={language === 'ar' ? 'كلمة المرور' : 'Password'}
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <select
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            value={validRole}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value, branchId: '' }))}
          >
            {creatableRoles.includes('shop_owner') && <option value="shop_owner">{language === 'ar' ? 'مالك المتجر' : 'Shop Owner'}</option>}
            {creatableRoles.includes('branch_manager') && <option value="branch_manager">{language === 'ar' ? 'مدير فرع' : 'Branch Manager'}</option>}
            {creatableRoles.includes('multi_branch_manager') && <option value="multi_branch_manager">{language === 'ar' ? 'مدير فروع متعدد' : 'Multi-Branch Manager'}</option>}
            {creatableRoles.includes('cashier') && <option value="cashier">{language === 'ar' ? 'كاشير' : 'Cashier'}</option>}
            {creatableRoles.includes('warehouse') && <option value="warehouse">{language === 'ar' ? 'مخزن' : 'Warehouse'}</option>}
          </select>
          {showBranchSelector && (
            <select
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              value={form.branchId}
              onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
            >
              <option value="">{language === 'ar' ? 'كل الفروع' : 'All branches'}</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name_en || b.name_ar || b.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={createUser}
            disabled={!canAdd || loading || creatingUser}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50"
          >
            {creatingUser ? (language === 'ar' ? 'جاري الإضافة...' : 'Adding...') : (language === 'ar' ? 'إضافة مستخدم' : 'Add User')}
          </button>
        </div>
        {subscription?.canAddUser === false && !needsShop && (
          <p className="text-sm text-amber-400 mb-4">
            {language === 'ar' ? LIMIT_MSG_AR : LIMIT_MSG_EN}
          </p>
        )}

        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-cyan-400 border-b border-cyan-500/20">
                <tr>
                  <th className="py-2 text-left">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</th>
                  <th className="py-2 text-left">{language === 'ar' ? 'رقم الموظف' : 'Employee ID'}</th>
                  <th className="py-2 text-left">{language === 'ar' ? 'الدور' : 'Role'}</th>
                  <th className="py-2 text-left">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th>
                  <th className="py-2 text-left">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-b border-cyan-500/10">
                    <td className="py-2">{item.username}</td>
                    <td className="py-2">{item.employee_id ?? '-'}</td>
                    <td className="py-2">{item.role}</td>
                    <td className="py-2">{new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td className="py-2 flex items-center gap-2">
                      {canChangePasswordFor(item) && (
                        <button
                          onClick={() => setChangePwModal({ userId: item.id, username: item.username })}
                          className="text-cyan-400 hover:text-cyan-300 text-xs"
                        >
                          {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                        </button>
                      )}
                      {canDeleteUser && !isOwnerRow(item) && !isSuperAdminRow(item) && item.id !== user?.id && (
                        <button onClick={() => deleteUser(item.id)} className="text-red-400 hover:text-red-300 text-xs">
                          {language === 'ar' ? 'حذف' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {changePwModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !changePwLoading && setChangePwModal(null)}>
            <div className="neon-card rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-cyan-200 mb-3">
                {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'} — {changePwModal.username}
              </h3>
              <input
                type="password"
                placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
                className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm mb-3"
                value={changePwNew}
                onChange={(e) => setChangePwNew(e.target.value)}
              />
              <input
                type="password"
                placeholder={language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'}
                className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm mb-4"
                value={changePwConfirm}
                onChange={(e) => setChangePwConfirm(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={changePassword}
                  disabled={changePwLoading || !changePwNew || changePwNew !== changePwConfirm}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50"
                >
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
                <button
                  onClick={() => { setChangePwModal(null); setChangePwNew(''); setChangePwConfirm(''); }}
                  className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
