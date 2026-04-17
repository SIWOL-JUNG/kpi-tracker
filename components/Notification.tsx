'use client'

import { Check, AlertCircle, X } from 'lucide-react'

interface NotificationProps {
  type: 'success' | 'error'
  message: string
  onClose?: () => void
}

// 성공/에러 토스트 알림
export default function Notification({ type, message, onClose }: NotificationProps) {
  const styles = type === 'success'
    ? 'bg-green-900/30 text-green-400 border-green-700'
    : 'bg-red-900/30 text-red-400 border-red-700'

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border ${styles}`}>
      {type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
