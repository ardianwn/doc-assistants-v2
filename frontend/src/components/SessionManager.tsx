'use client'

import { Loading } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { Clock, LogOut, MapPin, Monitor, RefreshCw, Shield, Smartphone, Tablet } from 'lucide-react'
import { useState } from 'react'

const getDeviceIcon = (deviceInfo: string) => {
  const info = deviceInfo.toLowerCase()
  if (info.includes('mobile') || info.includes('iphone') || info.includes('android')) {
    return <Smartphone className="w-4 h-4" />
  }
  if (info.includes('tablet') || info.includes('ipad')) {
    return <Tablet className="w-4 h-4" />
  }
  return <Monitor className="w-4 h-4" />
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export default function SessionManager() {
  const { sessions, revokeSession, logoutAllDevices, refreshSessions } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setLoading(sessionId)
      await revokeSession(sessionId)
    } catch (error) {
      console.error('Failed to revoke session:', error)
      // You can add toast notification here
    } finally {
      setLoading(null)
    }
  }

  const handleLogoutAll = async () => {
    try {
      setLoading('all')
      await logoutAllDevices()
    } catch (error) {
      console.error('Failed to logout from all devices:', error)
      // You can add toast notification here
    } finally {
      setLoading(null)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await refreshSessions()
    } catch (error) {
      console.error('Failed to refresh sessions:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Active Sessions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your active login sessions across different devices
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {sessions.length > 1 && (
            <Button
              onClick={handleLogoutAll}
              disabled={loading === 'all'}
              variant="destructive"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading === 'all' ? 'Logging out...' : 'Logout All Devices'}
            </Button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Active Sessions</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have any active sessions at the moment.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getDeviceIcon(session.device_info || '')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.device_info || 'Unknown Device'}
                      </h3>
                      {session.is_current && (
                        <Badge variant="success" size="sm">
                          Current Session
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {session.ip_address && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <MapPin className="w-3 h-3 mr-1" />
                          {session.ip_address}
                          {session.location && ` • ${session.location}`}
                        </div>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        Last active: {formatTimeAgo(session.last_active)}
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Session started: {formatTimeAgo(session.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {!session.is_current && (
                    <Button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={loading === session.id}
                      variant="outline"
                      size="sm"
                    >
                      {loading === session.id ? (
                        <Loading size="sm" />
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <Shield className="w-5 h-5 text-blue-400 dark:text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Security Tip</h3>
            <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              <p>
                If you see any sessions you don't recognize, revoke them immediately. 
                Always log out from shared or public computers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
