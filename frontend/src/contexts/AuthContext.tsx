'use client';

import { authAPI, User, UserSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessions: UserSession[];
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, role: 'user' | 'admin' | 'uploader') => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authAPI.isAuthenticated()) {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authAPI.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await authAPI.login({ username, password });
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      
      // Trigger location permission modal after successful login
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).triggerLocationPermission) {
          (window as any).triggerLocationPermission();
        }
      }, 1500); // Delay to ensure user is redirected and page is loaded
      
      // Redirect based on user role
      if (userData.role === 'admin' || userData.role === 'uploader') {
        router.push('/upload'); // Admin and uploader go to upload page
      } else {
        router.push('/chat'); // User goes to chat page
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Login failed. Please check your credentials and try again.');
      }
    }
  };

  const register = async (username: string, password: string, role: 'user' | 'admin' | 'uploader') => {
    try {
      await authAPI.register({ username, password, role });
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSessions([]);
      router.push('/auth/login');
    }
  };

  const logoutAllDevices = async () => {
    try {
      await authAPI.logoutAllDevices();
      setUser(null);
      setSessions([]);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout all devices error:', error);
      throw error;
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await authAPI.revokeSession(sessionId);
      // Remove session from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  };

  const refreshSessions = async () => {
    try {
      if (user) {
        const userSessions = await authAPI.getActiveSessions();
        const currentSessionId = authAPI.getSessionId();
        
        // Mark current session
        const sessionsWithCurrent = userSessions.map(session => ({
          ...session,
          is_current: session.id === currentSessionId
        }));
        
        setSessions(sessionsWithCurrent);
      }
    } catch (error) {
      console.error('Refresh sessions error:', error);
    }
  };

  // Load sessions when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      refreshSessions();
    }
  }, [user, loading]);

  const value: AuthContextType = {
    user,
    loading,
    sessions,
    login,
    register,
    logout,
    logoutAllDevices,
    revokeSession,
    refreshSessions,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
