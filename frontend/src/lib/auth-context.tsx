'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, getAuthToken, setAuthSession, clearAuthSession, getCurrentUser } from './api';

export type UserRole = 'ADMIN' | 'HR' | 'CANDIDATE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  candidateProfile?: any;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = getAuthToken();
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest<User>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        setToken(savedToken);
        setAuthSession(savedToken, res.data);
      } else {
        // Token không hợp lệ hoặc đã hết hạn
        clearAuthSession();
        setUser(null);
        setToken(null);
      }
    } catch {
      // Fallback từ cache nếu mạng lỗi tạm thời
      const cached = getCurrentUser();
      if (cached) {
        setUser(cached);
        setToken(savedToken);
      } else {
        clearAuthSession();
        setUser(null);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (newToken: string, newUser: User) => {
    setAuthSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
