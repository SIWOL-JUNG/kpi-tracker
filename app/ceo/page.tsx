'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Printer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertOctagon,
  HelpCircle,
  FileWarning,
  BarChart3,
  Target,
  Zap,
  ClipboardList,
  Users,
} from 'lucide-react'
import { Team, KPI, Report } from '@/types'

// --- 날짜 유틸 ---

function getWeekRange(offset: number = 0) {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + (offset * 7))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
    label: `${monday.getMonth() + 1}/${monday.getDate()} ~ ${friday.getMonth() + 1}/${friday.getDate()}`,
  }
}

// --- 컴포넌트 ---

export default function CeoDashboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const thisWeek = useMemo(() => getWeekRange(0), [])
  const lastWeek = useMemo(() => getWeekRange(-1), [])

  // 전체 보고서를 넉넉하게 불러옴 (최근 12주)
  const fetchStart = useMemo(() => getWeekRange(-12).start, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [teamsRes, kpisRes, reportsRes] = await Promise.all([
          fetch('/api/teams'),
          fetch('/api/kpis'),
          fetch(`/api/reports?start_date=${fetchStart}&end_date=${thisWeek.end}&limit=500`),
        ])
        const teamsData = await teamsRes.json()
        const kpisData = await kpisRes.json()
        const reportsData = await reportsRes.json()
        setTeams(Array.isArray(teamsData) ? teamsData : [])
        setKpis(Array.isArray(kpisData) ? kpisData : [])
        setAllReports(Array.isArray(reportsData) ? reportsData : [])
      } catch (err) {
        console.error('데이터 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [fetchStart, thisWeek.end])

  // --- 파생 데이터 ---

  // 이번 주 / 지난 주 보고서
  const thisWeekReports = useMemo(
    () => allReports.filter((r) => r.report_date >= thisWeek.start && r.report_date <= thisWeek.end),
    [allReports, thisWeek]
  )
  const lastWeekReports = useMemo(
    () => allReports.filter((r) => r.report_date >= lastWeek.start && r.report_date <= lastWeek.end),
    [allReports, lastWeek]
  )

  // 활성 KPI
  const activeKpis = useMemo(() => kpis.filter((k) => k.status === 'active'), [kpis])

  // Section A 계산
  const sectionA = useMemo(() => {
    const avgRate = (reports: Report[]) => {
      const rates = reports
        .map((r) => r.weekly_achievement_rate ?? r.monthly_achievement_rate)
        .filter((v): v is number => v != null)
      return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
    }
    const thisAvg = avgRate(thisWeekReports)
    const lastAvg = avgRate(lastWeekReports)
    const avgDelta = thisAvg - lastAvg

    // 달성 KPI (100% 이상)
    const thisAchieved = thisWeekReports.filter(
      (r) => (r.weekly_achievement_rate ?? r.monthly_achievement_rate ?? 0) >= 100
    ).length
    const lastAchieved = lastWeekReports.filter(
      (r) => (r.weekly_achievement_rate ?? r.monthly_achievement_rate ?? 0) >= 100
    ).length
    const achievedDelta = thisAchieved - lastAchieved

    return { thisAvg, lastAvg, avgDelta, thisAchieved, lastAchieved, achievedDelta, thisTotal: thisWeekReports.length, lastTotal: lastWeekReports.length }
  }, [thisWeekReports, lastWeekReports])

  // Section B: 위험 KPI (연속 미달성)
  const riskKpis = useMemo(() => {
    // KPI별 보고서를 날짜순 정렬
    const kpiReportsMap = new Map<string, Report[]>()
    for (const r of allReports) {
      const key = r.kpi_id
      if (!kpiReportsMap.has(key)) kpiReportsMap.set(key, [])
      kpiReportsMap.get(key)!.push(r)
    }

    const results: {
      teamName: string
      kpiName: string
      consecutiveMisses: number
      latestRate: number | null
      level: 'yellow' | 'red'
    }[] = []

    kpiReportsMap.forEach((reports, kpiId) => {
      // 날짜 내림차순 정렬 (최근 먼저)
      const sorted = [...reports].sort(
        (a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      )

      let consecutiveMisses = 0
      for (const r of sorted) {
        const rate = r.weekly_achievement_rate ?? r.monthly_achievement_rate
        if (rate == null || rate < 100) {
          consecutiveMisses++
        } else {
          break
        }
      }

      if (consecutiveMisses >= 2) {
        const latest = sorted[0]
        const latestRate = latest.weekly_achievement_rate ?? latest.monthly_achievement_rate ?? null
        results.push({
          teamName: latest.team_name ?? '(팀 없음)',
          kpiName: latest.kpi_name ?? kpiId,
          consecutiveMisses,
          latestRate,
          level: consecutiveMisses >= 3 ? 'red' : 'yellow',
        })
      }
    })

    // 위험도 높은 순
    results.sort((a, b) => b.consecutiveMisses - a.consecutiveMisses)
    return results
  }, [allReports])

  // Section C: ACTION 실행 추적
  const sectionC = useMemo(() => {
    // 지난주 action이 있는 보고서 (KPI별)
    const lastWeekActions = lastWeekReports.filter((r) => r.action && r.action.trim())
    // 이번주 do_action이 있는 보고서 (KPI별)
    const thisWeekDoMap = new Map<string, Report>()
    for (const r of thisWeekReports) {
      if (r.do_action && r.do_action.trim()) {
        thisWeekDoMap.set(r.kpi_id, r)
      }
    }

    // 팀별 집계
    const teamStats = new Map<
      string,
      { teamName: string; actionCount: number; doCount: number; unexecuted: { kpiName: string; actionContent: string }[] }
    >()

    for (const r of lastWeekActions) {
      const teamId = r.team_id
      if (!teamStats.has(teamId)) {
        teamStats.set(teamId, { teamName: r.team_name ?? '(팀 없음)', actionCount: 0, doCount: 0, unexecuted: [] })
      }
      const stat = teamStats.get(teamId)!
      stat.actionCount++
      if (thisWeekDoMap.has(r.kpi_id)) {
        stat.doCount++
      } else {
        stat.unexecuted.push({ kpiName: r.kpi_name ?? r.kpi_id, actionContent: r.action! })
      }
    }

    const teamArray = Array.from(teamStats.values())
    const totalAction = teamArray.reduce((s, t) => s + t.actionCount, 0)
    const totalDo = teamArray.reduce((s, t) => s + t.doCount, 0)
    const overallRate = totalAction > 0 ? (totalDo / totalAction) * 100 : 0

    return { teamArray, totalAction, totalDo, overallRate }
  }, [lastWeekReports, thisWeekReports])

  // Section D: 팀별 핵심 이슈
  const sectionD = useMemo(() => {
    const issueReports = thisWeekReports.filter(
      (r) => (r.issue && r.issue.trim()) || (r.help_needed && r.help_needed.trim())
    )
    // 팀별 그룹핑
    const grouped = new Map<string, { teamName: string; items: { kpiName: string; issue?: string; helpNeeded?: string }[] }>()
    for (const r of issueReports) {
      const teamId = r.team_id
      if (!grouped.has(teamId)) {
        grouped.set(teamId, { teamName: r.team_name ?? '(팀 없음)', items: [] })
      }
      grouped.get(teamId)!.items.push({
        kpiName: r.kpi_name ?? r.kpi_id,
        issue: r.issue?.trim() || undefined,
        helpNeeded: r.help_needed?.trim() || undefined,
      })
    }
    return Array.from(grouped.values())
  }, [thisWeekReports])

  // Section E: 미제출 현황
  const sectionE = useMemo(() => {
    // 팀별 활성 KPI 수
    const teamKpiCount = new Map<string, { teamName: string; total: number; submitted: number }>()
    for (const team of teams) {
      const count = activeKpis.filter((k) => k.team_id === team.id).length
      teamKpiCount.set(team.id, { teamName: team.name, total: count, submitted: 0 })
    }
    // 이번 주 제출된 보고서의 KPI (팀별 유니크)
    const submittedSet = new Map<string, Set<string>>()
    for (const r of thisWeekReports) {
      if (!submittedSet.has(r.team_id)) submittedSet.set(r.team_id, new Set())
      submittedSet.get(r.team_id)!.add(r.kpi_id)
    }
    submittedSet.forEach((kpiSet, teamId) => {
      if (teamKpiCount.has(teamId)) {
        teamKpiCount.get(teamId)!.submitted = kpiSet.size
      }
    })

    return Array.from(teamKpiCount.values()).filter((t) => t.total > 0)
  }, [teams, activeKpis, thisWeekReports])

  // --- 렌더링 ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-lg">데이터를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-w-[360px] max-w-[1200px] mx-auto px-4 py-8 print:px-2 print:py-4">
      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* --- Header --- */}
      <div className="mb-8">
        <div className="h-1 bg-blue-600 rounded-full mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">CEO 주간 브리핑</h1>
            <p className="text-gray-400 mt-1">{thisWeek.label} (이번 주)</p>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition"
          >
            <Printer className="w-4 h-4" />
            인쇄
          </button>
        </div>
      </div>

      {/* --- Section A: 핵심 지표 --- */}
      <SectionLabel icon={<BarChart3 className="w-4 h-4" />} label="SECTION A" title="이번 주 vs 지난 주 핵심 지표" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <BigStatCard
          title="전체 평균 달성률"
          value={`${sectionA.thisAvg.toFixed(1)}%`}
          delta={sectionA.avgDelta}
          deltaLabel={`${sectionA.avgDelta >= 0 ? '+' : ''}${sectionA.avgDelta.toFixed(1)}%`}
          icon={<Target className="w-6 h-6 text-blue-600" />}
        />
        <BigStatCard
          title="주간 달성 KPI"
          value={`${sectionA.thisAchieved}개 / ${sectionA.thisTotal}개`}
          delta={sectionA.achievedDelta}
          deltaLabel={`지난주 대비 ${sectionA.achievedDelta >= 0 ? '+' : ''}${sectionA.achievedDelta}개`}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
        />
        <BigStatCard
          title="ACTION 실행률"
          value={`${sectionC.overallRate.toFixed(0)}%`}
          delta={sectionC.overallRate >= 80 ? 1 : sectionC.overallRate >= 50 ? 0 : -1}
          deltaLabel={`${sectionC.totalDo} / ${sectionC.totalAction}건 실행`}
          icon={<Zap className="w-6 h-6 text-amber-400" />}
        />
      </div>

      {/* --- Section B: 위험 KPI --- */}
      <SectionLabel icon={<AlertTriangle className="w-4 h-4" />} label="SECTION B" title="위험 KPI (연속 미달성)" />
      <div className="mb-10 print-break">
        {riskKpis.length === 0 ? (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-400 font-medium">위험 KPI 없음</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riskKpis.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border-2 p-4 ${
                  item.level === 'red'
                    ? 'bg-red-900/20 border-red-700'
                    : 'bg-amber-900/20 border-amber-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertOctagon
                    className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
                      item.level === 'red' ? 'text-red-600' : 'text-amber-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded">
                        {item.teamName}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.level === 'red'
                            ? 'bg-red-200 text-red-400'
                            : 'bg-amber-200 text-amber-400'
                        }`}
                      >
                        {item.consecutiveMisses}주 연속 미달성
                      </span>
                    </div>
                    <p className="font-semibold text-white mt-1 truncate">{item.kpiName}</p>
                    <p className="text-sm text-gray-300 mt-0.5">
                      최근 달성률:{' '}
                      <span className={item.level === 'red' ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
                        {item.latestRate != null ? `${item.latestRate.toFixed(1)}%` : '미입력'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Section C: ACTION 실행 추적 --- */}
      <SectionLabel icon={<ClipboardList className="w-4 h-4" />} label="SECTION C" title="ACTION 실행 추적" />
      <div className="mb-10 print-break">
        {sectionC.teamArray.length === 0 ? (
          <EmptyState message="지난주 ACTION이 없습니다." />
        ) : (
          <>
            {/* 팀별 표 */}
            <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-300">팀명</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-300">지난주 ACTION</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-300">이번주 DO</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-300">실행률</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionC.teamArray.map((team, idx) => {
                    const rate = team.actionCount > 0 ? (team.doCount / team.actionCount) * 100 : 0
                    return (
                      <tr key={idx} className="border-b border-gray-700 last:border-0">
                        <td className="px-4 py-3 font-medium text-white">{team.teamName}</td>
                        <td className="text-center px-4 py-3">{team.actionCount}</td>
                        <td className="text-center px-4 py-3">{team.doCount}</td>
                        <td className="text-center px-4 py-3">
                          <span
                            className={`font-bold ${
                              rate >= 100
                                ? 'text-green-600'
                                : rate >= 50
                                ? 'text-amber-400'
                                : 'text-red-600'
                            }`}
                          >
                            {rate.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 미실행 목록 */}
            {sectionC.teamArray.some((t) => t.unexecuted.length > 0) && (
              <div className="bg-red-900/20 border-2 border-red-700 rounded-xl p-4">
                <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  미실행 ACTION
                </h4>
                <div className="space-y-2">
                  {sectionC.teamArray
                    .filter((t) => t.unexecuted.length > 0)
                    .map((team, tIdx) =>
                      team.unexecuted.map((item, iIdx) => (
                        <div
                          key={`${tIdx}-${iIdx}`}
                          className="bg-gray-900 border border-red-700 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold bg-red-900/30 text-red-400 px-2 py-0.5 rounded">
                              {team.teamName}
                            </span>
                            <span className="text-sm font-medium text-gray-200">{item.kpiName}</span>
                          </div>
                          <p className="text-sm text-gray-300 pl-1">
                            지난주 ACTION: &quot;{item.actionContent}&quot;
                          </p>
                        </div>
                      ))
                    )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Section D: 팀별 핵심 이슈 --- */}
      <SectionLabel icon={<FileWarning className="w-4 h-4" />} label="SECTION D" title="팀별 핵심 이슈" />
      <div className="mb-10 print-break">
        {sectionD.length === 0 ? (
          <EmptyState message="이번 주 보고된 이슈가 없습니다." />
        ) : (
          <div className="space-y-4">
            {sectionD.map((team, idx) => (
              <div key={idx} className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
                <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700">
                  <h4 className="font-semibold text-gray-200">{team.teamName}</h4>
                </div>
                <div className="p-4 space-y-3">
                  {team.items.map((item, iIdx) => (
                    <div key={iIdx}>
                      <p className="text-sm font-medium text-gray-300 mb-1">{item.kpiName}</p>
                      {item.issue && (
                        <div className="flex items-start gap-2 ml-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-200">{item.issue}</p>
                        </div>
                      )}
                      {item.helpNeeded && (
                        <div className="flex items-start gap-2 ml-2 bg-amber-900/20 border border-amber-700 rounded-lg p-2">
                          <HelpCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-400">
                            <span className="font-semibold">도움 필요:</span> {item.helpNeeded}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Section E: 미제출 현황 --- */}
      <SectionLabel icon={<Users className="w-4 h-4" />} label="SECTION E" title="미제출 현황" />
      <div className="mb-10 print-break">
        {sectionE.length === 0 ? (
          <EmptyState message="활성 KPI가 없습니다." />
        ) : (
          <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-300">팀명</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">전체 KPI</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">제출</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">미제출</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">제출률</th>
                </tr>
              </thead>
              <tbody>
                {sectionE.map((team, idx) => {
                  const missing = team.total - team.submitted
                  const rate = team.total > 0 ? (team.submitted / team.total) * 100 : 0
                  const hasIssue = missing > 0
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-700 last:border-0 ${
                        hasIssue ? 'bg-red-900/20' : ''
                      }`}
                    >
                      <td className={`px-4 py-3 font-medium ${hasIssue ? 'text-red-400' : 'text-white'}`}>
                        {team.teamName}
                      </td>
                      <td className="text-center px-4 py-3">{team.total}</td>
                      <td className="text-center px-4 py-3">{team.submitted}</td>
                      <td className="text-center px-4 py-3">
                        {hasIssue ? (
                          <span className="font-bold text-red-600">{missing}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="text-center px-4 py-3">
                        <span
                          className={`font-bold ${
                            rate >= 100 ? 'text-green-600' : rate >= 50 ? 'text-amber-400' : 'text-red-600'
                          }`}
                        >
                          {rate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="text-center text-xs text-gray-400 mt-12 mb-4">
        CEO 주간 브리핑 &middot; {thisWeek.label} &middot; 자동 생성
      </div>
    </div>
  )
}

// --- 하위 컴포넌트 ---

function SectionLabel({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-400">{icon}</span>
      <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">{label}</span>
      <span className="text-sm font-semibold text-gray-300">{title}</span>
    </div>
  )
}

function BigStatCard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
}: {
  title: string
  value: string
  delta: number
  deltaLabel: string
  icon: React.ReactNode
}) {
  const isPositive = delta > 0
  const isNeutral = delta === 0

  return (
    <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 p-5">
      <div className="h-1 bg-blue-600 rounded-full mb-4" />
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        {isNeutral ? (
          <span className="text-sm text-gray-400">{deltaLabel}</span>
        ) : (
          <>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {deltaLabel}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
      <p className="text-gray-400">{message}</p>
    </div>
  )
}
