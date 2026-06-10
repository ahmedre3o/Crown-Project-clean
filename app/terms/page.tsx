'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LegalPageShell } from '@/components/legal/LegalPageShell';
import { TERMS_COPY } from '@/components/legal/legalCopy';

export default function TermsPage() {
  const { language } = useLanguage();
  const copy = language === 'ar' ? TERMS_COPY.ar : TERMS_COPY.en;

  return (
    <LegalPageShell title={copy.title}>
      {copy.body}
    </LegalPageShell>
  );
}
