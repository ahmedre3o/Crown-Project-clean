'use client';

import React, { useState } from 'react';
import { Shield, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  super_admin: { ar: 'مدير النظام', en: 'Full Access' },
  shop_owner: { ar: 'مالك متجر', en: 'Shop Owner' },
  branch_manager: { ar: 'مدير فرع', en: 'Branch Manager' },
  multi_branch_manager: { ar: 'مدير فروع', en: 'Multi-Branch Manager' },
  cashier: { ar: 'كاشير', en: 'Cashier' },
  warehouse: { ar: 'مخزن', en: 'Warehouse' },
  hr_manager: { ar: 'مدير موارد بشرية', en: 'HR Manager' },
  employee: { ar: 'موظف', en: 'Employee' },
  hr_employee: { ar: 'موظف', en: 'Employee' },
};

export function RoleTestBar() {
  const { user, roleOverride, setRoleOverride, clearRoleOverride } = useAuth();
  const { language, direction } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isRealSuperAdmin = user?.role === 'super_admin';
  const overrideActive = isRealSuperAdmin && roleOverride && String(roleOverride).trim();

  if (!isRealSuperAdmin || !overrideActive) return null;

  const label = ROLE_LABELS[roleOverride]?.[language as 'ar' | 'en'] ?? roleOverride;
  const roles = [
    'super_admin',
    'shop_owner',
    'branch_manager',
    'multi_branch_manager',
    'cashier',
    'warehouse',
    'hr_manager',
    'employee',
  ] as const;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-between gap-2 px-4 py-2 bg-amber-900/90 border-t border-amber-500/50 shadow-lg"
      dir={direction}
    >
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-300 shrink-0" />
        <span className="text-sm font-semibold text-amber-100">
          {language === 'ar' ? 'تجربة الدور:' : 'Testing:'} {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1 rounded border border-amber-500/50 bg-amber-800/50 px-2 py-1.5 text-xs text-amber-100 hover:bg-amber-700/50"
          >
            <span>{language === 'ar' ? 'تغيير' : 'Switch'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute bottom-full right-0 mb-1 z-20 min-w-[140px] rounded-lg border border-amber-500/50 bg-amber-900 py-1 shadow-xl">
                {roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRoleOverride(r);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs ${roleOverride === r ? 'bg-amber-600/50 text-amber-100' : 'text-amber-200 hover:bg-amber-700/30'}`}
                  >
                    {ROLE_LABELS[r]?.[language as 'ar' | 'en'] ?? r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={clearRoleOverride}
          className="flex items-center gap-1 rounded border border-amber-500/50 bg-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-600"
        >
          <X className="h-3.5 w-3.5" />
          {language === 'ar' ? 'إلغاء التجربة' : 'Clear Override'}
        </button>
      </div>
    </div>
  );
}
