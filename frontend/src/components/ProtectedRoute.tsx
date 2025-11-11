'use client';

import { Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'admin' | 'uploader')[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['user', 'admin', 'uploader'],
  redirectTo 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // If user exists but role is not allowed
      if (user && !allowedRoles.includes(user.role as 'user' | 'admin' | 'uploader')) {
        // Redirect based on user role
        if (user.role === 'admin' || user.role === 'uploader') {
          router.push('/upload');
        } else {
          router.push('/chat');
        }
        return;
      }
    }
  }, [user, loading, isAuthenticated, allowedRoles, router, redirectTo]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  // If not authenticated or role not allowed, don't render children
  if (!isAuthenticated || (user && !allowedRoles.includes(user.role as 'user' | 'admin' | 'uploader'))) {
    return null;
  }

  return <>{children}</>;
} 
