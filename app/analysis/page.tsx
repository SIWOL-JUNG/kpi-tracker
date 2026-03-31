'use client'

import { useState } from 'react'
import { ClipboardList, FileBarChart, History } from 'lucide-react'
import dynamic from 'next/dynamic'

// 기존 페이지를 동적 임포트
const SummaryContent = dynamic(() => import('../summary/page'), { ssr: false })
const MonthlyContent = dynamic(() => import('../monthly/page'), { ssr: false })
const HistoryContent = dynamic(() => import('../history/page'), { ssr: false })

const TABS = [
  { key: 'summary', label: '주간 요약', icon: ClipboardList },
  { key: 'monthly', label: '월간 리포트', icon: FileBarChart },
  { key: 'history', label: 'KPI 히스토리', icon: History },
] as const

type TabKey = typeof TABS[number]['key']

export default function AnalysisPage() {
  const [tab, setTab] = useState<TabKey>('summary')

  return (
    <div>
      {/* 탭 바 */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <div className="flex gap-2 mb-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border-2 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 - 각 페이지가 자체 컨테이너를 가짐 */}
      {tab === 'summary' && <SummaryContent />}
      {tab === 'monthly' && <MonthlyContent />}
      {tab === 'history' && <HistoryContent />}
    </div>
  )
}
