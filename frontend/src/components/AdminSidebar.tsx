'use client'

import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ChevronUp, FileText, HelpCircle, LogOut, Monitor, Palette, PanelLeft, PanelLeftClose, Settings, Shield, Upload, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import SettingsModal from './SettingsModal'

interface AdminSidebarProps {
  isOpen: boolean
  onClose?: () => void
  onToggle?: () => void
}

export default function AdminSidebar({
  isOpen,
  onClose,
  onToggle
}: AdminSidebarProps) {
  const { logout, user } = useAuth()
  const pathname = usePathname()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'personalization' | 'settings' | 'help'>('personalization')

  // Create safe callback wrappers
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  const handleToggle = useCallback(() => {
    onToggle?.()
  }, [onToggle])

  // Close sidebar when clicking outside on mobile (only when fully open)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 768 // Only on mobile
      ) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClose])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
      if (event.key === 'Escape' && isProfileDropdownOpen) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isProfileDropdownOpen, handleClose])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileDropdownOpen && sidebarRef.current?.contains(event.target as Node)) {
        const target = event.target as Element
        if (!target.closest('[data-profile-dropdown]')) {
          setIsProfileDropdownOpen(false)
        }
      }
    }

    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileDropdownOpen])

  // Navigation items for admin
  const navigationItems = [
    {
      name: 'Upload Documents',
      href: '/upload',
      icon: Upload,
      roles: ['admin', 'uploader'] // Available for both admin and uploader
    },
    {
      name: 'User Management',
      href: '/admin',
      icon: Shield,
      roles: ['admin'] // Only admin
    },
    {
      name: 'Docs Management',
      href: '/admin/docs',
      icon: FileText,
      roles: ['admin'] // Only admin
    },
    {
      name: 'Session Management',
      href: '/admin/sessions',
      icon: Monitor,
      roles: ['admin'] // Only admin
    }
  ];

  // Filter navigation items based on user role
  const filteredNavigationItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  return (
    <>
      {/* Mobile Overlay - only show when sidebar is fully open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={handleClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out z-50",
          "fixed md:relative h-full",
          isOpen 
            ? "w-80 md:w-64 translate-x-0" 
            : "w-0 -translate-x-full md:translate-x-0 md:w-16 overflow-hidden"
        )}
      >
         {/* Header - Open State */}
         {isOpen && (
           <div className="mt-4 p-1">
             <div className="flex items-center justify-between">
               <div className="flex-1">
                 <div className="flex items-center">
                   <img 
                     src="/icon/icon1.png" 
                     alt="DocAi Logo" 
                     className="w-8 h-8 ml-2 mr-3"
                   />
                 </div>
               </div>
               <div className="flex items-center gap-1">
                 {/* Toggle button - visible on all screen sizes */}
                 <button
                   onClick={handleToggle}
                   className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-colors"
                   title="Close sidebar"
                 >
                   <PanelLeftClose className="w-7 h-5"/>
                 </button>
               </div>
             </div>
           </div>
         )}

         {/* Header - Collapsed State (Desktop Only) */}
         {!isOpen && (
           <div className="hidden md:flex flex-col h-full">
             {/* Logo */}
             <div className="p-2 flex justify-center">
               <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                 <img 
                   src="/icon/icon1.png" 
                   alt="DocAi Logo" 
                   className="w-8 h-8"
                 />
               </div>
             </div>
             
             {/* Navigation Icons */}
             <div className="flex-1 flex flex-col items-center space-y-3 p-2 pt-4">
               {filteredNavigationItems.map((item) => {
                 const Icon = item.icon
                 const isActive = pathname === item.href
                 
                 return (
                   <Link
                     key={item.name}
                     href={item.href}
                     className={cn(
                       "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                       isActive
                         ? "bg-[#E5F5F6] dark:bg-[#1A829B]/20 text-[#146B7C] dark:text-[#1A829B]"
                         : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                     )}
                     title={item.name}
                   >
                     <Icon className="w-5 h-5" />
                   </Link>
                 )
               })}
             </div>
             
             {/* Bottom section */}
             <div className="flex flex-col items-center space-y-3 p-2">
               {/* Toggle button for collapsed state */}
               <button
                 onClick={handleToggle}
                 className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                 title="Open sidebar"
               >
                 <PanelLeft className="w-5 h-5" />
               </button>
               
               {/* User Profile */}
              {user && (
                user.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border border-[#B3E5E8]"
                  />
                ) : (
                  <div className="w-10 h-10 bg-[#B3E5E8] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#1A829B]" />
                  </div>
                )
              )}
             </div>
           </div>
         )}
        
        {/* Navigation Menu */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="space-y-2">
                {filteredNavigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group p-3 rounded-lg transition-all cursor-pointer border flex items-center gap-3",
                        isActive
                          ? "bg-[#E5F5F6] dark:bg-[#1A829B]/20 border-[#7DC4CD] dark:border-[#1A829B] text-[#146B7C] dark:text-[#1A829B]"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {item.name}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Profile Dropdown */}
        {isOpen && user && (
          <div className="p-4 relative" data-profile-dropdown>
            {/* Profile Button */}
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border border-[#B3E5E8] flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-[#B3E5E8] rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#1A829B]" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user.role}
                </p>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
                isProfileDropdownOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-2 z-50">
                {/* Profile Header */}
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setActiveSettingsTab('personalization')
                      setIsSettingsModalOpen(true)
                      setIsProfileDropdownOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Palette className="w-4 h-4" />
                    Personalization
                  </button>
                  
                  <button 
                    onClick={() => {
                      setActiveSettingsTab('settings')
                      setIsSettingsModalOpen(true)
                      setIsProfileDropdownOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  
                  <button 
                    onClick={() => {
                      setActiveSettingsTab('help')
                      setIsSettingsModalOpen(true)
                      setIsProfileDropdownOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Help
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-1">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false)
                      logout()
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        activeTab={activeSettingsTab}
        onClose={() => setIsSettingsModalOpen(false)}
        onTabChange={setActiveSettingsTab}
      />
    </>
  )
}
