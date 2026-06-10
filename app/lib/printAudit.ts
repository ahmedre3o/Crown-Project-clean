'use client';

import { apiRequest } from '@/contexts/AuthContext';

/** Server audit: who printed, which branch (from X-Branch-Id / defaults). */
export async function logPrintAudit(
  type: string,
  referenceId: number = 0,
  branchId?: number | null
): Promise<void> {
  try {
    await apiRequest('/admin/print-log', {
      method: 'POST',
      body: JSON.stringify({
        type: String(type).slice(0, 64),
        reference_id: referenceId,
        ...(branchId != null && branchId > 0 ? { branch_id: branchId } : {}),
      }),
    });
  } catch {
    /* non-blocking */
  }
}
