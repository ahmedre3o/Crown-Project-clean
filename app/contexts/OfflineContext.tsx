'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getQueue, getQueueCount, removeFromQueue, type QueuedItem } from '../../lib/offline-queue';
import { apiFetch } from './AuthContext';

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
    const items = await getQueue();
    for (const item of items) {
      try {
        const res = await apiFetch(item.endpoint, {
          method: item.method,
          body: item.payload != null ? JSON.stringify(item.payload) : undefined,
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
