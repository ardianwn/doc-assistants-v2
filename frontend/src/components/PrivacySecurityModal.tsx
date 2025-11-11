'use client'

import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Info,
  QrCode,
  Shield,
  Trash2,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface PrivacySecurityModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PrivacySecurityModal({ isOpen, onClose }: PrivacySecurityModalProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: 30,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special: true
    },
    login_attempts_limit: 5,
    data_retention_days: 365,
    ip_whitelist: [] as string[]
  })

  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [twoFactorData, setTwoFactorData] = useState<{
    secret: string
    qr_code: string
    backup_codes: string[]
  } | null>(null)
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const [showDisable2FA, setShowDisable2FA] = useState(false)

  // Load security settings on mount
  useEffect(() => {
    if (isOpen) {
      loadSecuritySettings()
    }
  }, [isOpen])

  const loadSecuritySettings = async () => {
    try {
      const response = await authAPI.getSecuritySettings()
      setSecuritySettings(response.settings)
    } catch (error: any) {
      toast.error('Failed to load security settings')
    }
  }

  const loadAuditLogs = async () => {
    try {
      const response = await authAPI.getAuditLogs(20, 0)
      setAuditLogs(response.logs)
    } catch (error: any) {
      toast.error('Failed to load audit logs')
    }
  }

  if (!isOpen) return null

  const handleSettingChange = (key: string, value: any) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      await authAPI.updateSecuritySettings(securitySettings)
      toast.success('Security settings updated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTwoFactorSetup = async () => {
    try {
      const response = await authAPI.setupTwoFactor()
      setTwoFactorData(response)
      setShowTwoFactorSetup(true)
    } catch (error: any) {
      toast.error('Failed to setup 2FA')
    }
  }

  const handleTwoFactorVerify = async () => {
    if (!twoFactorToken) {
      toast.error('Please enter the verification code')
      return
    }
    try {
      await authAPI.verifyTwoFactor(twoFactorToken)
      toast.success('2FA enabled successfully')
      setShowTwoFactorSetup(false)
      setTwoFactorToken('')
      loadSecuritySettings()
    } catch (error: any) {
      toast.error('Invalid verification code')
    }
  }

  const handleTwoFactorDisable = async () => {
    if (!twoFactorToken) {
      toast.error('Please enter the verification code')
      return
    }
    try {
      await authAPI.disableTwoFactor(twoFactorToken)
      toast.success('2FA disabled successfully')
      setTwoFactorToken('')
      loadSecuritySettings()
    } catch (error: any) {
      toast.error('Invalid verification code')
    }
  }

  const handleDataExport = async () => {
    try {
      const response = await authAPI.exportUserData({
        format: 'json',
        include_chat_history: true,
        include_upload_history: true,
        include_profile_data: true
      })
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `docai-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Data exported successfully')
    } catch (error: any) {
      toast.error('Failed to export data')
    }
  }

  const handleAccountDeletion = () => {
    if (showDeleteConfirm) {
      // Simulate account deletion
      alert('Account deletion request submitted. This action cannot be undone.')
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const handleViewAuditLogs = () => {
    setShowAuditLogs(true)
    loadAuditLogs()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#1A829B]" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Privacy & Security</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Personal Security Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Security Settings</h3>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {securitySettings.two_factor_enabled ? 'Enabled' : 'Add an extra layer of security to your account'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {securitySettings.two_factor_enabled ? (
                  <button
                    onClick={() => setShowDisable2FA(true)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={handleTwoFactorSetup}
                    className="px-3 py-1 text-sm bg-[#1A829B] text-white rounded-md hover:bg-[#146B7C] transition-colors"
                  >
                    Setup
                  </button>
                )}
              </div>
            </div>


          </div>

          {/* System Security Settings - Admin Only */}
          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">System Security Settings</h3>

              {/* Session Timeout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Session Timeout (minutes)
                </label>
                <select
                  value={securitySettings.session_timeout}
                  onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={0}>Never</option>
                </select>
              </div>

              {/* Password Policy */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Password Policy
                </label>
                <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Minimum Length</span>
                    <input
                      type="number"
                      value={securitySettings.password_policy.min_length}
                      onChange={(e) => handleSettingChange('password_policy', {
                        ...securitySettings.password_policy,
                        min_length: parseInt(e.target.value)
                      })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      min="6"
                      max="32"
                    />
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: 'require_uppercase', label: 'Require Uppercase' },
                      { key: 'require_lowercase', label: 'Require Lowercase' },
                      { key: 'require_numbers', label: 'Require Numbers' },
                      { key: 'require_special', label: 'Require Special Characters' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={securitySettings.password_policy[key as keyof typeof securitySettings.password_policy] as boolean}
                          onChange={(e) => handleSettingChange('password_policy', {
                            ...securitySettings.password_policy,
                            [key]: e.target.checked
                          })}
                          className="text-[#1A829B] focus:ring-[#1A829B]"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Login Attempts Limit */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Login Attempts Limit
                </label>
                <input
                  type="number"
                  value={securitySettings.login_attempts_limit}
                  onChange={(e) => handleSettingChange('login_attempts_limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                  min="3"
                  max="10"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Account will be locked after this many failed attempts</p>
              </div>

              {/* Data Retention */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Data Retention Period (days)
                </label>
                <input
                  type="number"
                  value={securitySettings.data_retention_days}
                  onChange={(e) => handleSettingChange('data_retention_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                  min="30"
                  max="3650"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data older than this will be automatically deleted</p>
              </div>

              {/* IP Whitelist - Admin Only */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  IP Whitelist
                </label>
                <div className="space-y-2">
                  {securitySettings.ip_whitelist.map((ip, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ip}
                        onChange={(e) => {
                          const newList = [...securitySettings.ip_whitelist]
                          newList[index] = e.target.value
                          handleSettingChange('ip_whitelist', newList)
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                        placeholder="192.168.1.1"
                      />
                      <button
                        onClick={() => {
                          const newList = securitySettings.ip_whitelist.filter((_, i) => i !== index)
                          handleSettingChange('ip_whitelist', newList)
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newList = [...securitySettings.ip_whitelist, '']
                      handleSettingChange('ip_whitelist', newList)
                    }}
                    className="px-3 py-2 text-sm text-[#1A829B] hover:bg-[#1A829B]/10 rounded-md transition-colors"
                  >
                    + Add IP Address
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only specified IP addresses will be allowed to access the system</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Actions</h3>

            {/* Export Data */}
            <button
              onClick={handleDataExport}
              className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-4"
            >
              <div className="flex items-center text-left gap-3">
                <Download className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-left text-gray-900 dark:text-gray-100">Export Data</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Download a copy of your data</p>
                </div>
              </div>
              <Info className="w-4 h-4 text-gray-400" />
            </button>

            {/* View Audit Logs - Admin Only */}
            {isAdmin && (
              <button
                onClick={handleViewAuditLogs}
                className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-4"
              >
                <div className="flex items-center text-left gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-left text-gray-900 dark:text-gray-100">View Audit Logs</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">View system activity logs</p>
                  </div>
                </div>
                <Info className="w-4 h-4 text-gray-400" />
              </button>
            )}

            {/* Delete Account */}
            <button
              onClick={handleAccountDeletion}
              className={cn(
                "w-full flex items-center text-left justify-between p-4 border rounded-lg transition-colors",
                showDeleteConfirm
                  ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              <div className="flex items-center gap-3">
                <Trash2 className={cn("w-5 h-5", showDeleteConfirm ? "text-red-500" : "text-gray-400")} />
                <div>
                  <p className={cn("font-medium", showDeleteConfirm ? "text-red-700 dark:text-red-300" : "text-gray-900 dark:text-gray-100")}>
                    {showDeleteConfirm ? "Confirm Account Deletion" : "Delete Account"}
                  </p>
                  <p className={cn("text-sm", showDeleteConfirm ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400")}>
                    {showDeleteConfirm ? "This action cannot be undone. Click again to confirm." : "Permanently delete your account and all data"}
                  </p>
                </div>
              </div>
              {showDeleteConfirm ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <Info className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Two-Factor Setup Modal */}
      {showTwoFactorSetup && twoFactorData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-[#1A829B]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Setup Two-Factor Authentication</h3>
              </div>
              <button 
                onClick={() => setShowTwoFactorSetup(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="flex justify-center">
                    <img src={twoFactorData.qr_code} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter verification code
                  </label>
                  <input
                    type="text"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#1A829B] focus:border-transparent"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    <strong>Backup Codes:</strong> Save these codes in a safe place. You can use them if you lose access to your authenticator app.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {twoFactorData.backup_codes.map((code, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button 
                onClick={() => setShowTwoFactorSetup(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleTwoFactorVerify}
                className="px-4 py-2 bg-[#1A829B] text-white rounded-lg hover:bg-[#146B7C] transition-colors"
              >
                Verify & Enable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#1A829B]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audit Logs</h3>
              </div>
              <button 
                onClick={() => setShowAuditLogs(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{log.action}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Resource: {log.resource}</p>
                      {log.ip_address && <p>IP: {log.ip_address}</p>}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p>Details: {JSON.stringify(log.details)}</p>
                      )}
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No audit logs found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisable2FA && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Disable Two-Factor Authentication</h3>
              </div>
              <button 
                onClick={() => {
                  setShowDisable2FA(false)
                  setTwoFactorToken('')
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> Disabling 2FA will reduce the security of your account. You will no longer need a verification code to log in.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter verification code to confirm
                </label>
                <input
                  type="text"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => {
                  setShowDisable2FA(false)
                  setTwoFactorToken('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!twoFactorToken) {
                    toast.error('Please enter verification code')
                    return
                  }
                  handleTwoFactorDisable()
                  setShowDisable2FA(false)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
