import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const Loading = ({ className, size = 'md', text }: LoadingProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-[#1A829B] dark:text-[#4DA8B8]', sizeClasses[size])} />
      {text && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{text}</span>
      )}
    </div>
  )
}

export { Loading }

