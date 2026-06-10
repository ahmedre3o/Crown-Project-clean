'use client';

import { useEffect, useState } from 'react';

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Fluctuates around `base` for a “live dashboard” feel (landing demo only). */
export function useLiveMoney(base: number, intervalMs = 2600) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setV((prev) => {
        const jitter = (Math.random() - 0.5) * Math.max(12, base * 0.006);
        const next = clamp(prev + jitter, base * 0.92, base * 1.08);
        return Math.round(next * 100) / 100;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, intervalMs]);
  return v;
}

export function useLiveInt(base: number, intervalMs = 2400) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setV((prev) => {
        const delta = Math.floor((Math.random() - 0.45) * 4);
        return clamp(prev + delta, Math.max(0, base - 8), base + 12);
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, intervalMs]);
  return v;
}

export function formatMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
