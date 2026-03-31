'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BatchReportRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/reports')
  }, [router])
  return <div className="text-center py-12 text-gray-400">리다이렉트 중...</div>
}
