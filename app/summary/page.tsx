'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Team, KPI, Report } from '@/types'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  Printer,
  Trophy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  ClipboardList,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// 날짜 포맷 (ISO)
const formatDate = (date: Date) => date.toISOString().split('T')[0]

// 이번 주 월~금 날짜 범위 계산 (offset: 0 = 이번 주, -1 = 지난 주, +1 = 다음 주)
const getWeekRange = (offset = 0) => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=일, 1=월, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + offset * 7)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { start: monday, end: friday }
}

// 한국어 날짜 표시 (예: "2026년 3월 23일 ~ 27일")
const formatKoreanRange = (start: Date, end: Date) => {
  const startYear = start.getFullYear()
  const startMonth = start.getMonth() + 1
  const startDay = start.getDate()
  const endMonth = end.getMonth() + 1
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endDay}일`
  }
  return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`
}

// 달성률 색상 클래스
const getRateColorClass = (rate: number) => {
  if (rate >= 100) return 'text-green-600'
  if (rate >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

const getRateBgClass = (rate: number) => {
  if (rate >= 100) return 'bg-green-100 text-green-600'
  if (rate >= 70) return 'bg-yellow-100 text-yellow-600'
  return 'bg-red-100 text-red-600'
}

const TOP_COUNT = 3

export default function WeeklySummaryPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(weekOffset), [weekOffset])
  const startDateStr = formatDate(weekStart)
  const endDateStr = formatDate(weekEnd)

  // 데이터 패칭
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [teamsRes, kpisRes, reportsRes] = await Promise.all([
          fetch('/api/teams').then(r => r.json()),
          fetch('/api/kpis').then(r => r.json()),
          fetch(`/api/reports?start_date=${startDateStr}&end_date=${endDateStr}`).then(r => r.json()),
        ])
        if (teamsRes) setTeams(teamsRes)
        if (kpisRes) setKpis(kpisRes)
        if (reportsRes) setReports(reportsRes as Report[])
      } catch (e) {
        // 에러 시 빈 상태 유지
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [startDateStr, endDateStr])

  // 전체 평균 달성률
  const overallAvg = useMemo(() => {
    if (reports.length === 0) return 0
    const sum = reports.reduce((acc, r) => acc + (r.weekly_achievement_rate || 0), 0)
    return sum / reports.length
  }, [reports])

  // 팀별 평균 달성률 (정렬)
  const teamRankings = useMemo(() => {
    const map: Record<string, { teamName: string; teamId: string; rates: number[] }> = {}
    for (const r of reports) {
      const name = r.team_name || '미분류'
      if (!map[name]) map[name] = { teamName: name, teamId: r.team_id, rates: [] }
      map[name].rates.push(r.weekly_achievement_rate || 0)
    }
    return Object.values(map)
      .map(entry => ({
        teamName: entry.teamName,
        teamId: entry.teamId,
        avg: entry.rates.reduce((a, b) => a + b, 0) / entry.rates.length,
        count: entry.rates.length,
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [reports])

  // 미제출 팀
  const missingTeams = useMemo(() => {
    const submittedTeamIds = new Set(reports.map(r => r.team_id))
    return teams.filter(t => !submittedTeamIds.has(t.id))
  }, [teams, reports])

  // KPI별 달성률 (Best / Worst)
  const kpiRankings = useMemo(() => {
    const sorted = [...reports]
      .filter(r => r.weekly_achievement_rate !== undefined && r.weekly_achievement_rate !== null)
      .sort((a, b) => (b.weekly_achievement_rate || 0) - (a.weekly_achievement_rate || 0))

    const best = sorted.slice(0, TOP_COUNT)
    const worst = sorted.length > TOP_COUNT
      ? sorted.slice(-TOP_COUNT).reverse()
      : []

    return { best, worst }
  }, [reports])

  // ACTION 항목 (팀별 그룹)
  const actionsByTeam = useMemo(() => {
    const map: Record<string, { teamName: string; items: { kpiName: string; action: string }[] }> = {}
    for (const r of reports) {
      if (!r.action) continue
      const name = r.team_name || '미분류'
      if (!map[name]) map[name] = { teamName: name, items: [] }
      map[name].items.push({ kpiName: r.kpi_name || '-', action: r.action })
    }
    return Object.values(map)
  }, [reports])

  // 해결과제 & 도움 (팀별 그룹)
  const issuesByTeam = useMemo(() => {
    const map: Record<string, { teamName: string; teamId: string; items: { kpiName: string; issue: string }[] }> = {}
    for (const r of reports) {
      if (!r.issue) continue
      const name = r.team_name || '미분류'
      if (!map[name]) map[name] = { teamName: name, teamId: r.team_id, items: [] }
      map[name].items.push({ kpiName: r.kpi_name || '-', issue: r.issue })
    }
    return Object.values(map)
  }, [reports])

  // 주차 이동
  const goToPrevWeek = () => setWeekOffset(prev => prev - 1)
  const goToNextWeek = () => setWeekOffset(prev => prev + 1)
  const goToThisWeek = () => setWeekOffset(0)

  return (
    <>
      {/* 인쇄용 CSS */}
      <style jsx global>{`
        @media print {
          nav, .no-print {
            display: none !important;
          }
          body {
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8">
          <div className="h-1 bg-blue-600"></div>
          <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">주간 회의 요약</h1>
                <div className="flex items-center gap-3">
                  <button
                    onClick={goToPrevWeek}
                    className="no-print p-1 rounded hover:bg-gray-100 transition"
                    aria-label="이전 주"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <span className="text-lg font-semibold text-blue-600">
                    {formatKoreanRange(weekStart, weekEnd)}
                  </span>
                  <button
                    onClick={goToNextWeek}
                    className="no-print p-1 rounded hover:bg-gray-100 transition"
                    aria-label="다음 주"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                  {weekOffset !== 0 && (
                    <button
                      onClick={goToThisWeek}
                      className="no-print text-sm text-blue-600 hover:text-blue-800 underline ml-2"
                    >
                      이번 주로
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="no-print flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                인쇄
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow border-2 border-gray-300 p-16 text-center">
            <ClipboardList className="w-20 h-20 text-gray-200 mx-auto mb-5" />
            <p className="text-gray-500 text-xl font-medium mb-2">이번 주 보고서가 없습니다</p>
            <p className="text-gray-400 text-sm">보고서를 입력하면 요약이 자동 생성됩니다</p>
          </div>
        ) : (
          <>
            {/* 전체 평균 달성률 */}
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8 print-break-inside-avoid">
              <div className="h-1 bg-blue-600"></div>
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  전체 평균 달성률
                </p>
                <p className={`text-5xl font-bold ${getRateColorClass(overallAvg)}`}>
                  {overallAvg.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {reports.length}개 KPI 기준
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* 팀 순위 테이블 */}
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden print-break-inside-avoid">
                <div className="h-1 bg-blue-600"></div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">팀 순위</h2>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">순위</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">팀</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">KPI</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 px-2">평균 달성률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teamRankings.map((team, idx) => (
                        <tr key={team.teamName} className="hover:bg-gray-50">
                          <td className="py-3 px-2 text-sm font-bold text-gray-400">{idx + 1}</td>
                          <td className="py-3 px-2 text-sm font-medium">
                            <Link href={`/?team=${team.teamId}`} className="text-blue-600 hover:underline">
                              {team.teamName}
                            </Link>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-500 text-right">{team.count}개</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${getRateBgClass(team.avg)}`}>
                              {team.avg.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 미제출 팀 */}
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden print-break-inside-avoid">
                <div className="h-1 bg-blue-600"></div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">미제출 팀</h2>
                  </div>
                  {missingTeams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="w-10 h-10 text-green-300 mb-3" />
                      <p className="text-green-600 font-medium">모든 팀이 제출 완료했습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {missingTeams.map(t => {
                        const teamKpiCount = kpis.filter(k => k.team_id === t.id).length
                        return (
                          <div key={t.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-red-800">{t.name}</p>
                              <p className="text-xs text-red-500">팀장: {t.leader}</p>
                            </div>
                            <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                              {teamKpiCount}개 KPI 미제출
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Best / Worst KPI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Best KPI */}
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden print-break-inside-avoid">
                <div className="h-1 bg-blue-600"></div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Top {TOP_COUNT} Best KPI
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {kpiRankings.best.map((r, idx) => (
                      <div key={r.id} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <span className="text-lg font-bold text-green-400 w-6 text-center">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.kpi_name}</p>
                          <p className="text-xs text-gray-500">{r.team_name}</p>
                        </div>
                        <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                          {(r.weekly_achievement_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Worst KPI */}
              <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden print-break-inside-avoid">
                <div className="h-1 bg-blue-600"></div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Top {TOP_COUNT} Worst KPI
                    </h2>
                  </div>
                  {kpiRankings.worst.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">데이터가 충분하지 않습니다</p>
                  ) : (
                    <div className="space-y-3">
                      {kpiRankings.worst.map((r, idx) => (
                        <div key={r.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                          <span className="text-lg font-bold text-red-400 w-6 text-center">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.kpi_name}</p>
                            <p className="text-xs text-gray-500">{r.team_name}</p>
                          </div>
                          <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                            {(r.weekly_achievement_rate || 0).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION 항목 (팀별) */}
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8 print-break-inside-avoid">
              <div className="h-1 bg-blue-600"></div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    ACTION 항목
                  </h2>
                  <span className="text-xs text-gray-400 ml-1">
                    ({actionsByTeam.reduce((sum, t) => sum + t.items.length, 0)}건)
                  </span>
                </div>
                {actionsByTeam.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">이번 주 ACTION 항목이 없습니다</p>
                ) : (
                  <div className="space-y-5">
                    {actionsByTeam.map(group => (
                      <div key={group.teamName}>
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                          {group.teamName}
                        </h3>
                        <div className="space-y-2 ml-4">
                          {group.items.map((item, idx) => (
                            <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                              <p className="text-xs font-semibold text-orange-600 mb-1">{item.kpiName}</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.action}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 해결과제 & 도움 (팀별) */}
            <div className="bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden mb-8 print-break-inside-avoid">
              <div className="h-1 bg-blue-600"></div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    해결과제 & 도움
                  </h2>
                  <span className="text-xs text-gray-400 ml-1">
                    ({issuesByTeam.reduce((sum, t) => sum + t.items.length, 0)}건)
                  </span>
                </div>
                {issuesByTeam.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">이번 주 해결과제가 없습니다</p>
                ) : (
                  <div className="space-y-5">
                    {issuesByTeam.map(group => (
                      <div key={group.teamName}>
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          {group.teamName}
                          <Link href={`/actions?team=${group.teamId}`} className="text-blue-600 hover:underline text-xs font-normal ml-1">
                            액션 추적 →
                          </Link>
                        </h3>
                        <div className="space-y-2 ml-4">
                          {group.items.map((item, idx) => (
                            <div key={idx} className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                              <p className="text-xs font-semibold text-red-600 mb-1">{item.kpiName}</p>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.issue}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
