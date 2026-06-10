'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Legacy route - redirects to unified Store Management at /store-admin/store.
 * Owner/super_admin see full Domain + Preview there.
 */
export default function DomainsRedirectPage() {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace('/store-admin/store');
  }, [loading, router]);

  return null;
}
