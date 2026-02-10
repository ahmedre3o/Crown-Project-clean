'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../api-config';
import { getQueue, getQueueCount, removeFromQueue, type QueuedItem } from '../../lib/offline-queue';

interface OfflineContextType {
  isOnline: boolean;
  queueCount: number;
  queue: QueuedItem[];
  syncNow: () => Promise<void>;
  refreshQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [queue, setQueue] = useState<QueuedItem[]>([]);

  const refreshQueue = useCallback(async () => {
    try {
      const items = await getQueue();
      setQueue(items);
      setQueueCount(items.length);
    } catch {
      setQueue([]);
      setQueueCount(0);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    refreshQueue();
    const onOnline = () => {
      setIsOnline(true);
      refreshQueue();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshQueue]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const userObj = storedUser ? JSON.parse(storedUser) : null;
    const shopId = userObj?.shopId ?? userObj?.shop_id ?? (userObj?.role === 'super_admin' ? localStorage.getItem('crown-active-shop-id') : null);
    const branchId = shopId ? localStorage.getItem(`crown-active-branch-${shopId}`) : null;

    const items = await getQueue();
    for (const item of items) {
      try {
        const res = await fetch(`${API_BASE_URL}${item.endpoint}`, {
          method: item.method,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(shopId && { 'x-shop-id': String(shopId) }),
            ...(branchId && { 'x-branch-id': String(branchId) }),
          },
          body: JSON.stringify(item.payload),
        });
        if (res.ok) {
          await removeFromQueue(item.id);
        }
      } catch {
        // keep in queue, will retry later
      }
    }
    await refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    if (isOnline && queueCount > 0) {
      syncNow();
    }
  }, [isOnline, queueCount, syncNow]);

  return (
    <OfflineContext.Provider value={{ isOnline, queueCount, queue, syncNow, refreshQueue }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
};
