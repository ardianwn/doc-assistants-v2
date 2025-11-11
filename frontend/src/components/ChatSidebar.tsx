'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ChatSession } from '@/lib/chatService'
import { cn } from '@/lib/utils'
import { ChevronUp, HelpCircle, History, LogOut, Palette, PanelLeft, PanelLeftClose, Plus, Settings, Trash2, User, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import SettingsModal from './SettingsModal'

interface ChatSidebarProps {
  isOpen: boolean
  chatSessions: ChatSession[]
  currentSessionId: string
  // Use callback patterns to avoid serialization issues
  onClose?: () => void
  onToggle?: () => void
  onStartNewChat?: () => void
  onSwitchSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onClearAllSessions?: () => void
  onRefreshHistory?: () => void
}

export default function ChatSidebar({
  isOpen,
  chatSessions,
  currentSessionId,
  onClose,
  onToggle,
  onStartNewChat,
  onSwitchSession,
  onDeleteSession,
  onClearAllSessions,
  onRefreshHistory
}: ChatSidebarProps) {
  const { logout, user } = useAuth()
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

  const handleStartNewChat = useCallback(() => {
    onStartNewChat?.()
  }, [onStartNewChat])

  const handleSwitchSession = useCallback((sessionId: string) => {
    onSwitchSession?.(sessionId)
    // Close sidebar on mobile after selecting
    if (window.innerWidth < 768) {
      onClose?.()
    }
  }, [onSwitchSession, onClose])

  const handleDeleteSession = useCallback((sessionId: string) => {
    onDeleteSession?.(sessionId)
  }, [onDeleteSession])

  const handleClearAllSessions = useCallback(() => {
    onClearAllSessions?.()
  }, [onClearAllSessions])

  const handleRefreshHistory = useCallback(() => {
    onRefreshHistory?.()
  }, [onRefreshHistory])

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
         {/* Header */}
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
                   className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
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
           <div className="hidden md:flex flex-col items-center space-y-3 flex-1 p-2">
             {/* Logo */}
             <div className="w-8 h-8  rounded-lg flex items-center justify-center">
               <img 
                 src="/icon/icon1.png" 
                 alt="DocAi Logo" 
                 className="w-8 h-8"
               />
             </div>
             
             {/* New Chat Button */}
             <button
               onClick={handleStartNewChat}
               className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
               title="New Chat"
             >
               <Plus className="w-5 h-5" />
             </button>

             {/* Spacer */}
             <div className="flex-1"></div>
             
             
             {/* Toggle button for collapsed state */}
             <button
               onClick={handleToggle}
               className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors"
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
         )}
        
        {/* New Chat Button */}
        {isOpen && (
          <div className="p-4">
            <button
              onClick={handleStartNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors text-sm"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>
        )}

        {/* Chat Sessions */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Recent Chats
              </h3>
              {chatSessions.length > 0 && (
                <button
                  onClick={handleClearAllSessions}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Clear all sessions"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {chatSessions.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No chat sessions yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Start a new conversation to begin
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group p-3 rounded-lg transition-all cursor-pointer border",
                      session.id === currentSessionId
                          ? "bg-[#E5F5F6] dark:bg-[#1A829B]/20 border-[#7DC4CD] dark:border-[#1A829B] text-[#146B7C] dark:text-[#1A829B]"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    )}
                    onClick={() => handleSwitchSession(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">
                          <span className="text-sm truncate block">
                            {session.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {session.lastUpdated.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSession(session.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete session"
                      >
                        <Trash2 className="w-3 h-3"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
