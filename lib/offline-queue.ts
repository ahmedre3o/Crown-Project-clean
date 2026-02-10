/**
 * Offline queue using IndexedDB.
 * Queues safe write operations (POS sale/invoice) for sync when online.
 * Each item has idempotencyKey to prevent duplicates.
 */

const DB_NAME = 'crown-offline-queue';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

export type QueuedOperationType = 'pos_sale' | 'pos_invoice';

export interface QueuedItem {
  id: string;
  operationType: QueuedOperationType;
  payload: Record<string, unknown>;
  createdAt: number;
  idempotencyKey: string;
  endpoint: string;
  method: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
      }
    };
  });
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function enqueue(
  operationType: QueuedOperationType,
  payload: Record<string, unknown>,
  endpoint: string,
  method: string = 'POST'
): Promise<QueuedItem> {
  const idempotencyKey = uuid();
  const item: QueuedItem = {
    id: idempotencyKey,
    operationType,
    payload: { ...payload, idempotencyKey },
    createdAt: Date.now(),
    idempotencyKey,
    endpoint,
    method,
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => {
      db.close();
      resolve(item);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getQueue(): Promise<QueuedItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result || []).sort((a: QueuedItem, b: QueuedItem) => a.createdAt - b.createdAt));
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getQueueCount(): Promise<number> {
  const items = await getQueue();
  return items.length;
}
