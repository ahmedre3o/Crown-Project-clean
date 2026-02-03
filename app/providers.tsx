'use client';

import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <AuthProvider>{children}</AuthProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}

