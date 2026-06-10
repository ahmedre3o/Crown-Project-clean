'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Activity, Printer } from 'lucide-react';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';

type Movement = {
  id: number;
  shop_id: number;
  product_id: number;
  branch_id: number | null;
  type: string;
  quantity: number;
  reference: string | null;
  created_at: string;
  product_name?: string | null;
  product_name_en?: string;
  product_name_ar?: string;
  branch_name?: string | null;
  branch_name_en?: string;
  branch_name_ar?: string;
  reference_label_ar?: string | null;
  reference_label_en?: string | null;
};

export default function StockMovementsPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'stock_movements', effectiveRole, showDenied: true });
  const branchCtx = useBranch();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest('/admin/stock-movements');
      const data = res as { movements?: Movement[] };
      setMovements(Array.isArray(data?.movements) ? data.movements : []);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to load');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && allowed) load();
  }, [authLoading, allowed, load]);

  const productName = (m: Movement) =>
    language === 'ar'
      ? (m.product_name_ar || m.product_name_en || m.product_name)
      : (m.product_name_en || m.product_name_ar || m.product_name) || `#${m.product_id}`;
  const branchName = (m: Movement) =>
    language === 'ar'
      ? (m.branch_name_ar || m.branch_name_en || m.branch_name)
      : (m.branch_name_en || m.branch_name_ar || m.branch_name) || (m.branch_id ? `#${m.branch_id}` : '—');

  const referenceLabel = (m: Movement) =>
    language === 'ar'
      ? (m.reference_label_ar || m.reference_label_en || m.reference)
      : (m.reference_label_en || m.reference_label_ar || m.reference);

  const handlePrint = async () => {
    await logPrintAudit('stock_movements_report', 0, branchCtx.activeBranchId ?? undefined);
    window.print();
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'حركات المخزون' : 'Stock Movements';
  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6 flex items-center gap-2">
          <Activity className="h-7 w-7" />
          {title}
        </h1>
        <p className="text-gray-400 text-sm mb-4">
          {language === 'ar'
            ? 'سجل حركات المخزون: إدخال (شراء)، صرف (بيع)، نقل بين الفروع.'
            : 'Inventory movement log: IN (purchase), OUT (sale), TRANSFER between branches.'}
        </p>
        <div className="flex gap-2 mb-4 print:hidden">
          <button
            type="button"
            onClick={() => handlePrint()}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 px-4 py-2 text-cyan-300 hover:bg-cyan-500/10"
          >
            <Printer className="h-4 w-4" />
            {language === 'ar' ? 'طباعة' : 'Print'}
          </button>
        </div>
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="rounded-xl border border-cyan-500/30 overflow-hidden accounting-print">
          <div className="hidden print:block print-branch p-4 border-b border-gray-300 text-black">
            <div className="font-bold">Crown ERP</div>
            <div>{language === 'ar' ? 'حركات المخزون' : 'Stock movements'}</div>
            <div>
              {language === 'ar' ? 'الفرع (سياق الطباعة): ' : 'Print context branch: '}
              {getBranchDisplayName(branchCtx.activeBranch, language)}
            </div>
            <div className="text-sm mt-2 text-gray-600">
              {language === 'ar'
                ? 'الأعمدة: النوع (IN/OUT/TRANSFER)، الفرع، المرجع (sale_id / purchase / …)'
                : 'Columns: type, branch, reference (sale_id, purchase_invoice, etc.)'}
            </div>
          </div>
          {loading ? (
            <p className="p-6 text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-800/80 text-cyan-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'المرجع' : 'Reference'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5">
                    <td className="px-4 py-3">{m.id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          m.type === 'IN'
                            ? 'text-green-400'
                            : m.type === 'OUT'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                        }
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{productName(m)}</td>
                    <td className="px-4 py-3">{branchName(m)}</td>
                    <td className="px-4 py-3">{m.quantity}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{referenceLabel(m) || '—'}</td>
                    <td className="px-4 py-3">{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && movements.length === 0 && (
            <p className="p-6 text-gray-500 text-center">{language === 'ar' ? 'لا توجد حركات بعد' : 'No movements yet'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
