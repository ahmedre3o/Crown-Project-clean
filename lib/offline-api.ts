/**
 * Offline-aware API: when online, calls apiRequest.
 * When offline, enqueues POS sale/invoice for later sync.
 */
import { apiRequest } from '../app/contexts/AuthContext';
import { enqueue } from './offline-queue';

export async function createPosSaleOrInvoice(
  payload: {
    items: Array<{ productId: number; quantity: number; unitPrice: number; factorToBase?: number; unitId?: number }>;
    paymentMethod: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    branch_id?: number;
  },
  isOnline: boolean
): Promise<{ saleId: number; sale: any; invoiceNumber: string }> {
  if (isOnline) {
    return apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  const item = await enqueue('pos_invoice', payload, '/invoices', 'POST');
  return {
    saleId: 0,
    sale: { invoice_number: `OFFLINE-${item.idempotencyKey.slice(0, 8)}`, ...payload },
    invoiceNumber: `OFFLINE-${item.idempotencyKey.slice(0, 8)}`,
  };
}
