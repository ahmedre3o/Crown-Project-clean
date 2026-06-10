'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { type PlanBillCurrency } from '@/components/PlanCards';
import { LandingSaaS } from '@/components/login/LandingSaaS';
import { LoginModal } from '@/components/login/LoginModal';
import { BrandedLoadingSplash } from '@/components/BrandedLoadingSplash';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [loginOpen, setLoginOpen] = useState(false);
  const [billCurrency, setBillCurrency] = useState<PlanBillCurrency>(() => (language === 'ar' ? 'EGP' : 'USD'));

  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncHash = () => {
      if (window.location.hash === '#login') setLoginOpen(true);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const closeLogin = () => {
    setLoginOpen(false);
    if (typeof window !== 'undefined' && window.location.hash === '#login') {
      const path = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', path);
    }
  };

  if (authLoading) {
    return <BrandedLoadingSplash />;
  }
  if (user) {
    return null;
  }

  return (
    <>
      <LandingSaaS
        language={language}
        setLanguage={setLanguage}
        billCurrency={billCurrency}
        onBillCurrencyChange={setBillCurrency}
        onOpenLogin={() => setLoginOpen(true)}
      />
      <LoginModal open={loginOpen} onClose={closeLogin} language={language} setLanguage={setLanguage} />
    </>
  );
}
