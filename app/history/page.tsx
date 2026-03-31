'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Team, KPI, Report } from '@/types'
import { KpiTrendChart } from '@/components/Charts'
import { History, Printer, ChevronDown, TrendingUp, Target, BarChart3, AlertTriangle } from 'lucide-react'

// PDCA 필드 정의
const PDCA_FIELDS = [
  { key: 'strategy', label: '전략', color: 'bg-blue-50 border-blue-200' },
  { key: 'plan', label: 'Plan', color: 'bg-indigo-50 border-indigo-200' },
  { key: 'do_action', label: 'Do', color: 'bg-green-50 border-green-200' },
  { key: 'check_result', label: 'Check', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'action', label: 'Action', color: 'bg-purple-50 border-purple-200' },
] as const

// 달성률에 따른 색상 반환
const getAchievementColor = (rate: number | undefined): string => {
  if (rate === undefined || rate === null) return 'text-gray-400'
  if (rate >= 100) return 'text-green-600'
  if (rate >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

const getAchievementBg = (rate: number | undefined): string => {
  if (rate === undefined || rate === null) return 'bg-gray-100 text-gray-500'
  if (rate >= 100) return 'bg-green-100 text-green-700'
  if (rate >= 70) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function HistoryPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">로딩 중...</div>}>
      <HistoryPage />
    </Suspense>
  )
}

function HistoryPage() {
  const searchParams = useSearchParams()
  const initializedRef = useRef(false)

  // 상태 관리
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedKpiId, setSelectedKpiId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 팀 목록 로드
  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data)
        // URL 파라미터에서 팀 자동 선택
        const teamParam = searchParams.get('team')
        if (teamParam && !initializedRef.current) {
          setSelectedTeamId(teamParam)
        }
      })
      .catch(() => setTeams([]))
  }, [])

  // 팀 선택 시 KPI 목록 로드
  useEffect(() => {
    if (!selectedTeamId) {
      setKpis([])
      setSelectedKpiId('')
      return
    }
    fetch('/api/kpis')
      .then(res => res.json())
      .then((data: KPI[]) => {
        const filtered = data.filter(k => k.team_id === selectedTeamId)
        setKpis(filtered)
        // URL 파라미터에서 KPI 자동 선택 (최초 1회)
        const kpiParam = searchParams.get('kpi')
        if (kpiParam && !initializedRef.current) {
          const found = filtered.find(k => k.id === kpiParam)
          if (found) {
            setSelectedKpiId(kpiParam)
          } else {
            setSelectedKpiId('')
          }
          initializedRef.current = true
        } else if (initializedRef.current) {
          setSelectedKpiId('')
        }
      })
      .catch(() => setKpis([]))
  }, [selectedTeamId])

  // KPI 선택 시 보고서 로드
  useEffect(() => {
    if (!selectedKpiId) {
      setReports([])
      return
    }
    setIsLoading(true)
    fetch('/api/reports?limit=100')
      .then(res => res.json())
      .then((data: Report[]) => {
        const filtered = data
          .filter(r => r.kpi_id === selectedKpiId)
          .sort((a, b) => a.report_date.localeCompare(b.report_date))
        setReports(filtered)
      })
      .catch(() => setReports([]))
      .finally(() => setIsLoading(false))
  }, [selectedKpiId])

  // 선택된 KPI 이름
  const selectedKpiName = kpis.find(k => k.id === selectedKpiId)?.name ?? ''

  // 타임라인용 보고서 (최신순)
  const timelineReports = [...reports].reverse()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 카드 */}
      <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8">
        <div className="h-1 bg-blue-600" />
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KPI 히스토리</h1>
              <p className="text-sm text-gray-500 mt-1">
                특정 KPI의 PDCA 변화를 시간순으로 추적합니다
              </p>
            </div>
          </div>
          {reports.length > 0 && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors print:hidden"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
          )}
        </div>
      </div>

      {/* 셀렉터 */}
      <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8">
        <div className="h-1 bg-blue-600" />
        <div className="p-6">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            조회 조건
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 팀 선택 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">팀</label>
              <div className="relative">
                <select
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  className="w-full appearance-none bg-white border-2 border-gray-300 rounded-lg px-4 py-3 pr-10 text-base font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">팀을 선택하세요</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* KPI 선택 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">KPI</label>
              <div className="relative">
                <select
                  value={selectedKpiId}
                  onChange={e => setSelectedKpiId(e.target.value)}
                  disabled={!selectedTeamId}
                  className="w-full appearance-none bg-white border-2 border-gray-300 rounded-lg px-4 py-3 pr-10 text-base font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    {selectedTeamId ? 'KPI를 선택하세요' : '먼저 팀을 선택하세요'}
                  </option>
                  {kpis.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 빈 상태 */}
      {!selectedKpiId && (
        <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
          <div className="h-1 bg-blue-600" />
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              팀과 KPI를 선택하면 히스토리가 표시됩니다
            </p>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* 콘텐츠: 차트 + 타임라인 */}
      {selectedKpiId && !isLoading && (
        <>
          {/* 달성률 추이 차트 */}
          {reports.length >= 2 && (
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8">
              <div className="h-1 bg-blue-600" />
              <div className="p-6">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  달성률 추이
                </p>
                <KpiTrendChart
                  reports={reports}
                  selectedKpiId={selectedKpiId}
                  kpiName={selectedKpiName}
                />
              </div>
            </div>
          )}

          {/* 보고서 없음 */}
          {reports.length === 0 && (
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
              <div className="h-1 bg-blue-600" />
              <div className="p-12 text-center">
                <p className="text-gray-500">이 KPI에 대한 보고서가 없습니다</p>
              </div>
            </div>
          )}

          {/* 타임라인 */}
          {timelineReports.length > 0 && (
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
              <div className="h-1 bg-blue-600" />
              <div className="p-6">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
                  PDCA 타임라인 ({reports.length}건)
                </p>

                <div className="relative">
                  {/* 타임라인 세로선 */}
                  <div className="absolute left-[72px] top-0 bottom-0 border-l-2 border-gray-300" />

                  <div className="space-y-8">
                    {timelineReports.map((report, idx) => {
                      const weeklyRate = report.weekly_achievement_rate
                      const monthlyRate = report.monthly_achievement_rate

                      // 비어있지 않은 PDCA 필드만 필터
                      const activePdca = PDCA_FIELDS.filter(
                        f => report[f.key as keyof Report]
                      )

                      return (
                        <div key={report.id} className="relative pl-24">
                          {/* 날짜 배지 */}
                          <div className="absolute left-0 top-0 w-16 text-right">
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                              {report.report_date.substring(5)}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {report.report_date.substring(0, 4)}
                            </p>
                          </div>

                          {/* 타임라인 도트 */}
                          <div className="absolute left-[68px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-200" />

                          {/* 엔트리 카드 */}
                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            {/* 달성률 + 지표 행 */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              {/* 주간 달성률 배지 */}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${getAchievementBg(weeklyRate)}`}>
                                <TrendingUp className="w-3.5 h-3.5" />
                                주간 {weeklyRate !== undefined && weeklyRate !== null ? `${weeklyRate.toFixed(1)}%` : '-'}
                              </span>

                              {/* 월간 달성률 배지 */}
                              {monthlyRate !== undefined && monthlyRate !== null && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${getAchievementBg(monthlyRate)}`}>
                                  <Target className="w-3.5 h-3.5" />
                                  월간 {monthlyRate.toFixed(1)}%
                                </span>
                              )}
                            </div>

                            {/* 지표 수치 행 */}
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                              {report.monthly_target !== undefined && report.monthly_target !== null && (
                                <span>월 목표: <strong className="text-gray-700">{report.monthly_target.toLocaleString()}</strong></span>
                              )}
                              {report.weekly_achievement !== undefined && report.weekly_achievement !== null && (
                                <span>주간 실적: <strong className="text-gray-700">{report.weekly_achievement.toLocaleString()}</strong></span>
                              )}
                              {report.monthly_cumulative !== undefined && report.monthly_cumulative !== null && (
                                <span>월 누적: <strong className="text-gray-700">{report.monthly_cumulative.toLocaleString()}</strong></span>
                              )}
                            </div>

                            {/* PDCA 카드 그리드 */}
                            {activePdca.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {activePdca.map(field => (
                                  <div
                                    key={field.key}
                                    className={`rounded-md border p-3 ${field.color}`}
                                  >
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                      {field.label}
                                    </p>
                                    <p className="text-sm text-gray-800 whitespace-pre-line">
                                      {String(report[field.key as keyof Report])}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 이슈 카드 */}
                            {report.issue && (
                              <div className="mt-2 rounded-md border p-3 bg-red-50 border-red-200">
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Issue
                                </p>
                                <p className="text-sm text-red-800 whitespace-pre-line">
                                  {report.issue}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
