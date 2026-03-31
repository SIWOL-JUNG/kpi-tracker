'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line, Legend } from 'recharts'
import { Report } from '@/types'

interface TeamBarChartProps {
  teamSummaries: Array<{
    name: string
    avgAchievement: string
  }>
}

// 팀별 달성률 바 차트
export function TeamBarChart({ teamSummaries }: TeamBarChartProps) {
  const data = teamSummaries
    .map(t => ({
      name: t.name,
      달성률: parseFloat(t.avgAchievement),
    }))
    .sort((a, b) => b.달성률 - a.달성률)

  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-bold text-gray-800 mb-3">팀별 평균 달성률</h4>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 'auto']} unit="%" fontSize={12} />
          <YAxis type="category" dataKey="name" fontSize={12} width={80} />
          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, '달성률']} />
          <ReferenceLine x={100} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '100%', position: 'top', fontSize: 10 }} />
          <Bar
            dataKey="달성률"
            radius={[0, 4, 4, 0]}
            fill="#3b82f6"
            label={{ position: 'right', fontSize: 11 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface KpiTrendChartProps {
  reports: Report[]
  selectedKpiId: string
  kpiName: string
}

// KPI별 주간 추이 라인 차트
export function KpiTrendChart({ reports, selectedKpiId, kpiName }: KpiTrendChartProps) {
  // 선택된 KPI의 보고서를 날짜순 정렬 (최근 8주)
  const kpiReports = reports
    .filter(r => r.kpi_id === selectedKpiId)
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .slice(-8)

  if (kpiReports.length < 2) return null

  const data = kpiReports.map(r => ({
    date: r.report_date.substring(5), // MM-DD
    주간달성률: r.weekly_achievement_rate ?? 0,
    월간달성률: r.monthly_achievement_rate ?? 0,
  }))

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">{kpiName}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis unit="%" fontSize={11} />
          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`]} />
          <Legend fontSize={12} />
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="월간달성률" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="주간달성률" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
