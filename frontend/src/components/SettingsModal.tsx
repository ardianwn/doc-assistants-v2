'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  HelpCircle,
  Monitor,
  Moon,
  Palette,
  Settings as SettingsIcon,
  Shield,
  Sun,
  User,
  X
} from 'lucide-react'
import { useState } from 'react'
import AccountSettingsModal from './AccountSettingsModal'
import ContactSupportModal from './ContactSupportModal'
import PrivacySecurityModal from './PrivacySecurityModal'

interface SettingsModalProps {
  isOpen: boolean
  activeTab: 'personalization' | 'settings' | 'help'
  onClose: () => void
  onTabChange?: (tab: 'personalization' | 'settings' | 'help') => void
}

export default function SettingsModal({ isOpen, activeTab, onClose, onTabChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const [openModal, setOpenModal] = useState<string | null>(null)

  if (!isOpen) return null

  const handleModalOpen = (modalType: string) => {
    setOpenModal(modalType)
  }

  const handleModalClose = () => {
    setOpenModal(null)
  }

  const tabs = [
    { id: 'personalization', label: 'Personalization', icon: Palette },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ]


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] sm:h-[80vh] overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Sidebar */}
          <div className="w-full sm:w-64 bg-gray-50 dark:bg-gray-900 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 p-4 sm:flex-shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id as 'personalization' | 'settings' | 'help')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm sm:text-base",
                      isActive
                        ? "bg-[#1A829B] text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
            {/* Personalization Tab */}
            {activeTab === 'personalization' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Personalization</h3>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                        theme === 'light'
                          ? "border-[#1A829B] bg-[#1A829B]/10 text-[#1A829B]"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                        theme === 'dark'
                          ? "border-[#1A829B] bg-[#1A829B]/10 text-[#1A829B]"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                        theme === 'system'
                          ? "border-[#1A829B] bg-[#1A829B]/10 text-[#1A829B]"
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <Monitor className="w-4 h-4" />
                      System
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Settings</h3>
                </div>

                {/* Account */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Account</h4>
                  <div className="space-y-4">
                    <button
                      onClick={() => handleModalOpen('account')}
                      className="w-full flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center text-left gap-3 min-w-0 flex-1">
                        <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">Profile</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Manage your profile information</p>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 flex-shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Privacy & Security */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Privacy & Security</h4>
                  <div className="space-y-4">
                    <button
                      onClick={() => handleModalOpen('privacy')}
                      className="w-full flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center text-left gap-3 min-w-0 flex-1">
                        <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">Data controls</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Manage your data and privacy settings</p>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 flex-shrink-0" />
                    </button>
                  </div>
                </div>

                
              </div>
            )}

            {/* Help Tab */}
            {activeTab === 'help' && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Help & Support</h3>
                </div>

                {/* FAQ */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Frequently Asked Questions</h4>
                  <div className="space-y-3">
                    <details className="group">
                      <summary className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base pr-2">How do I create a new chat?</span>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                      </summary>
                      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Click the "New Chat" button in the sidebar or use the keyboard shortcut Ctrl+N to start a new conversation.</p>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base pr-2">How do I upload documents?</span>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                      </summary>
                      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Navigate to the Upload page from the sidebar and drag & drop your files or click to browse. Supported formats include PDF, DOC, DOCX, and TXT.</p>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base pr-2">How do I change the theme?</span>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                      </summary>
                      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Go to Personalization settings and choose between Light, Dark, or System theme. The system option will automatically match your device's theme.</p>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Contact Support */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Contact Support</h4>
                  <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm sm:text-base">
                      Need more help? Our support team is here to assist you.
                    </p>
                    <button 
                      onClick={() => handleModalOpen('contact')}
                      className="w-full sm:w-auto px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors"
                    >
                      Contact Support
                    </button>
                  </div>
                </div>

                {/* Version Info */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">About</h4>
                  <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-[#1A829B] rounded-lg flex items-center justify-center flex-shrink-0">
                        <img 
                          src="/icon/icon1.png" 
                          alt="DocAi Logo" 
                          className="w-8 h-8"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">DocAI</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Version 1.0.0</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      An intelligent document processing and chat application powered by AI.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Components */}
      <AccountSettingsModal 
        isOpen={openModal === 'account'} 
        onClose={handleModalClose} 
      />
      <PrivacySecurityModal 
        isOpen={openModal === 'privacy'} 
        onClose={handleModalClose} 
      />
      <ContactSupportModal 
        isOpen={openModal === 'contact'} 
        onClose={handleModalClose} 
      />
    </div>
  )
}