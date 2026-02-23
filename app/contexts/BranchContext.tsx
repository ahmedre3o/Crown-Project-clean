'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from './AuthContext';
import { getStoredShopId } from '@/lib/shop';

export interface Branch {
  id: number;
  shop_id: number;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  code: string;
  created_at?: string;
}

export function getBranchDisplayName(b: Branch | null | undefined, language: string): string {
  if (!b) return language === 'ar' ? 'الفرع' : 'Branch';
  if (language === 'ar') return (b as any).name_ar || b.name;
  return (b as any).name_en || b.name;
}

interface BranchContextType {
  branches: Branch[];
  activeBranchId: number | null;
  activeBranch: Branch | null;
  setActiveBranchId: (id: number | null) => void;
  loadBranches: () => Promise<void>;
  loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeShopId, setActiveShopId] = useState<number | null>(() => getStoredShopId());
  const shopId = activeShopId ?? (user as any)?.shopId ?? (user as any)?.shop_id ?? null;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!shopId || (user?.role !== 'shop_owner' && user?.role !== 'super_admin' && user?.role !== 'branch_manager' && user?.role !== 'multi_branch_manager' && user?.role !== 'cashier')) {
      setBranches([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/admin/branches');
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      const stored = typeof window !== 'undefined' ? localStorage.getItem(`crown-active-branch-${shopId}`) : null;
      const num = stored ? Number(stored) : null;
      if (num && list.some((b: Branch) => b.id === num)) {
        setActiveBranchIdState(num);
      } else if (list.length > 0) {
        const defaultId = list[0].id;
        setActiveBranchIdState(defaultId);
        if (typeof window !== 'undefined') localStorage.setItem(`crown-active-branch-${shopId}`, String(defaultId));
      } else {
        setActiveBranchIdState(null);
      }
    } catch {
      setBranches([]);
      setActiveBranchIdState(null);
    } finally {
      setLoading(false);
    }
  }, [shopId, user?.role]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setActiveShopId(getStoredShopId());
    window.addEventListener('crown-shop-changed', handler);
    return () => window.removeEventListener('crown-shop-changed', handler);
  }, []);

  useEffect(() => {
    if (shopId) loadBranches();
    else {
      setBranches([]);
      setActiveBranchIdState(null);
    }
  }, [shopId, loadBranches]);

  const setActiveBranchId = useCallback(
    (id: number | null) => {
      setActiveBranchIdState(id);
      if (typeof window !== 'undefined' && shopId) {
        if (id != null) localStorage.setItem(`crown-active-branch-${shopId}`, String(id));
        else localStorage.removeItem(`crown-active-branch-${shopId}`);
      }
    },
    [shopId]
  );

  const activeBranch = activeBranchId ? branches.find((b) => b.id === activeBranchId) ?? null : null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranchId,
        activeBranch,
        setActiveBranchId,
        loadBranches,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextType {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return ctx;
}
