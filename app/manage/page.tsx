'use client'

import { useState } from 'react'
import { Target, Database, BookOpen } from 'lucide-react'
import dynamic from 'next/dynamic'

const KpiContent = dynamic(() => import('../kpi/page'), { ssr: false })
const MigrateContent = dynamic(() => import('../migrate/page'), { ssr: false })
const ManualContent = dynamic(() => import('../manual/page'), { ssr: false })

const TABS = [
  { key: 'kpi', label: 'KPI 관리', icon: Target },
  { key: 'data', label: '데이터', icon: Database },
  { key: 'manual', label: '매뉴얼', icon: BookOpen },
] as const

type TabKey = typeof TABS[number]['key']

export default function ManagePage() {
  const [tab, setTab] = useState<TabKey>('kpi')

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <div className="flex gap-2 mb-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-300 border-2 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'kpi' && <KpiContent />}
      {tab === 'data' && <MigrateContent />}
      {tab === 'manual' && <ManualContent />}
    </div>
  )
}
