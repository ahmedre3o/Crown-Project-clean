'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '../api-config';

interface User {
  id: number;
  username: string;
  role: 'super_admin' | 'shop_owner' | 'cashier' | 'warehouse';
  package: 'bronze' | 'silver' | 'gold';
  shopId?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  hasPackage: (packages: string[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        }
      } catch (error) {
        // ignore refresh errors
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
      body: JSON.stringify({ username, password }),
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
  };

  const hasRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasPackage = (packages: string[]): boolean => {
    return user ? packages.includes(user.package) : false;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole, hasPackage, loading }}>
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
  const shopId = storedUser ? JSON.parse(storedUser).shopId : null;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(shopId && { 'x-shop-id': String(shopId) }),
      ...options.headers,
    },
  });

  const raw = await response.text();
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const error = raw ? JSON.parse(raw) : {};
      errorMessage = error.error || errorMessage;
    } catch {
      if (raw) errorMessage = raw;
    }
    throw new Error(errorMessage);
  }

  return raw ? JSON.parse(raw) : {};
};

