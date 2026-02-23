'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../api-config';

const ROLE_OVERRIDE_KEY = 'crown-role-override';

interface User {
  id: number;
  username: string;
  role: 'super_admin' | 'shop_owner' | 'branch_manager' | 'multi_branch_manager' | 'cashier' | 'warehouse';
  package: 'bronze' | 'silver' | 'gold';
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

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  const refreshUser = async () => {
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiFetch('/auth/me', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          skipShopId: true,
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } else {
          // stale/invalid token: clear and redirect to login
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
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
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };
    refreshUser();
  }, []);

  const login = async (username: string, password: string, shopId?: string) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(shopId ? { 'X-Shop-Id': String(shopId).trim() } : {}),
      },
      body: JSON.stringify({ username: username.trim(), password }),
      skipAuth: true,
      skipShopId: true,
    });

    const raw = await response.text();
    if (!response.ok) {
      try {
        const error = JSON.parse(raw);
        if (error?.error === 'SHOP_ID_REQUIRED') {
          const e: any = new Error(error?.message_en || error?.error || 'SHOP_ID_REQUIRED');
          e.code = 'SHOP_ID_REQUIRED';
          e.message_ar = error?.message_ar;
          e.message_en = error?.message_en;
          throw e;
        }

        throw new Error(error.error || 'Login failed');
      } catch {
        throw new Error(raw || 'Login failed');
      }
    }

    const data = raw ? JSON.parse(raw) : {};
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // ---- Persist activeShopId for API requests ----     try {       const u = JSON.parse(localStorage.getItem('user') || 'null');       const sid = Number(u?.shopId ?? u?.shop_id ?? NaN);       if (Number.isFinite(sid) && sid > 0) localStorage.setItem('activeShopId', String(sid));     } catch {}
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
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
    <AuthContext.Provider value={{ user, token, effectiveRole, roleOverride, login, logout, hasRole, hasPackage, loading, setRoleOverride, clearRoleOverride }}>
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
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("access_token") ||
    window.sessionStorage.getItem("token") ||
    window.sessionStorage.getItem("access_token")
  );
}

export function getActiveShopId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const fromUser = Number(user?.shopId ?? user?.shop_id ?? NaN);
    const fromStorage = Number(localStorage.getItem('activeShopId') ?? NaN);
    if (Number.isFinite(fromStorage) && fromStorage > 0) return fromStorage;
    if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
  } catch {}
  return null;
}

function isShopRequiredPath(url: string): boolean {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url;
    const safe = path.startsWith('/') ? path : `/${path}`;
    if (safe.startsWith('/auth') || safe.startsWith('/public') || safe.startsWith('/health') || safe.startsWith('/setup-admin')) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function isShopMissingError(err: any): boolean {
  return err?.code === 'SHOP_ID_REQUIRED' || err?.message === 'SHOP_ID_REQUIRED';
}

export function getNoShopMessage(language: string): string {
  return language === 'ar' ? 'لا توجد بيانات / لم يتم اختيار متجر' : 'No data / shop not selected';
}

export type ApiFetchOptions = RequestInit & { skipAuth?: boolean; skipShopId?: boolean };

export const apiFetch = async (url: string, options: ApiFetchOptions = {}) => {
  const token = getStoredToken();
  const activeShopId = getActiveShopId();
  const { skipAuth, skipShopId, ...fetchOptions } = options;
  if (!skipShopId && token && isShopRequiredPath(url) && !activeShopId) {
    const err: any = new Error('SHOP_ID_REQUIRED');
    err.code = 'SHOP_ID_REQUIRED';
    throw err;
  }

  const headers: HeadersInit = {
    ...(fetchOptions.headers || {}),
  };
  if (!skipAuth && token) (headers as any).Authorization = `Bearer ${token}`;
  if (!skipShopId && activeShopId) (headers as any)['X-Shop-Id'] = String(activeShopId);

  const target = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  return fetch(target, {
    ...fetchOptions,
    credentials: 'include',
    headers,
  });
};

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const storedUser = localStorage.getItem('user');
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const isSuperAdmin = userObj?.role === 'super_admin';
  const shopId =
    userObj?.shopId ?? userObj?.shop_id ??
    (isSuperAdmin && typeof window !== 'undefined' ? localStorage.getItem('crown-active-shop-id') : null);
  const branchId =
    typeof window !== 'undefined' && shopId
      ? localStorage.getItem(`crown-active-branch-${shopId}`)
      : null;
  const response = await apiFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(branchId && { 'X-Branch-Id': String(branchId) }),
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();

  if (response.status === 401) {
    // global 401 handler: clear auth and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem(ROLE_OVERRIDE_KEY);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const error = raw ? JSON.parse(raw) : {};
      if (error.error === 'SHOP_ID_REQUIRED') {
        errorMessage = 'SHOP_ID_REQUIRED';
      } else {
        errorMessage = error.error || error.message || errorMessage;
      }
    } catch {
      if (raw && raw.trim().startsWith('{')) errorMessage = raw;
      else if (raw && raw.includes('<html')) {
        errorMessage =
          response.status === 404
            ? 'Service not found. Please check that the backend is running.'
            : response.status === 500
            ? 'Server error. Please try again later.'
            : 'Request failed. Please try again.';
      } else if (raw) errorMessage = raw.slice(0, 200);
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

