'use client';

import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { BranchProvider } from './contexts/BranchContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { PwaProvider } from './components/PwaProvider';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { RoleTestBar } from './components/RoleTestBar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <AuthProvider>
          <BranchProvider>
            <OfflineProvider>
              <PwaProvider>
                <OfflineBanner />
                {children}
                <InstallPrompt />
                <RoleTestBar />
              </PwaProvider>
            </OfflineProvider>
          </BranchProvider>
        </AuthProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}

