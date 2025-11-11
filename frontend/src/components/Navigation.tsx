'use client';

import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, MessageSquare, Settings, Shield, Upload, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Navigation items based on user role
  const getNavigationItems = () => {
    if (!user) return [];
    
    const commonItems = [
      { name: 'Sessions', href: '/sessions', icon: Settings },
    ];
    
    if (user.role === 'admin') {
      return [
        { name: 'Upload Documents', href: '/upload', icon: Upload },
        { name: 'Management User', href: '/admin', icon: Shield },
        ...commonItems,
      ];
    } else if (user.role === 'uploader') {
      return [
        { name: 'Upload Documents', href: '/upload', icon: Upload },
        ...commonItems,
      ];
    } else {
      return [
        { name: 'Chat with AI', href: '/chat', icon: MessageSquare },
        ...commonItems,
      ];
    }
  };

  const navigation = getNavigationItems();

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link 
                href={user?.role === 'admin' || user?.role === 'uploader' ? '/upload' : '/chat'} 
                className="text-xl font-bold text-[#1A829B] dark:text-[#4DA8B8]"
              >
                AI Chat Assistant
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      pathname === item.href
                        ? 'border-[#1A829B] dark:border-[#4DA8B8] text-gray-900 dark:text-gray-100'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                  <User className="h-4 w-4" />
                  <span>{user?.username}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user?.role === 'admin' 
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' 
                      : user?.role === 'uploader'
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  }`}>
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className='text-sm'>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 
