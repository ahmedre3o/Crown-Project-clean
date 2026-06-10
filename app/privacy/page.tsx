'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { PRIVACY_COPY } from '@/components/legal/legalCopy';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const copy = language === 'ar' ? PRIVACY_COPY.ar : PRIVACY_COPY.en;

  return (
    <LegalPageShell title={copy.title}>
      {copy.body}
    </LegalPageShell>
  );
}
