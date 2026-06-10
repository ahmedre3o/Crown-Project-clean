'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLanguage } from './LanguageContext';
import { getCurrencySymbol } from '@/lib/formatters';

type CurrencyCode =
  | 'EGP'
  | 'SAR'
  | 'USD'
  | 'AED'
  | 'KWD'
  | 'QAR'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'INR'
  | 'CNY'
  | 'TRY';

interface CurrencyContextType {
  currency: CurrencyCode;
  symbol: string;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function detectCurrency(): CurrencyCode {
  return 'EGP';
}

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const [currency, setCurrencyState] = useState<CurrencyCode>('EGP');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('currency') as CurrencyCode | null;
    setCurrencyState(saved || detectCurrency());
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('currency', code);
    }
  };

  const symbol = useMemo(() => getCurrencySymbol(language === 'ar' ? 'ar' : 'en', currency, null), [currency, language]);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

