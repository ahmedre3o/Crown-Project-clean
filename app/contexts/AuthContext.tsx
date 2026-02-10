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
  login: (username: string, password: string) => Promise<void>;
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
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
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

  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, username, password }),
    });

    const raw = await response.text();
    if (!response.ok) {
      try {
        const error = JSON.parse(raw);
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

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const isSuperAdmin = userObj?.role === 'super_admin';
  // Role override only affects UI; API always uses real role for security
  const shopId =
    userObj?.shopId ?? userObj?.shop_id ??
    (isSuperAdmin && typeof window !== 'undefined' ? localStorage.getItem('crown-active-shop-id') : null);
  const branchId =
    typeof window !== 'undefined' && shopId
      ? localStorage.getItem(`crown-active-branch-${shopId}`)
      : null;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(shopId && { 'x-shop-id': String(shopId) }),
      ...(branchId && { 'x-branch-id': String(branchId) }),
      ...options.headers,
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
        errorMessage = response.status === 404
          ? 'Service not found. Please check that the backend is running.'
          : response.status === 500
          ? 'Server error. Please try again later.'
          : 'Request failed. Please try again.';
      } else if (raw) errorMessage = raw.slice(0, 200);
    }
    throw new Error(errorMessage);
  }

  return raw ? JSON.parse(raw) : {};
};

