'use client'

import AdminSidebar from '@/components/AdminSidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Menu } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const UploadPage = dynamic(() => import('@/components/UploadPage'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-800 items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#1A829B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading upload page...</p>
      </div>
    </div>
  )
})

export default function Page() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      // Auto-open sidebar on desktop, auto-close on mobile
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'uploader']}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-800 relative">
        {/* Sidebar Component */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onToggle={toggleSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with toggle button */}
          <div className="bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Mobile toggle button - only visible on mobile */}
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <UploadPage />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 
