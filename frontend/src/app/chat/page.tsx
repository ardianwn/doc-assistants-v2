import ProtectedRoute from '@/components/ProtectedRoute'
import dynamic from 'next/dynamic'

const ChatPage = dynamic(() => import('@/components/ChatPage'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen bg-slate-50 items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading chat interface...</p>
      </div>
    </div>
  )
})

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <div className="min-h-screen bg-slate-50">
        <ChatPage />
      </div>
    </ProtectedRoute>
  )
} 
