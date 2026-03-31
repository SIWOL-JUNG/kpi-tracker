'use client'

interface LoadingSpinnerProps {
  message?: string
}

// 로딩 스피너
export default function LoadingSpinner({ message = '데이터를 불러오는 중...' }: LoadingSpinnerProps) {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      {message && <p className="mt-3 text-gray-500 text-sm">{message}</p>}
    </div>
  )
}
