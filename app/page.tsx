'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Team, KPI, Report, Comment } from '@/types'
import { groupKpisByCategoryProgram } from '@/lib/kpi-utils'
import { Search, Filter, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Users, RefreshCw, Download, AlertCircle, ChevronDown, ChevronRight, MessageSquare, Edit2 } from 'lucide-react'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { TeamBarChart, KpiTrendChart } from '@/components/Charts'
import { CeoBriefing } from '@/components/CeoBriefing'
import dynamic from 'next/dynamic'
const ActionsContent = dynamic(() => import('./actions/page'), { ssr: false })

// 날짜 헬퍼
const getDateRange = (preset: string) => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=일, 1=월, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  switch (preset) {
    case 'this_week': {
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      const friday = new Date(monday)
      friday.setDate(monday.getDate() + 4)
      return { start: formatDate(monday), end: formatDate(friday) }
    }
    case 'last_week': {
      const lastMonday = new Date(today)
      lastMonday.setDate(today.getDate() + mondayOffset - 7)
      const lastFriday = new Date(lastMonday)
      lastFriday.setDate(lastMonday.getDate() + 4)
      return { start: formatDate(lastMonday), end: formatDate(lastFriday) }
    }
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: formatDate(firstDay), end: formatDate(lastDay) }
    }
    case 'last_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: formatDate(firstDay), end: formatDate(lastDay) }
    }
    default:
      return { start: '', end: '' }
  }
}

const formatDate = (date: Date) => date.toISOString().split('T')[0]

// PDCA 카드 상단 색상 매핑
const PDCA_TOP_BORDER: Record<string, string> = {
  '전략': 'border-t-2 border-t-gray-400',
  'PLAN': 'border-t-2 border-t-blue-400',
  'DO': 'border-t-2 border-t-green-400',
  'CHECK': 'border-t-2 border-t-yellow-400',
  'ACTION': 'border-t-2 border-t-red-400',
  '해결과제': 'border-t-2 border-t-red-600',
  '필요한 도움': 'border-t-2 border-t-yellow-400',
}

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [activePreset, setActivePreset] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [selectedChartKpi, setSelectedChartKpi] = useState<string>('')
  const [dashboardTeam, setDashboardTeam] = useState<string>('')
  const [detailDate, setDetailDate] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentForm, setCommentForm] = useState<{author: string, content: string}>({author: '', content: ''})
  const [dashView, setDashView] = useState<'team' | 'ceo' | 'actions'>('team')

  useEffect(() => {
    fetchTeams()
    fetchKpis()
    fetchReports()
  }, [])

  const fetchTeams = async () => {
    try {
      const data = await fetch('/api/teams').then(r => r.json())
      if (data) setTeams(data)
    } catch (e) {
      console.error('Error fetching teams:', e)
    }
  }

  const fetchKpis = async () => {
    try {
      const data = await fetch('/api/kpis').then(r => r.json())
      if (data) setKpis(data)
    } catch (e) {
      console.error('Error fetching kpis:', e)
    }
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      const data = await fetch('/api/reports?limit=500').then(r => r.json())
      if (data) {
        setReports(data as Report[])
        setLastUpdate(new Date().toLocaleString('ko-KR'))
      }
    } catch (e) {
      console.error('Error fetching reports:', e)
    } finally {
      setLoading(false)
    }
  }

  // 빠른 필터
  const applyPreset = (preset: string) => {
    const range = getDateRange(preset)
    setStartDate(range.start)
    setEndDate(range.end)
    setActivePreset(preset)
  }

  const clearFilters = () => {
    setSelectedTeam('')
    setStartDate('')
    setEndDate('')
    setActivePreset('')
  }

  // 통계
  const getAchievementStatus = (rate: number | undefined) => {
    const r = rate || 0
    if (r >= 100) return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-900/30', border: 'border-green-700', label: '달성' }
    if (r >= 70) return { icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-900/30', border: 'border-yellow-300', label: '진행중' }
    return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-900/30', border: 'border-red-700', label: '미달성' }
  }

  const totalKPI = reports.length
  // 주간 달성/미달성
  const weeklyAchieved = reports.filter(r => (r.weekly_achievement_rate || 0) >= 100).length
  const weeklyBelow = reports.filter(r => r.weekly_achievement_rate != null && (r.weekly_achievement_rate || 0) < 100).length
  // 월간 달성/미달성
  const monthlyAchieved = reports.filter(r => (r.monthly_achievement_rate || 0) >= 100).length
  const monthlyBelow = reports.filter(r => (r.monthly_achievement_rate || 0) < 100).length
  const avgAchievement = totalKPI > 0
    ? (reports.reduce((sum, r) => sum + (r.monthly_achievement_rate || 0), 0) / totalKPI).toFixed(1)
    : '0'

  // 보고일자 목록 (드롭다운용)
  const reportDates = [...new Set(reports.map(r => r.report_date))].sort().reverse()

  // 팀별 요약
  const groupedReports = reports.reduce((acc: Record<string, Report[]>, report) => {
    const team = report.team_name || '미분류'
    if (!acc[team]) acc[team] = []
    acc[team].push(report)
    return acc
  }, {})

  const teamSummaries = Object.entries(groupedReports).map(([teamName, teamReports]) => {
    const avg = teamReports.length > 0
      ? (teamReports.reduce((sum, r) => sum + (r.monthly_achievement_rate || 0), 0) / teamReports.length).toFixed(1)
      : '0'
    const latestReport = teamReports[0]
    return {
      name: teamName,
      leader: latestReport?.leader || '-',
      kpiCount: teamReports.length,
      avgAchievement: avg,
      status: getAchievementStatus(parseFloat(avg))
    }
  })

  // 미제출 팀 계산
  const submittedTeamNames = new Set(reports.map(r => r.team_name))
  const missingTeams = teams.filter(t => !submittedTeamNames.has(t.name))

  // 팀별 미제출 KPI 계산
  const getTeamMissingKpis = (teamId: string) => {
    const teamKpis = kpis.filter(k => k.team_id === teamId)
    const reportedKpiIds = new Set(reports.filter(r => r.team_id === teamId).map(r => r.kpi_id))
    return teamKpis.filter(k => !reportedKpiIds.has(k.id))
  }

  // 팀별 KPI 개수 계산
  const getTeamKpiCount = (teamId: string) => {
    return kpis.filter(k => k.team_id === teamId).length
  }

  // CSV 내보내기
  const exportCSV = () => {
    const headers = ['팀', '카테고리', '프로그램', 'KPI', '보고일', '월간목표', '주간목표', '주간달성', '주간달성률', '월간누적', '월간달성률', '전략', 'PLAN', 'DO', 'CHECK', 'ACTION', '해결과제']
    const rows = reports.map(r => {
      const kpi = kpis.find(k => k.id === r.kpi_id)
      return [
      r.team_name || '',
      kpi?.category || '',
      kpi?.program || '',
      r.kpi_name || '',
      r.report_date,
      r.monthly_target ?? '',
      r.weekly_target ?? '',
      r.weekly_achievement ?? '',
      r.weekly_achievement_rate ?? '',
      r.monthly_cumulative ?? '',
      r.monthly_achievement_rate ?? '',
      r.strategy || '',
      r.plan || '',
      r.do_action || '',
      r.check_result || '',
      r.action || '',
      r.issue || '',
    ]})

    const csvContent = '\uFEFF' + [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `KPI_보고서_${startDate || 'all'}_${endDate || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const PRESETS = [
    { key: 'this_week', label: '이번 주' },
    { key: 'last_week', label: '지난 주' },
    { key: 'this_month', label: '이번 달' },
    { key: 'last_month', label: '지난 달' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* 헤더 - 파란색 상단 악센트 */}
      <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden mb-8">
        <div className="h-1 bg-blue-600"></div>
        <div className="p-5">
          <h2 className="text-2xl font-bold text-white mb-1">KPI 보고 대시보드</h2>
          <p className="text-gray-400 text-sm">팀별 KPI 달성 현황을 확인하세요</p>
        </div>
      </div>

      {/* 뷰 탭 전환 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setDashView('team')}
          className={dashView === 'team'
            ? 'bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium'
            : 'bg-gray-900 text-gray-300 border-2 border-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700'}
        >
          팀장 뷰
        </button>
        <button
          onClick={() => setDashView('ceo')}
          className={dashView === 'ceo'
            ? 'bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium'
            : 'bg-gray-900 text-gray-300 border-2 border-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700'}
        >
          CEO 브리핑
        </button>
        <button
          onClick={() => setDashView('actions')}
          className={dashView === 'actions'
            ? 'bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium'
            : 'bg-gray-900 text-gray-300 border-2 border-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700'}
        >
          액션 추적
        </button>
      </div>

      {/* CEO 브리핑 뷰 */}
      {dashView === 'ceo' && <CeoBriefing />}

      {/* 액션 추적 뷰 */}
      {dashView === 'actions' && <ActionsContent />}

      {/* 팀장 뷰 */}
      {dashView === 'team' && <>

      {/* 통계 카드 - 섹션 라벨 추가 */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">요약</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard icon={BarChart3} label="전체 보고" value={totalKPI} color="blue" />
          <StatCard icon={TrendingUp} label="주간 달성" value={weeklyAchieved} color="green" />
          <StatCard icon={TrendingDown} label="주간 미달성" value={weeklyBelow} color="red" />
          <StatCard icon={TrendingUp} label="월간 달성" value={monthlyAchieved} color="green" />
          <StatCard icon={Users} label="평균 달성률" value={`${avgAchievement}%`} color="purple" />
        </div>
      </div>

      {/* 미제출 팀 경고 */}
      {missingTeams.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-bold text-red-400 text-base">미제출 팀 ({missingTeams.length})</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingTeams.map(t => {
              const missing = getTeamMissingKpis(t.id)
              return (
                <span key={t.id} className="bg-red-900/30 text-red-400 px-3 py-1.5 rounded-full text-sm font-medium">
                  {t.name} ({missing.length}개 KPI 미제출)
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 필터는 팀별 상세 영역에 통합됨 */}

      {/* 팀별 요약 카드 - 섹션 라벨 추가 */}
      {teamSummaries.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">팀별 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teamSummaries.map((summary) => {
              const StatusIcon = summary.status.icon
              return (
                <div key={summary.name} className={`bg-gray-900 rounded-xl shadow p-5 border ${summary.status.border}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-base">{summary.name}</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${summary.status.bg} ${summary.status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {summary.status.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">팀장: {summary.leader}</p>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-400">{summary.kpiCount}개 KPI</span>
                    <span className={`text-lg font-bold ${summary.status.color}`}>{summary.avgAchievement}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 차트 섹션 */}
      {teamSummaries.length > 0 && (
        <div className="mb-8">
          <div className="mb-3">
            <h3 className="text-base font-bold text-white">성과 분석 차트</h3>
            <p className="text-sm text-gray-400">팀별 달성률 비교와 개별 KPI 추이를 확인하세요</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TeamBarChart teamSummaries={teamSummaries} />
            <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">KPI 추이 차트</h4>
                <select
                  value={selectedChartKpi}
                  onChange={(e) => setSelectedChartKpi(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[200px]"
                >
                  <option value="">KPI 선택</option>
                  {(() => {
                    const groups = groupKpisByCategoryProgram(kpis)
                    return groups.map((g, i) => {
                      const label = [g.category, g.program].filter(Boolean).join(' > ') || '미분류'
                      return (
                        <optgroup key={i} label={label}>
                          {g.kpis.map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                          ))}
                        </optgroup>
                      )
                    })
                  })()}
                </select>
              </div>
              {selectedChartKpi ? (
                <KpiTrendChart
                  reports={reports}
                  selectedKpiId={selectedChartKpi}
                  kpiName={kpis.find(k => k.id === selectedChartKpi)?.name || ''}
                />
              ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                  KPI를 선택하면 추이 차트가 표시됩니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 팀 선택 + 필터 + 상세 보고서 */}
      <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden mb-8">
        <div className="h-1 bg-blue-600"></div>
        <div className="p-5">
          {/* 일자 선택 + CSV + 새로고침 */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={detailDate}
              onChange={(e) => setDetailDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">전체 일자</option>
              {reportDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={exportCSV} className="px-3 py-1.5 text-xs text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 flex items-center gap-1">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={fetchReports} className="px-3 py-1.5 text-xs text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 새로고침
              </button>
            </div>
          </div>
          {/* 팀 선택 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDashboardTeam('')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${
                !dashboardTeam ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-300 border-gray-700 hover:bg-gray-700'
              }`}
            >
              전체
            </button>
            {teams.map(t => {
              const kpiCount = getTeamKpiCount(t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => setDashboardTeam(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border inline-flex items-center gap-1.5 ${
                    dashboardTeam === t.id ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {t.name}
                  {kpiCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                      dashboardTeam === t.id ? 'bg-blue-900/200 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {kpiCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* KPI 보고서 테이블 (회의용 뷰) */}
      {(() => {
        let filtered = dashboardTeam ? reports.filter(r => r.team_id === dashboardTeam) : reports
        if (detailDate) filtered = filtered.filter(r => r.report_date === detailDate)
        if (filtered.length === 0 && !loading) {
          return (
            <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 p-16 text-center">
              <Search className="w-20 h-20 text-gray-200 mx-auto mb-5" />
              <p className="text-gray-400 text-xl font-medium mb-2">데이터가 없습니다</p>
              <p className="text-gray-400 text-sm">조건을 변경하거나 보고서를 입력해주세요</p>
            </div>
          )
        }

        const toggleRow = (id: string) => {
          setExpandedRows(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
          // 펼칠 때 코멘트 가져오기
          if (!expandedRows.has(id)) {
            fetch(`/api/comments?report_id=${id}`).then(r => r.json()).then(data => {
              setComments(prev => ({...prev, [id]: data}))
            })
          }
        }

        return (
          <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
            {/* 테이블 상단 악센트 바 */}
            <div className="h-1 bg-blue-600"></div>
            <div className="overflow-auto max-h-[calc(100vh-280px)]">
              <table className="w-full">
                <thead>
                  <tr className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8 bg-gray-800"></th>
                    {!dashboardTeam && <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800">팀</th>}
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell bg-gray-800">분류</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800">KPI</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell bg-gray-800">보고일</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800">월간목표</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell bg-gray-800">주간목표</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell bg-gray-800">주간달성</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell bg-gray-800">월간누적</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell bg-gray-800">주간달성률</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-800">월간달성률</th>
                    <th className="px-2 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider w-16 bg-gray-800"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filtered.map((report) => {
                    const status = getAchievementStatus(report.monthly_achievement_rate)
                    const StatusIcon = status.icon
                    const isExpanded = expandedRows.has(report.id)
                    const hasPdca = report.strategy || report.plan || report.do_action || report.check_result || report.action || report.issue

                    // 추세 화살표: 같은 KPI의 직전 보고서와 비교
                    const prevReport = reports.find(r =>
                      r.kpi_id === report.kpi_id &&
                      r.report_date < report.report_date &&
                      r.id !== report.id
                    )
                    const currentRate = report.monthly_achievement_rate || 0
                    const prevRate = prevReport?.monthly_achievement_rate || 0
                    const trend = !prevReport ? 'neutral' : currentRate > prevRate ? 'up' : currentRate < prevRate ? 'down' : 'neutral'

                    return (
                      <React.Fragment key={report.id}>
                        {/* 데이터 행 */}
                        <tr
                          className={`cursor-pointer transition hover:bg-blue-900/20/40 ${isExpanded ? 'bg-blue-900/20/30' : ''}`}
                          onClick={() => toggleRow(report.id)}
                        >
                          <td className="px-4 py-4">
                            {hasPdca ? (
                              isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                            ) : <span className="w-4 h-4 block" />}
                          </td>
                          {!dashboardTeam && (
                            <td className="px-4 py-4">
                              <span
                                className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setDashboardTeam(report.team_id) }}
                              >
                                {report.team_name}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            {(() => {
                              const kpi = kpis.find(k => k.id === report.kpi_id)
                              return kpi?.category ? (
                                <div className="text-xs">
                                  <span className="text-blue-400">{kpi.category}</span>
                                  {kpi.program && <span className="text-gray-500 block">{kpi.program}</span>}
                                </div>
                              ) : null
                            })()}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/history?team=${report.team_id}&kpi=${report.kpi_id}`}
                              className="text-sm font-medium text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {report.kpi_name}
                            </Link>
                            <p className="text-xs text-gray-400 md:hidden mt-0.5">{report.report_date}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-300 hidden md:table-cell">{report.report_date}</td>
                          <td className="px-4 py-4 text-right text-sm text-gray-300">{report.monthly_target?.toLocaleString() || '-'}</td>
                          <td className="px-4 py-4 text-right text-sm text-gray-300 hidden sm:table-cell">{report.weekly_target?.toLocaleString() || '-'}</td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-blue-600 hidden sm:table-cell">{report.weekly_achievement?.toLocaleString() || '-'}</td>
                          <td className="px-4 py-4 text-right text-sm text-gray-300 hidden md:table-cell">{report.monthly_cumulative?.toLocaleString() || '-'}</td>
                          {/* 주간달성률 */}
                          <td className="px-4 py-4 text-center hidden sm:table-cell">
                            {report.weekly_achievement_rate != null ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                (report.weekly_achievement_rate || 0) >= 100 ? 'bg-green-900/30 text-green-600' : 'bg-red-900/30 text-red-600'
                              }`}>
                                {(report.weekly_achievement_rate || 0) >= 100 ? '달성' : '미달성'} {report.weekly_achievement_rate?.toFixed(1)}%
                              </span>
                            ) : <span className="text-gray-400 text-xs">-</span>}
                          </td>
                          {/* 월간달성률 */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {report.monthly_achievement_rate?.toFixed(1) ?? '0'}%
                              </span>
                              {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                              {trend === 'neutral' && prevReport && <Minus className="w-4 h-4 text-gray-400" />}
                            </div>
                          </td>
                          <td className="px-2 py-4 text-center">
                            <Link
                              href={`/reports?edit=${report.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:bg-blue-900/20 p-2 rounded-lg inline-flex items-center gap-1 text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">수정</span>
                            </Link>
                          </td>
                        </tr>

                        {/* PDCA 펼침 행 + 코멘트 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={dashboardTeam ? 10 : 11} className="px-4 py-5 bg-gray-800">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-8">
                                {[
                                  { label: '전략', value: report.strategy },
                                  { label: 'PLAN', value: report.plan },
                                  { label: 'DO', value: report.do_action },
                                  { label: 'CHECK', value: report.check_result },
                                  { label: 'ACTION', value: report.action },
                                  { label: '해결과제', value: report.issue },
                                  { label: '필요한 도움', value: report.help_needed },
                                ].map(({ label, value }) => (
                                  <div key={label} className={`bg-gray-900 rounded-xl border-2 border-gray-700 shadow p-4 ${PDCA_TOP_BORDER[label] || ''}`}>
                                    <p className="text-xs font-semibold text-gray-400 mb-1.5">{label}</p>
                                    <p className={`text-sm whitespace-pre-wrap ${value ? 'text-white' : 'text-gray-300 italic'}`}>{value || '미작성'}</p>
                                  </div>
                                ))}
                              </div>

                              {/* 코멘트 섹션 */}
                              <div className="mt-4 pt-4 border-t-2 border-gray-700 ml-8">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  리더 코멘트
                                </h4>
                                {(comments[report.id] || []).map((c: Comment) => (
                                  <div key={c.id} className="bg-blue-900/20 rounded-xl p-3 mb-2 border-2 border-blue-700">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm font-medium text-blue-600">{c.author}</span>
                                      <span className="text-xs text-gray-400">{c.created_at?.split('T')[0] || c.created_at}</span>
                                    </div>
                                    <p className="text-sm text-white">{c.content}</p>
                                  </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                  <input
                                    placeholder="이름"
                                    value={commentForm.author}
                                    onChange={(e) => setCommentForm(prev => ({ ...prev, author: e.target.value }))}
                                    onClick={(e) => e.stopPropagation()}
                                    className="border-2 border-gray-700 rounded-xl px-3 py-2 text-sm w-24 bg-gray-800 text-white"
                                  />
                                  <input
                                    placeholder="코멘트 입력..."
                                    value={commentForm.content}
                                    onChange={(e) => setCommentForm(prev => ({ ...prev, content: e.target.value }))}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.form?.requestSubmit() }}
                                    className="border-2 border-gray-700 rounded-xl px-3 py-2 text-sm flex-1 bg-gray-800 text-white"
                                  />
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      if (!commentForm.author || !commentForm.content) return
                                      await fetch('/api/comments', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ report_id: report.id, author: commentForm.author, content: commentForm.content })
                                      })
                                      const data = await fetch(`/api/comments?report_id=${report.id}`).then(r => r.json())
                                      setComments(prev => ({ ...prev, [report.id]: data }))
                                      setCommentForm(prev => ({ ...prev, content: '' }))
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition"
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      </>}
    </div>
  )
}
