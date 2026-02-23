'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { ChevronDown, ChevronUp, Package, CreditCard, Search, X } from 'lucide-react';

interface Order {
  id: number;
  shop_id: number;
  status: string;
  order_status?: string;
  payment_status?: string;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string | null;
  total: number;
  payment_method?: string;
  branch_id?: number | null;
  branch_name?: string;
  branch_name_ar?: string;
  branch_name_en?: string;
  created_at: string;
}

interface Payment {
  id: number;
  shop_id: number;
  order_id: number;
  method: string;
  amount: number;
  reference?: string | null;
  status: string;
  proof_url?: string | null;
  reject_reason?: string | null;
  customer_name?: string;
  phone?: string;
  public_code?: string;
  branch_name?: string;
  branch_name_ar?: string;
  branch_name_en?: string;
  created_at: string;
}

interface OrderItem {
  id: number;
  name_snapshot?: string | null;
  sell_price_snapshot?: number;
  quantity: number;
}

function PaymentsPageContent() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'payments_admin', effectiveRole, showDenied: true });
  const { symbol } = useCurrency();
  const { branches, activeBranch } = useBranch();
  const [tab, setTab] = useState<'orders' | 'payments'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderItem[]>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [drawerItems, setDrawerItems] = useState<OrderItem[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    branchId: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    method: '',
  });

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      completed: { ar: 'مكتمل', en: 'Completed' },
    };
    return map[s]?.[language] || s;
  };
  const orderStatusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      NEW: { ar: 'جديد', en: 'New' },
      PROCESSING: { ar: 'قيد المعالجة', en: 'Processing' },
      SHIPPED: { ar: 'تم الشحن', en: 'Shipped' },
      DELIVERED: { ar: 'تم التوصيل', en: 'Delivered' },
      CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
    };
    return map[s]?.[language] || s || '-';
  };
  const paymentStatusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'قيد الانتظار', en: 'Pending' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
      refunded: { ar: 'مسترد', en: 'Refunded' },
    };
    return map[s]?.[language] || s || '-';
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams();
      if (filters.status) q.set('status', filters.status);
      if (filters.paymentStatus) q.set('paymentStatus', filters.paymentStatus);
      if (filters.branchId || activeBranch?.id) q.set('branchId', filters.branchId || String(activeBranch!.id));
      if (filters.search) q.set('search', filters.search);
      if (filters.dateFrom) q.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) q.set('dateTo', filters.dateTo);
      const data = await apiRequest(`/admin/payments-orders/orders?${q.toString()}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.message || '';
      setError(msg === 'SHOP_ID_REQUIRED' ? t('لا توجد بيانات — اختر المتجر أولاً', 'No data — shop not selected') : (msg || t('فشل تحميل الطلبات', 'Failed to load orders')));
    } finally {
      setLoading(false);
    }
  }, [filters, activeBranch?.id, language]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams();
      if (filters.status) q.set('status', filters.status);
      if (filters.method) q.set('method', filters.method);
      if (filters.branchId || activeBranch?.id) q.set('branchId', filters.branchId || String(activeBranch!.id));
      if (filters.search) q.set('search', filters.search);
      if (filters.dateFrom) q.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) q.set('dateTo', filters.dateTo);
      const data = await apiRequest(`/admin/payments-orders/payments?${q.toString()}`);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.message || '';
      setError(msg === 'SHOP_ID_REQUIRED' ? t('لا توجد بيانات — اختر المتجر أولاً', 'No data — shop not selected') : (msg || t('فشل تحميل المدفوعات', 'Failed to load payments')));
    } finally {
      setLoading(false);
    }
  }, [filters, activeBranch?.id, language]);

  useEffect(() => {
    if (!authLoading && allowed) {
      if (tab === 'orders') loadOrders();
      else loadPayments();
    }
  }, [authLoading, allowed, tab, loadOrders, loadPayments]);

  const loadOrderDetail = async (orderId: number) => {
    if (orderDetails[orderId]) {
      setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
      return;
    }
    try {
      const order = await apiRequest(`/admin/orders/${orderId}`);
      setOrderDetails((prev) => ({ ...prev, [orderId]: order.items || [] }));
      setExpandedOrderId(orderId);
    } catch {
      setOrderDetails((prev) => ({ ...prev, [orderId]: [] }));
      setExpandedOrderId(orderId);
    }
  };

  const openDrawer = async (order: Order) => {
    setDrawerOrder(order);
    try {
      const detail = await apiRequest(`/admin/orders/${order.id}`);
      setDrawerItems(detail.items || []);
    } catch {
      setDrawerItems([]);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      setUpdatingId(orderId);
      await apiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      if (drawerOrder?.id === orderId) setDrawerOrder((o) => (o ? { ...o, status } : null));
    } catch (err: any) {
      setError(err.message || t('فشل تحديث الحالة', 'Failed to update status'));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmPayment = async (paymentId: number) => {
    try {
      setUpdatingId(paymentId);
      await apiRequest(`/admin/payments/${paymentId}/confirm`, { method: 'POST' });
      await loadPayments();
      await loadOrders();
    } catch (err: any) {
      setError(err.message || t('فشل تأكيد الدفع', 'Failed to confirm payment'));
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectPayment = async (paymentId: number, reason?: string) => {
    try {
      setUpdatingId(paymentId);
      await apiRequest(`/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await loadPayments();
      await loadOrders();
    } catch (err: any) {
      setError(err.message || t('فشل رفض الدفع', 'Failed to reject payment'));
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || !allowed) return null;

  return (
    <div className={`min-h-screen flex ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-cyan-200 mb-6">
            {t('المدفوعات/الطلبات', 'Payments / Orders')}
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('orders')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === 'orders'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'
              }`}
            >
              {t('الطلبات', 'Orders')}
            </button>
            <button
              onClick={() => setTab('payments')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === 'payments'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'
              }`}
            >
              {t('المدفوعات', 'Payments')}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              placeholder={t('بحث (رقم الطلب، الهاتف، الاسم)', 'Search (order ID, phone, name)')}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm w-48"
            />
            {tab === 'orders' && (
              <>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">{t('كل الحالات', 'All statuses')}</option>
                  {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">{t('حالة الدفع', 'Payment status')}</option>
                  {['pending', 'confirmed', 'rejected', 'refunded'].map((s) => (
                    <option key={s} value={s}>{paymentStatusLabel(s)}</option>
                  ))}
                </select>
              </>
            )}
            {tab === 'payments' && (
              <>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">{t('كل الحالات', 'All statuses')}</option>
                  {['pending', 'confirmed', 'rejected', 'refunded'].map((s) => (
                    <option key={s} value={s}>{paymentStatusLabel(s)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t('طريقة الدفع', 'Payment method')}
                  value={filters.method}
                  onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm w-36"
                />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  title={t('من تاريخ', 'From date')}
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                  title={t('إلى تاريخ', 'To date')}
                />
              </>
            )}
            <select
              value={filters.branchId}
              onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t('كل الفروع', 'All branches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{getBranchDisplayName(b, language)}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-slate-400 text-sm py-8">{t('جاري التحميل...', 'Loading...')}</div>
          ) : tab === 'orders' ? (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-8 text-slate-400 text-center">
                  {t('لا توجد طلبات', 'No orders found')}
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-cyan-500/20 bg-white/5 overflow-hidden"
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 cursor-pointer"
                      onClick={() => loadOrderDetail(order.id)}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-cyan-100 font-bold">#{order.id}</div>
                        <div>
                          <div className="text-slate-100 font-semibold">{order.customer_name}</div>
                          <div className="text-xs text-slate-400">{order.phone}</div>
                        </div>
                        <div className="text-cyan-200 font-bold">
                          {Number(order.total).toFixed(2)} {symbol}
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full border ${
                            order.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-200' :
                            order.status === 'cancelled' ? 'border-red-500/30 bg-red-500/10 text-red-200' :
                            order.status === 'confirmed' ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' :
                            'border-amber-500/30 bg-amber-500/10 text-amber-200'
                          }`}
                        >
                          {statusLabel(order.status)}
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded-full border border-slate-500/30 bg-slate-500/10 text-slate-300`}
                        >
                          {paymentStatusLabel(order.payment_status || 'pending')}
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300">
                          {orderStatusLabel(order.order_status || (order.status === 'pending' ? 'NEW' : order.status === 'confirmed' ? 'PROCESSING' : order.status === 'completed' ? 'DELIVERED' : 'CANCELLED'))}
                        </div>
                        {order.branch_name && (
                          <div className="text-xs text-slate-500">
                            {getBranchDisplayName({ name: order.branch_name, name_ar: order.branch_name_ar, name_en: order.branch_name_en } as any, language)}
                          </div>
                        )}
                        <div className="text-xs text-slate-500">
                          {new Date(order.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDrawer(order); }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500"
                      >
                        {t('عرض', 'View')}
                      </button>
                      {expandedOrderId === order.id ? (
                        <ChevronUp className="h-5 w-5 text-cyan-300" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-cyan-300" />
                      )}
                    </div>
                    {expandedOrderId === order.id && (
                      <div className="border-t border-cyan-500/15 px-5 py-4 bg-black/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-slate-400 mb-1">{t('العنوان', 'Address')}</div>
                            <div className="text-sm text-slate-200">
                              {order.governorate}, {order.city} — {order.address}
                            </div>
                          </div>
                          {order.notes && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">{t('ملاحظات', 'Notes')}</div>
                              <div className="text-sm text-slate-200">{order.notes}</div>
                            </div>
                          )}
                        </div>
                        <div className="mb-4">
                          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {t('المنتجات', 'Items')}
                          </div>
                          <div className="space-y-2">
                            {(orderDetails[order.id] || []).map((item) => (
                              <div key={item.id} className="flex justify-between text-sm text-slate-200 py-1">
                                <span>{item.name_snapshot || '-'} x {item.quantity}</span>
                                <span>
                                  {(Number(item.sell_price_snapshot ?? 0) * item.quantity).toFixed(2)} {symbol}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'confirmed'); }}
                                disabled={updatingId === order.id}
                                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-60"
                              >
                                {t('تأكيد', 'Confirm')}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }}
                                disabled={updatingId === order.id}
                                className="px-4 py-2 rounded-xl border border-red-500/30 text-red-200 hover:bg-red-500/10 text-sm font-semibold disabled:opacity-60"
                              >
                                {t('إلغاء', 'Cancel')}
                              </button>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
                                disabled={updatingId === order.id}
                                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-60"
                              >
                                {t('مكتمل', 'Complete')}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }}
                                disabled={updatingId === order.id}
                                className="px-4 py-2 rounded-xl border border-red-500/30 text-red-200 hover:bg-red-500/10 text-sm font-semibold disabled:opacity-60"
                              >
                                {t('إلغاء', 'Cancel')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-cyan-500/20">
              <table className="w-full text-sm">
                <thead className="text-cyan-400 border-b border-cyan-500/20 bg-[#0f172a]">
                  <tr>
                    <th className="py-2 px-3 text-left">{t('رقم الدفع', 'Payment ID')}</th>
                    <th className="py-2 px-3 text-left">{t('التاريخ', 'Date')}</th>
                    <th className="py-2 px-3 text-left">{t('الطريقة', 'Method')}</th>
                    <th className="py-2 px-3 text-left">{t('المبلغ', 'Amount')}</th>
                    <th className="py-2 px-3 text-left">{t('المرجع', 'Reference')}</th>
                    <th className="py-2 px-3 text-left">{t('الحالة', 'Status')}</th>
                    <th className="py-2 px-3 text-left">{t('الطلب', 'Order')}</th>
                    <th className="py-2 px-3 text-left">{t('إجراء', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                      <td className="py-2 px-3">#{p.id}</td>
                      <td className="py-2 px-3">{new Date(p.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className="py-2 px-3">{p.method}</td>
                      <td className="py-2 px-3 font-bold text-cyan-200">{Number(p.amount).toFixed(2)} {symbol}</td>
                      <td className="py-2 px-3">{p.reference || '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`${p.status === 'confirmed' ? 'text-green-400' : p.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                          {paymentStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="py-2 px-3">#{p.order_id}</td>
                      <td className="py-2 px-3">
                        {p.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmPayment(p.id)}
                              disabled={updatingId === p.id}
                              className="px-2 py-1 rounded bg-cyan-600 text-white text-xs disabled:opacity-60"
                            >
                              {t('تأكيد', 'Confirm')}
                            </button>
                            <button
                              onClick={() => rejectPayment(p.id)}
                              disabled={updatingId === p.id}
                              className="px-2 py-1 rounded border border-red-500/30 text-red-200 text-xs disabled:opacity-60"
                            >
                              {t('رفض', 'Reject')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="py-12 text-center text-slate-500">{t('لا توجد مدفوعات', 'No payments found')}</div>
              )}
            </div>
          )}
        </div>

        {/* Order Drawer */}
        {drawerOrder && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setDrawerOrder(null)} />
            <div
              className={`fixed top-0 h-full w-full max-w-md bg-[#0b1220] border-cyan-500/30 z-50 shadow-2xl overflow-y-auto ${direction === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'}`}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-cyan-200">
                    {t('تفاصيل الطلب', 'Order Details')} #{drawerOrder.id}
                  </h2>
                  <button
                    onClick={() => setDrawerOrder(null)}
                    className="p-2 rounded border border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-400">{t('العميل', 'Customer')}</div>
                    <div className="text-slate-200">{drawerOrder.customer_name} — {drawerOrder.phone}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{t('العنوان', 'Address')}</div>
                    <div className="text-slate-200">{drawerOrder.governorate}, {drawerOrder.city}<br />{drawerOrder.address}</div>
                  </div>
                  {drawerOrder.notes && (
                    <div>
                      <div className="text-xs text-slate-400">{t('ملاحظات', 'Notes')}</div>
                      <div className="text-slate-200">{drawerOrder.notes}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-400">{t('المنتجات', 'Items')}</div>
                    <div className="mt-2 space-y-2">
                      {drawerItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.name_snapshot || '-'} x {item.quantity}</span>
                          <span>{(Number(item.sell_price_snapshot ?? 0) * item.quantity).toFixed(2)} {symbol}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-cyan-500/20">
                    <div className="flex justify-between font-bold text-cyan-200">
                      <span>{t('الإجمالي', 'Total')}</span>
                      <span>{Number(drawerOrder.total).toFixed(2)} {symbol}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-4">
                    {drawerOrder.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(drawerOrder.id, 'confirmed')}
                          disabled={updatingId === drawerOrder.id}
                          className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          {t('تأكيد الدفع والطلب', 'Confirm payment & order')}
                        </button>
                        <button
                          onClick={() => updateOrderStatus(drawerOrder.id, 'cancelled')}
                          disabled={updatingId === drawerOrder.id}
                          className="px-4 py-2 rounded-xl border border-red-500/30 text-red-200 text-sm font-semibold disabled:opacity-60"
                        >
                          {t('إلغاء', 'Cancel')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <PaymentsPageContent />
    </Suspense>
  );
}
