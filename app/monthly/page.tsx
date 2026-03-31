'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Team, KPI, Report } from '@/types'
import { TeamBarChart } from '@/components/Charts'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Printer,
  AlertCircle,
  Trophy,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

// 월 선택 옵션 생성 (최근 12개월)
const generateMonthOptions = () => {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
    options.push({ value, label })
  }
  return options
}

// 월의 시작일/종료일 계산
const getMonthRange = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-').map(Number)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  }
}

// 이전 월 계산
const getPrevMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-').map(Number)
  const d = new Date(year, month - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 달성률 상태 색상
const getStatusColor = (rate: number) => {
  if (rate >= 100) return 'text-green-600'
  if (rate >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

const getStatusBg = (rate: number) => {
  if (rate >= 100) return 'bg-green-100 text-green-700'
  if (rate >= 70) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

// 변화량 표시 컴포넌트
const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous === null) return <span className="text-xs text-gray-400">-</span>

  const diff = current - previous
  if (Math.abs(diff) < 0.1) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400">
        <Minus className="w-3 h-3 mr-0.5" />
        0.0
      </span>
    )
  }

  if (diff > 0) {
    return (
      <span className="inline-flex items-center text-xs text-green-600">
        <ArrowUpRight className="w-3 h-3 mr-0.5" />
        +{diff.toFixed(1)}%
      </span>
    )
  }

  return (
    <span className="inline-flex items-center text-xs text-red-600">
      <ArrowDownRight className="w-3 h-3 mr-0.5" />
      {diff.toFixed(1)}%
    </span>
  )
}

export default function MonthlyReport() {
  const monthOptions = useMemo(() => generateMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [prevReports, setPrevReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  // 팀/KPI 데이터 로드
  useEffect(() => {
    const fetchBase = async () => {
      try {
        const [teamsData, kpisData] = await Promise.all([
          fetch('/api/teams').then(r => r.json()),
          fetch('/api/kpis').then(r => r.json()),
        ])
        if (teamsData) setTeams(teamsData)
        if (kpisData) setKpis(kpisData)
      } catch (e) {
        // 데이터 로드 실패 시 빈 배열 유지
      }
    }
    fetchBase()
  }, [])

  // 선택 월 + 이전 월 보고서 로드
  useEffect(() => {
    const fetchMonthlyReports = async () => {
      setLoading(true)
      try {
        const currentRange = getMonthRange(selectedMonth)
        const prevMonth = getPrevMonth(selectedMonth)
        const prevRange = getMonthRange(prevMonth)

        const [currentData, prevData] = await Promise.all([
          fetch(`/api/reports?start_date=${currentRange.start}&end_date=${currentRange.end}`).then(r => r.json()),
          fetch(`/api/reports?start_date=${prevRange.start}&end_date=${prevRange.end}`).then(r => r.json()),
        ])

        if (currentData) setReports(currentData as Report[])
        if (prevData) setPrevReports(prevData as Report[])
      } catch (e) {
        // 보고서 로드 실패 시 빈 배열 유지
      } finally {
        setLoading(false)
      }
    }
    fetchMonthlyReports()
  }, [selectedMonth])

  // --- 통계 계산 ---

  // 전체 보고 건수
  const totalReportCount = reports.length
  const prevTotalReportCount = prevReports.length

  // 평균 달성률
  const avgRate = totalReportCount > 0
    ? reports.reduce((sum, r) => sum + (r.monthly_achievement_rate || 0), 0) / totalReportCount
    : 0
  const prevAvgRate = prevTotalReportCount > 0
    ? prevReports.reduce((sum, r) => sum + (r.monthly_achievement_rate || 0), 0) / prevTotalReportCount
    : null

  // 팀별 요약
  const teamSummaries = useMemo(() => {
    const grouped: Record<string, Report[]> = {}
    reports.forEach(r => {
      const teamName = r.team_name || '미분류'
      if (!grouped[teamName]) grouped[teamName] = []
      grouped[teamName].push(r)
    })

    // 이전 달 팀별 그룹
    const prevGrouped: Record<string, Report[]> = {}
    prevReports.forEach(r => {
      const teamName = r.team_name || '미분류'
      if (!prevGrouped[teamName]) prevGrouped[teamName] = []
      prevGrouped[teamName].push(r)
    })

    return Object.entries(grouped)
      .map(([teamName, teamReports]) => {
        const avg = teamReports.reduce((sum, r) => sum + (r.monthly_achievement_rate || 0), 0) / teamReports.length
        const team = teams.find(t => t.name === teamName)
        const prevTeamReports = prevGrouped[teamName]
        const prevAvg = prevTeamReports && prevTeamReports.length > 0
          ? prevTeamReports.reduce((sum, r) => sum + (r.monthly_achievement_rate || 0), 0) / prevTeamReports.length
          : null

        return {
          name: teamName,
          teamId: team?.id || teamReports[0]?.team_id || '',
          leader: team?.leader || teamReports[0]?.leader || '-',
          avgAchievement: avg.toFixed(1),
          avgRate: avg,
          prevAvgRate: prevAvg,
          reportCount: teamReports.length,
        }
      })
      .sort((a, b) => b.avgRate - a.avgRate)
  }, [reports, prevReports, teams])

  // Top 5 / Bottom 5 KPI
  const kpiPerformance = useMemo(() => {
    // 같은 KPI에 여러 보고서가 있을 수 있으므로 가장 최근 보고서 기준
    const latestByKpi: Record<string, Report> = {}
    reports.forEach(r => {
      const key = `${r.kpi_id}_${r.team_id}`
      if (!latestByKpi[key] || r.report_date > latestByKpi[key].report_date) {
        latestByKpi[key] = r
      }
    })

    const sorted = Object.values(latestByKpi)
      .filter(r => r.monthly_achievement_rate !== undefined && r.monthly_achievement_rate !== null)
      .sort((a, b) => (b.monthly_achievement_rate || 0) - (a.monthly_achievement_rate || 0))

    return {
      top5: sorted.slice(0, 5),
      bottom5: sorted.slice(-5).reverse().sort((a, b) => (a.monthly_achievement_rate || 0) - (b.monthly_achievement_rate || 0)),
    }
  }, [reports])

  // 해결과제 요약
  const issueSummary = useMemo(() => {
    const issueReports = reports.filter(r => r.issue && r.issue.trim().length > 0)
    const issueCount = issueReports.length

    // 이슈 내용별 빈도 (간단한 키워드 추출)
    const issueTexts = issueReports.map(r => ({
      team: r.team_name || '미분류',
      kpi: r.kpi_name || '-',
      issue: r.issue || '',
    }))

    return { issueCount, issueTexts }
  }, [reports])

  // 인쇄 처리
  const handlePrint = () => {
    window.print()
  }

  // 선택된 월 라벨
  const selectedMonthLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 print:p-2">
      {/* 헤더 */}
      <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8 print:shadow-none print:border-0">
        <div className="h-1 bg-blue-600"></div>
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">월간 보고서</h2>
            <p className="text-gray-400 text-sm">월별 KPI 달성 현황 및 팀 성과를 요약합니다</p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            {/* 월 선택 */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border-2 border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {/* 인쇄 버튼 */}
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-xl hover:bg-blue-50 hover:shadow flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* 전체 월간 통계 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {selectedMonthLabel} 요약
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-blue-50/50 rounded-xl border-2 border-gray-200 p-5 border-l-4 border-l-blue-600">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-500 font-medium">전체 보고 건수</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalReportCount}</p>
                <div className="mt-1">
                  <ChangeIndicator current={totalReportCount} previous={prevTotalReportCount > 0 ? prevTotalReportCount : null} />
                  <span className="text-xs text-gray-400 ml-1">vs 지난달</span>
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-xl border-2 border-gray-200 p-5 border-l-4 border-l-blue-600">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-500 font-medium">평균 달성률</span>
                </div>
                <p className={`text-2xl font-bold ${getStatusColor(avgRate)}`}>{avgRate.toFixed(1)}%</p>
                <div className="mt-1">
                  <ChangeIndicator current={avgRate} previous={prevAvgRate} />
                  <span className="text-xs text-gray-400 ml-1">vs 지난달</span>
                </div>
              </div>

              <div className="bg-green-50/50 rounded-xl border-2 border-gray-200 p-5 border-l-4 border-l-green-600">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-500 font-medium">목표 달성</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {reports.filter(r => (r.monthly_achievement_rate || 0) >= 100).length}
                </p>
                <span className="text-xs text-gray-400">달성률 100% 이상</span>
              </div>

              <div className="bg-red-50/50 rounded-xl border-2 border-gray-200 p-5 border-l-4 border-l-red-600">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-500 font-medium">해결과제 건수</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{issueSummary.issueCount}</p>
                <span className="text-xs text-gray-400">이슈 보고 건수</span>
              </div>
            </div>
          </div>

          {/* 팀별 성과 테이블 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">팀별 성과</h3>
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
              <div className="h-1 bg-blue-600"></div>
              {teamSummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">팀명</th>
                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">팀장</th>
                        <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">보고 건수</th>
                        <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">평균 달성률</th>
                        <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">지난달 대비</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {teamSummaries.map((team, idx) => (
                        <tr key={team.name} className="hover:bg-blue-50/30 transition">
                          <td className="px-4 py-4 text-sm text-gray-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-4 text-sm font-semibold">
                            <Link href={`/?team=${team.teamId}`} className="text-blue-600 hover:underline">
                              {team.name}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{team.leader}</td>
                          <td className="px-4 py-4 text-center text-sm text-gray-600">{team.reportCount}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBg(team.avgRate)}`}>
                              {team.avgAchievement}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <ChangeIndicator current={team.avgRate} previous={team.prevAvgRate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p>해당 월에 제출된 보고서가 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* 팀별 달성률 차트 */}
          {teamSummaries.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">팀별 비교 차트</h3>
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
                <div className="h-1 bg-blue-600"></div>
                <div className="p-5">
                  <TeamBarChart teamSummaries={teamSummaries} />
                </div>
              </div>
            </div>
          )}

          {/* Top 5 / Bottom 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top 5 우수 KPI */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Top 5 우수 KPI
                </span>
              </h3>
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
                <div className="h-1 bg-green-600"></div>
                {kpiPerformance.top5.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {kpiPerformance.top5.map((r, idx) => (
                      <div key={`top-${r.kpi_id}-${r.team_id}`} className="flex items-center justify-between px-5 py-4 hover:bg-green-50/30 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/history?team=${r.team_id}&kpi=${r.kpi_id}`} className="text-sm font-semibold text-blue-600 hover:underline truncate block">
                              {r.kpi_name || '-'}
                            </Link>
                            <p className="text-xs text-gray-400">{r.team_name || '-'}</p>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBg(r.monthly_achievement_rate || 0)}`}>
                          {(r.monthly_achievement_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">데이터 없음</div>
                )}
              </div>
            </div>

            {/* Bottom 5 미달 KPI */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Bottom 5 미달 KPI
                </span>
              </h3>
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
                <div className="h-1 bg-red-600"></div>
                {kpiPerformance.bottom5.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {kpiPerformance.bottom5.map((r, idx) => (
                      <div key={`bot-${r.kpi_id}-${r.team_id}`} className="flex items-center justify-between px-5 py-4 hover:bg-red-50/30 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/history?team=${r.team_id}&kpi=${r.kpi_id}`} className="text-sm font-semibold text-blue-600 hover:underline truncate block">
                              {r.kpi_name || '-'}
                            </Link>
                            <p className="text-xs text-gray-400">{r.team_name || '-'}</p>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBg(r.monthly_achievement_rate || 0)}`}>
                          {(r.monthly_achievement_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">데이터 없음</div>
                )}
              </div>
            </div>
          </div>

          {/* 해결과제 요약 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <span className="inline-flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500" />
                해결과제 요약 ({issueSummary.issueCount}건)
              </span>
            </h3>
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden">
              <div className="h-1 bg-red-600"></div>
              {issueSummary.issueTexts.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {issueSummary.issueTexts.map((item, idx) => (
                    <div key={`issue-${idx}`} className="px-5 py-4 hover:bg-red-50/20 transition">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.team}</span>
                            <span className="text-xs text-gray-400">{item.kpi}</span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.issue}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  해당 월에 보고된 해결과제가 없습니다
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 인쇄용 푸터 (화면에서는 숨김) */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
        KPI 월간 보고서 - {selectedMonthLabel} | 출력일: {new Date().toLocaleDateString('ko-KR')}
      </div>
    </div>
  )
}
