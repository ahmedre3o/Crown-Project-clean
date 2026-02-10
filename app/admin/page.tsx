'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { PlanCards } from '@/components/PlanCards';
import { ShopSwitcher, getActiveShopId } from '@/components/ShopSwitcher';
import { useLanguage } from '../contexts/LanguageContext';
import { useOffline } from '../contexts/OfflineContext';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';

interface UserItem {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const { t, direction, language } = useLanguage();
  const { isOnline } = useOffline();
  const { user, loading: authLoading, effectiveRole, setRoleOverride, clearRoleOverride } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'admin', effectiveRole, showDenied: true });
  const [roleTesterValue, setRoleTesterValue] = React.useState<string>('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'cashier' });
  const [licenseForm, setLicenseForm] = useState({ plan: 'bronze', duration: 'monthly', count: '1' });
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading || !allowed) return;
    if (!user || user.role !== 'super_admin') return;
    loadUsers();
  }, [authLoading, allowed, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setRoleTesterValue(sessionStorage.getItem('crown-role-override') || '');
    sync();
    window.addEventListener('crown-role-override-changed', sync);
    return () => window.removeEventListener('crown-role-override-changed', sync);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    setError(null);
    if (form.role === 'shop_owner' && user?.role === 'super_admin' && !getActiveShopId()) {
      const msg = language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first';
      toast.error(msg);
      return;
    }
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ username: '', password: '', role: 'cashier' });
      await loadUsers();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg === 'SHOP_ID_REQUIRED') {
        toast.error(language === 'ar' ? 'اختر المتجر أولاً' : 'Please select a shop first');
        return;
      }
      setError(msg === 'PLAN_USER_LIMIT_REACHED' ? (language === 'ar' ? 'لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك. قم بالترقية أو احذف مستخدمًا.' : "You have reached your plan's user limit. Upgrade your plan or remove a user.") : (msg || 'Failed to create user'));
    }
  };

  const deleteUser = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err: any) {
      const msg = err?.message || '';
      setError(msg === 'OWNER_CANNOT_BE_DELETED' ? (language === 'ar' ? 'لا يمكن حذف حساب المالك' : 'Owner account cannot be deleted') : (msg || 'Failed to delete user'));
    }
  };

  const generateCodes = async () => {
    setError(null);
    try {
      const result = await apiRequest('/licenses/generate', {
        method: 'POST',
        body: JSON.stringify({
          plan: licenseForm.plan,
          duration: licenseForm.duration,
          count: parseInt(licenseForm.count || '1', 10),
        }),
      });
      setGeneratedCodes(result.codes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to generate codes');
    }
  };

  if (authLoading || !allowed) return null;

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-black text-white flex" dir={direction}>
        <Sidebar />
        <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto flex items-center justify-center">
          <div className="neon-card rounded-xl p-8 max-w-md w-full text-center">
            <h1 className="text-xl font-bold text-amber-300 mb-3">
              {language === 'ar' ? 'يتطلب اتصالاً بالإنترنت' : 'Requires Internet Connection'}
            </h1>
            <p className="text-slate-400">
              {language === 'ar' ? 'هذه الصفحة تحتاج إلى اتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.' : 'This page requires an internet connection. Check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('admin.title')}</h1>
        {user?.role !== 'super_admin' ? (
          <div className="neon-card rounded-xl p-6">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {language === 'ar' ? 'هذه الصفحة خاصة بالمدير العام للنظام فقط.' : 'This page is for system administrators only.'}
            </div>
          </div>
        ) : (
          <div className="neon-card rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <ShopSwitcher />
            </div>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  <a href="https://wa.me/201202620913" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-400 hover:text-green-300">
                    <span>{language === 'ar' ? 'واتساب:' : 'WhatsApp:'}</span>
                    <span>+01202620913</span>
                  </a>
                  <a href="tel:+01070045116" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                    <span>{language === 'ar' ? 'فودافون:' : 'Vodafone Call:'}</span>
                    <span>+01070045116</span>
                  </a>
                </div>
                <h2 className="text-lg font-bold text-cyan-200">{language === 'ar' ? 'الباقات' : 'Plans'}</h2>
              </div>
              <PlanCards />
            </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-cyan-200 mb-4">
              {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder="Email / Username"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              />
              <input
                type="password"
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <select
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="shop_owner">{language === 'ar' ? 'مالك' : 'Owner'}</option>
                <option value="cashier">{language === 'ar' ? 'كاشير' : 'Cashier'}</option>
                <option value="warehouse">{language === 'ar' ? 'مخزن' : 'Warehouse'}</option>
              </select>
            </div>
            <button
              onClick={createUser}
              disabled={form.role === 'shop_owner' && user?.role === 'super_admin' && !getActiveShopId()}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
            </button>

            <div className="mt-4 overflow-x-auto">
              {loading ? (
                <div className="text-sm text-slate-300">{t('common.loading')}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-cyan-400 border-b border-cyan-500/20">
                    <tr>
                      <th className="py-2 text-left">Email</th>
                      <th className="py-2 text-left">{language === 'ar' ? 'الدور' : 'Role'}</th>
                      <th className="py-2 text-left">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th>
                      <th className="py-2 text-left">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id} className="border-b border-cyan-500/10">
                        <td className="py-2">{item.username}</td>
                        <td className="py-2">{item.role}</td>
                        <td className="py-2">
                          {new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </td>
                        <td className="py-2">
                          {item.role !== 'shop_owner' && item.id !== user?.id && (
                            <button
                              onClick={() => deleteUser(item.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {user?.role === 'super_admin' && (
            <>
            <div className="mt-10 border-t border-cyan-500/20 pt-6">
              <h2 className="text-lg font-bold text-cyan-200 mb-3">
                {language === 'ar' ? 'مختبر الأدوار' : 'Session Role Tester'}
              </h2>
              <p className="text-sm text-slate-400 mb-3">
                {language === 'ar' ? 'لاختبار القائمة الجانبية لكل دور (للمدير العام فقط)' : 'Test sidebar visibility per role (super_admin only)'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  value={roleTesterValue}
                  onChange={(e) => setRoleTesterValue(e.target.value)}
                >
                  <option value="">{language === 'ar' ? '— بدون تجربة —' : '— No override —'}</option>
                  <option value="super_admin">{language === 'ar' ? 'مدير النظام (كامل)' : 'Full Access (super_admin)'}</option>
                  <option value="shop_owner">{language === 'ar' ? 'مالك متجر' : 'Shop Owner'}</option>
                  <option value="branch_manager">{language === 'ar' ? 'مدير فرع' : 'Branch Manager'}</option>
                  <option value="cashier">{language === 'ar' ? 'كاشير' : 'Cashier'}</option>
                  <option value="warehouse">{language === 'ar' ? 'مخزن' : 'Warehouse'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (roleTesterValue) setRoleOverride(roleTesterValue);
                    else clearRoleOverride();
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
                >
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { clearRoleOverride(); setRoleTesterValue(''); }}
                  className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
                >
                  {language === 'ar' ? 'إلغاء التجربة' : 'Clear Override'}
                </button>
              </div>
            </div>
            <div className="mt-10 border-t border-cyan-500/20 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-cyan-200">
                  {language === 'ar' ? 'مولد الأكواد' : 'Activation Code Generator'}
                </h2>
                <Link
                  href="/admin/codes"
                  className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                >
                  {language === 'ar' ? 'عرض قائمة الأكواد' : 'View Codes List'}
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  value={licenseForm.plan}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, plan: e.target.value }))}
                >
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="branches">Branches</option>
                </select>
                <select
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  value={licenseForm.duration}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, duration: e.target.value }))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
                <input
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  placeholder="Count"
                  value={licenseForm.count}
                  onChange={(e) => setLicenseForm((prev) => ({ ...prev, count: e.target.value }))}
                />
              </div>
              <button
                onClick={generateCodes}
                className="mt-4 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
              >
                {language === 'ar' ? 'توليد الأكواد' : 'Generate Codes'}
              </button>
              {generatedCodes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {generatedCodes.map((code) => (
                    <div key={code} className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#0f172a] px-3 py-2 text-sm text-cyan-200">
                      <code className="flex-1 font-mono">{code}</code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          toast.success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                        }}
                        className="p-1.5 rounded border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300"
                        title={language === 'ar' ? 'نسخ' : 'Copy'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

