'use client';

import { Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // If not authenticated, redirect to login
        router.push('/auth/login');
      } else if (user) {
        // If authenticated, redirect based on role
        if (user.role === 'admin' || user.role === 'uploader') {
          router.push('/upload');
        } else {
          router.push('/chat');
        }
      }
    }
  }, [user, loading, isAuthenticated, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loading size="lg" text="Loading..." />
        </div>
      </div>
    );
  }

  return null; // Will redirect
}
