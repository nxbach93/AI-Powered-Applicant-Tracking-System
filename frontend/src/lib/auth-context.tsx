'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, getAuthToken, setAuthSession, clearAuthSession, getCurrentUser } from './api';

export type UserRole = 'ADMIN' | 'HR' | 'CANDIDATE';

export interface CandidateProfile {
  id?: string;
  userId?: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
  summary?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  resumeUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  candidateProfile?: CandidateProfile | null;
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
  const [user, setUser] = useState<User | null>(() => {
    return getCurrentUser<User>();
  });
  const [token, setToken] = useState<string | null>(() => {
    return getAuthToken();
  });
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
      const cached = getCurrentUser<User>();
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

  // Khởi tạo trạng thái phiên đăng nhập khi mount và lắng nghe đồng bộ giữa các tabs
  useEffect(() => {
    // Xác thực lại với máy chủ qua /api/auth/me
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();

    // Đồng bộ trạng thái khi người dùng đăng nhập hoặc đăng xuất ở tab khác
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ats_token' || e.key === 'ats_user') {
        refreshUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshUser]);

  const login = (newToken: string, newUser: User) => {
    // Cập nhật localStorage và React state ngay lập tức
    setAuthSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);

    // Đồng bộ thêm thông tin chi tiết (CandidateProfile) từ /api/auth/me ngầm
    apiRequest<User>('/auth/me', {
      headers: { Authorization: `Bearer ${newToken}` }
    })
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
          setAuthSession(newToken, res.data);
        }
      })
      .catch(() => {
        // Giữ nguyên thông tin đã nhận từ login
      });
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setIsLoading(false);
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
