'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../api-config';
import { getStoredShopId, setStoredShopId } from '@/lib/shop';

const ROLE_OVERRIDE_KEY = 'crown-role-override';

interface User {
  id: number;
  username: string;
  role: 'super_admin' | 'shop_owner' | 'branch_manager' | 'multi_branch_manager' | 'cashier' | 'warehouse';
  package: 'bronze' | 'silver' | 'gold' | 'branches';
  shopId?: number;
  shop_id?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  /** Effective role for permissions (override only applies when user.role === 'super_admin') */
  effectiveRole: string | null;
  /** Current role override (non-null only when user is super_admin and testing) */
  roleOverride: string | null;
  login: (username: string, password: string, shopId?: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  hasPackage: (packages: string[]) => boolean;
  loading: boolean;
  refreshUser: (silent?: boolean) => Promise<void>;
  setRoleOverride: (role: string | null) => void;
  clearRoleOverride: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleOverride, setRoleOverrideState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem(ROLE_OVERRIDE_KEY);
    const v = saved && String(saved).trim() ? saved : null;
    if (v) setRoleOverrideState(v);
    sessionStorage.removeItem('crown-role');
    localStorage.removeItem('crown-role');
    localStorage.removeItem('cachedNav');
  }, []);

  const effectiveRole =
    user?.role === 'super_admin' && roleOverride && String(roleOverride).trim()
      ? roleOverride
      : (user?.role ?? null);

  const setRoleOverride = (role: string | null) => {
    const v = role && String(role).trim() ? role : null;
    setRoleOverrideState(v);
    if (typeof window !== 'undefined') {
      if (v) sessionStorage.setItem(ROLE_OVERRIDE_KEY, v);
      else sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
    }
    window.dispatchEvent(new Event('crown-role-override-changed'));
  };

  const clearRoleOverride = () => setRoleOverride(null);

  const refreshUser = async (silent: boolean = false) => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser && !token) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    if (!savedToken) {
      if (!silent) setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const response = await apiFetch('/auth/me', {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          const sid = Number(data.user?.shopId ?? data.user?.shop_id ?? NaN);
          if (Number.isFinite(sid) && sid > 0) {
            setStoredShopId(sid);
          }
        }
      } else {
        // stale/invalid token: clear and redirect to login
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
        setStoredShopId(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      // on error, clear and redirect to login to avoid phantom sessions
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
      setStoredShopId(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token) return;
    let active = true;
    const ping = async () => {
      if (!active) return;
      try {
        await apiRequest('/system/heartbeat', { method: 'POST' });
      } catch {
        // ignore heartbeat failures
      }
    };
    ping();
    const id = window.setInterval(ping, 60000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [token]);

  const login = async (username: string, password: string, shopId?: string) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: {
        ...(shopId ? { 'X-Shop-Id': String(shopId).trim() } : {}),
      },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const raw = await response.text();
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      if (isJson && raw) {
        try {
          const err = JSON.parse(raw);
          if (err?.error === 'SHOP_ID_REQUIRED') {
            const e: any = new Error(err?.message_en || err?.error || 'SHOP_ID_REQUIRED');
            e.code = 'SHOP_ID_REQUIRED';
            e.message_ar = err?.message_ar;
            e.message_en = err?.message_en;
            throw e;
          }
          throw new Error(err?.error || err?.message || 'Login failed');
        } catch (e: any) {
          if (e?.code === 'SHOP_ID_REQUIRED') throw e;
          throw new Error('Login failed');
        }
      }
      // Never show HTML or raw non-JSON body to user
      throw new Error('Server error. Please try again.');
    }

    const data = raw ? JSON.parse(raw) : {};
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // ---- Persist active shop id for API requests ----
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const sid = Number(u?.shopId ?? u?.shop_id ?? NaN);
      if (Number.isFinite(sid) && sid > 0) {
        setStoredShopId(sid);
      }
    } catch {}
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
    setStoredShopId(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const hasRole = (roles: string[]): boolean => {
    return effectiveRole ? roles.includes(effectiveRole) : false;
  };

  const hasPackage = (packages: string[]): boolean => {
    return user ? packages.includes(user.package) : false;
  };

  return (
    <AuthContext.Provider value={{ user, token, effectiveRole, roleOverride, login, logout, hasRole, hasPackage, loading, refreshUser, setRoleOverride, clearRoleOverride }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('access_token') ||
    window.sessionStorage.getItem('token') ||
    window.sessionStorage.getItem('access_token')
  );
}

export function getActiveShopId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = getStoredShopId();
    if (stored && stored > 0) return stored;
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const fromUser = Number(user?.shopId ?? user?.shop_id ?? NaN);
    if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
  } catch {}
  return null;
}

export function isShopMissingError(err: any): boolean {
  return err?.code === 'SHOP_ID_REQUIRED' || err?.message === 'SHOP_ID_REQUIRED';
}

export function getNoShopMessage(language: string): string {
  return language === 'ar' ? 'لا توجد بيانات / لم يتم اختيار متجر' : 'No data / shop not selected';
}

const SHOP_OPTIONAL_PREFIXES = [
  '/auth',
  '/public',
  '/storefront',
  '/health',
  '/setup-admin',
  '/admin/shops',
  '/system',
  '/licenses',
  '/models',
];

const isShopOptional = (url: string): boolean => {
  const path = String(url || '').split('?')[0];
  return SHOP_OPTIONAL_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

const resolveActiveShopId = (userObj?: any): number | null => {
  const stored = getStoredShopId();
  if (stored && stored > 0) return stored;
  const fromUser = Number(userObj?.shopId ?? userObj?.shop_id ?? NaN);
  if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
  return null;
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getStoredToken();
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const shopId = resolveActiveShopId(userObj);
  const branchId =
    typeof window !== 'undefined' && shopId
      ? localStorage.getItem(`crown-active-branch-${shopId}`)
      : null;

  if (!shopId && !isShopOptional(url)) {
    const err: any = new Error('SHOP_ID_REQUIRED');
    err.code = 'SHOP_ID_REQUIRED';
    throw err;
  }

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (shopId) headers.set('X-Shop-Id', String(shopId));
  if (branchId) headers.set('X-Branch-Id', String(branchId));
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const target = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  return fetch(target, {
    ...options,
    credentials: 'include',
    headers,
    cache: 'no-store',
  });
};

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await apiFetch(url, options);

  const raw = await response.text();

  if (response.status === 401) {
    // global 401 handler: clear auth and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
    setStoredShopId(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isJson = contentType.includes('application/json');
    let errorMessage = 'Request failed';

    if (isJson && raw) {
      try {
        const error = JSON.parse(raw);
        if (error.error === 'SHOP_ID_REQUIRED' || error.error === 'shopId is required') {
          errorMessage = 'SHOP_ID_REQUIRED';
        } else {
          errorMessage = error.error || error.message || errorMessage;
        }
      } catch {
        errorMessage = 'Request failed';
      }
    } else {
      // Non-JSON (e.g. HTML 404) - never show body to user
      errorMessage =
        response.status === 404
          ? 'Service not found. Please check that the backend is running.'
          : response.status === 500
          ? 'Server error. Please try again later.'
          : 'Request failed. Please try again.';
    }
    const err: any = new Error(errorMessage);
    err.status = response.status;
    err.statusText = response.statusText;
    err.endpoint = `${API_BASE_URL}${url}`;
    err.url = `${API_BASE_URL}${url}`;
    err.body = raw;
    throw err;
  }

  return raw ? JSON.parse(raw) : {};
};

