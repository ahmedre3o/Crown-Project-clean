'use client';

import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { BranchProvider } from './contexts/BranchContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { PwaProvider } from './components/PwaProvider';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';
import { RoleTestBar } from './components/RoleTestBar';
import { ImpersonationBanner } from './components/ImpersonationBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <BranchProvider>
              <OfflineProvider>
                <PwaProvider>
                  <OfflineBanner />
                  <ImpersonationBanner />
                  {children}
                  <InstallPrompt />
                  <RoleTestBar />
                  <div id="crown-print-footer">
                    POWERED BY CROWN SERVICES | WWW.CROWNCS.ORG
                  </div>
                </PwaProvider>
              </OfflineProvider>
            </BranchProvider>
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

