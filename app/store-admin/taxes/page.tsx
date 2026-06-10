'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';

export default function TaxesPage() {
  const router = useRouter();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'taxes', effectiveRole, showDenied: true });
  React.useEffect(() => {
    if (!authLoading && allowed) router.replace('/store-admin/accounting/taxes');
  }, [authLoading, allowed, router]);
  return null;
}
