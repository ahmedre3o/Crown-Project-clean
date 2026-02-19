'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t, direction } = useLanguage();
  const LABELS = {
    title: t('register.title'),
    subtitle: t('register.subtitle'),
    businessName: t('register.businessName'),
    ownerName: t('register.ownerName'),
    activityType: t('register.activityType'),
    address: t('register.address'),
    contactEmail: t('register.contactEmail'),
    contactPhone: t('register.contactPhone'),
    username: t('register.username'),
    password: t('register.password'),
    create: t('register.create'),
    creating: t('register.creating'),
    already: t('register.already'),
    errorDefault: t('register.errorDefault'),
  };
  const [loading, setLoading] = useState(false);
  const [shopId, setShopId] = useState('');
  const [needsShopId, setNeedsShopId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    activityType: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/auth/register-shop', {
        method: 'POST',
        body: JSON.stringify({
          businessName: form.businessName,
          ownerName: form.ownerName,
          activity_type: form.activityType.trim().slice(0, 128),
          address: form.address,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          username: form.username,
          password: form.password,
        }),
      });
      if (needsShopId && !shopId.trim()) {
        setError('SHOP_ID_REQUIRED');
        return;
      }
      await login(form.username, form.password, needsShopId ? shopId : undefined);
      try {
        sessionStorage.setItem('crown-trial-toast', '1');
      } catch {
        // ignore
      }
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'SHOP_ID_REQUIRED') {
        setNeedsShopId(true);
        setError(err?.message_ar || err?.message_en || 'SHOP_ID_REQUIRED');
        return;
      }

      setError(err.message || LABELS.errorDefault);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6" dir={direction}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-[#0b1220] border border-cyan-500/30 rounded-2xl p-8 space-y-5"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-cyan-200">{LABELS.title}</h1>
          <p className="text-sm text-slate-400">{LABELS.subtitle}</p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/40 rounded p-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.businessName}
            value={form.businessName}
            onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
            required
          />
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.ownerName}
            value={form.ownerName}
            onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
          />
          <input
            type="text"
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.activityType}
            value={form.activityType}
            onChange={(e) => setForm((prev) => ({ ...prev, activityType: e.target.value }))}
            maxLength={128}
            required
          />
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm md:col-span-2"
            placeholder={LABELS.address}
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          />
          <input
            type="email"
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.contactEmail}
            value={form.contactEmail}
            onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
          />
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.contactPhone}
            value={form.contactPhone}
            onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
          />
          <input
            type="email"
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.username}
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            required
          />
          <input
            type="password"
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            placeholder={LABELS.password}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        
      {needsShopId && (
        <div className="mt-3">
          <label className="block text-sm mb-1">Shop ID</label>
          <input
            name="shopId"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="مثال: 1"
          />
        </div>
      )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link href="/login" className="hover:text-cyan-300">
            {LABELS.already}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm disabled:opacity-60"
        >
          {loading ? LABELS.creating : LABELS.create}
        </button>
      </form>
    </main>
  );
}
