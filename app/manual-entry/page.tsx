'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, getNoShopMessage, isShopMissingError, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { ProductForm } from '../components/ProductForm';

export default function ManualEntryPage() {
  const { t, direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'manual_entry', effectiveRole });
  const rawPackage = (user as any)?.package;
  const hasPackageString = typeof rawPackage === 'string' && rawPackage.trim().length > 0;
  const packageObj = rawPackage && typeof rawPackage === 'object' ? (rawPackage as any) : null;
  const maxProducts = Number.isFinite(Number(packageObj?.maxProducts)) ? Number(packageObj?.maxProducts) : Infinity;
  const showPackageUnavailable = !hasPackageString && !packageObj;
  const showMaxProducts = Number.isFinite(maxProducts) && maxProducts !== Infinity;
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    setShowForm(true);
  }, []);

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('manual.title')}</h1>
        <div className="neon-card rounded-xl p-6">
          {showPackageUnavailable && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              {language === 'ar' ? 'بيانات الباقة غير متاحة حالياً.' : 'Package data unavailable.'}
            </div>
          )}
          {showMaxProducts && (
            <div className="mb-4 text-xs text-slate-400">
              {language === 'ar' ? `حد المنتجات: ${maxProducts}` : `Max products: ${maxProducts}`}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {toast && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm ${toast.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/40' : 'bg-red-500/20 text-red-200 border border-red-500/40'}`}
            >
              {toast.msg}
            </div>
          )}
          <p className="mb-4 text-slate-300 text-sm">
            {language === 'ar'
              ? 'استخدم النموذج الكامل لإضافة منتج جديد. نفس الحقول والوظائف كما في المخزون.'
              : 'Use the full form to add a new product. Same fields and features as inventory.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
          >
            {language === 'ar' ? 'إضافة منتج' : 'Add Product'}
          </button>
        </div>
      </div>

      {showForm && (
        <ProductForm
          mode="add"
          title={language === 'ar' ? 'إضافة منتج' : 'Add Product'}
          t={t}
          language={language}
          showToast={showToast}
          onSuccess={() => {
            setError(null);
            setShowForm(true);
          }}
          onCancel={() => setShowForm(false)}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}
