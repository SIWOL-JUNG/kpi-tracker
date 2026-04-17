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
  CalendarCheck,
  ClipboardCheck,
  Repeat,
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

// 이번 달의 시작일과 끝일
function getMonthRange() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// --- 상수 ---
const PDCA_FIELDS: (keyof Report)[] = ['strategy', 'plan', 'do_action', 'check_result', 'action', 'issue', 'help_needed']
const PDCA_FIELD_COUNT = PDCA_FIELDS.length
const WEEKS_IN_MONTH = 4
const CONSECUTIVE_ISSUE_THRESHOLD = 3

// --- 컴포넌트 ---

export function CeoBriefing() {
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

  // 이번 달 보고서
  const monthRange = useMemo(() => getMonthRange(), [])
  const thisMonthReports = useMemo(
    () => allReports.filter((r) => r.report_date >= monthRange.start && r.report_date <= monthRange.end),
    [allReports, monthRange]
  )

  // 최근 4주 보고서
  const fourWeeksAgoStart = useMemo(() => getWeekRange(-3).start, [])
  const last4WeeksReports = useMemo(
    () => allReports.filter((r) => r.report_date >= fourWeeksAgoStart && r.report_date <= thisWeek.end),
    [allReports, fourWeeksAgoStart, thisWeek.end]
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

  // Section F: 월간 목표 달성 예측
  const sectionF = useMemo(() => {
    // 이번 달 보고서에서 유니크 report_date 수 (경과 주차)
    const uniqueDates = new Set(thisMonthReports.map((r) => r.report_date))
    const weeksElapsed = uniqueDates.size

    if (weeksElapsed === 0) return []

    // 팀+KPI별 그룹핑
    const groupMap = new Map<string, {
      teamName: string
      kpiName: string
      monthlyTarget: number
      currentCumulative: number
    }>()

    for (const r of thisMonthReports) {
      const key = `${r.team_id}__${r.kpi_id}`
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          teamName: r.team_name ?? '(팀 없음)',
          kpiName: r.kpi_name ?? r.kpi_id,
          monthlyTarget: r.monthly_target ?? 0,
          currentCumulative: 0,
        })
      }
      const group = groupMap.get(key)!
      group.currentCumulative += r.weekly_achievement ?? 0
      // monthly_target을 최신 값으로 갱신
      if (r.monthly_target != null && r.monthly_target > 0) {
        group.monthlyTarget = r.monthly_target
      }
    }

    const results: {
      teamName: string
      kpiName: string
      monthlyTarget: number
      currentCumulative: number
      projected: number
      willAchieve: boolean
    }[] = []

    groupMap.forEach((data) => {
      // monthly_target이 0 이하인 것은 제외
      if (data.monthlyTarget <= 0) return

      const projected = (data.currentCumulative / weeksElapsed) * WEEKS_IN_MONTH
      results.push({
        teamName: data.teamName,
        kpiName: data.kpiName,
        monthlyTarget: data.monthlyTarget,
        currentCumulative: data.currentCumulative,
        projected,
        willAchieve: projected >= data.monthlyTarget,
      })
    })

    // 팀명 정렬
    results.sort((a, b) => a.teamName.localeCompare(b.teamName))
    return results
  }, [thisMonthReports])

  // Section G: PDCA 품질 점수
  const sectionG = useMemo(() => {
    // 이번 주 보고서의 팀별 PDCA 작성률
    const teamMap = new Map<string, {
      teamName: string
      reportCount: number
      totalFilledRatio: number
    }>()

    for (const r of thisWeekReports) {
      const teamId = r.team_id
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          teamName: r.team_name ?? '(팀 없음)',
          reportCount: 0,
          totalFilledRatio: 0,
        })
      }
      const stat = teamMap.get(teamId)!
      stat.reportCount++

      // PDCA 필드 중 채워진 수 카운트
      let filledCount = 0
      for (const field of PDCA_FIELDS) {
        const val = r[field]
        if (typeof val === 'string' && val.trim()) {
          filledCount++
        }
      }
      stat.totalFilledRatio += (filledCount / PDCA_FIELD_COUNT) * 100
    }

    const results: {
      teamName: string
      reportCount: number
      avgRate: number
      level: 'green' | 'yellow' | 'red'
    }[] = []

    teamMap.forEach((data) => {
      const avgRate = data.reportCount > 0 ? data.totalFilledRatio / data.reportCount : 0
      let level: 'green' | 'yellow' | 'red'
      if (avgRate >= 70) {
        level = 'green'
      } else if (avgRate >= 50) {
        level = 'yellow'
      } else {
        level = 'red'
      }
      results.push({
        teamName: data.teamName,
        reportCount: data.reportCount,
        avgRate,
        level,
      })
    })

    results.sort((a, b) => a.teamName.localeCompare(b.teamName))
    return results
  }, [thisWeekReports])

  // Section H: 반복 이슈 감지
  const sectionH = useMemo(() => {
    // 팀+KPI별 그룹핑 (최근 4주)
    const groupMap = new Map<string, {
      teamName: string
      kpiName: string
      reports: { date: string; issue: string }[]
    }>()

    for (const r of last4WeeksReports) {
      const key = `${r.team_id}__${r.kpi_id}`
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          teamName: r.team_name ?? '(팀 없음)',
          kpiName: r.kpi_name ?? r.kpi_id,
          reports: [],
        })
      }
      groupMap.get(key)!.reports.push({
        date: r.report_date,
        issue: r.issue?.trim() ?? '',
      })
    }

    const results: {
      teamName: string
      kpiName: string
      consecutiveWeeks: number
      latestIssue: string
    }[] = []

    groupMap.forEach((data) => {
      // 날짜순 정렬 (최신 먼저)
      const sorted = [...data.reports].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      // 최신부터 연속으로 issue가 비어있지 않은 주 카운트
      let consecutive = 0
      for (const entry of sorted) {
        if (entry.issue) {
          consecutive++
        } else {
          break
        }
      }

      if (consecutive >= CONSECUTIVE_ISSUE_THRESHOLD) {
        results.push({
          teamName: data.teamName,
          kpiName: data.kpiName,
          consecutiveWeeks: consecutive,
          latestIssue: sorted[0]?.issue ?? '',
        })
      }
    })

    // 연속 주차 높은 순
    results.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks)
    return results
  }, [last4WeeksReports])

  // Section H-2: 반복 ACTION 감지
  const sectionH2 = useMemo(() => {
    // 팀+KPI별 그룹핑 (최근 4주)
    const groupMap = new Map<string, {
      teamName: string
      kpiName: string
      reports: { date: string; action: string }[]
    }>()

    for (const r of last4WeeksReports) {
      const key = `${r.team_id}__${r.kpi_id}`
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          teamName: r.team_name ?? '(팀 없음)',
          kpiName: r.kpi_name ?? r.kpi_id,
          reports: [],
        })
      }
      groupMap.get(key)!.reports.push({
        date: r.report_date,
        action: r.action?.trim() ?? '',
      })
    }

    const results: {
      teamName: string
      kpiName: string
      consecutiveWeeks: number
      latestAction: string
    }[] = []

    groupMap.forEach((data) => {
      // 날짜순 정렬 (최신 먼저)
      const sorted = [...data.reports].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      // 연속으로 action이 비어있지 않고, 앞 10글자가 동일한 주 카운트
      let consecutive = 0
      const prefix = sorted[0]?.action?.slice(0, 10) ?? ''
      if (prefix) {
        for (const entry of sorted) {
          if (entry.action && entry.action.slice(0, 10) === prefix) {
            consecutive++
          } else {
            break
          }
        }
      }

      if (consecutive >= CONSECUTIVE_ISSUE_THRESHOLD) {
        results.push({
          teamName: data.teamName,
          kpiName: data.kpiName,
          consecutiveWeeks: consecutive,
          latestAction: sorted[0]?.action ?? '',
        })
      }
    })

    results.sort((a, b) => b.consecutiveWeeks - a.consecutiveWeeks)
    return results
  }, [last4WeeksReports])

  // Section I: PDCA 효과성
  const sectionI = useMemo(() => {
    const results: {
      teamName: string
      kpiName: string
      lastRate: number
      thisRate: number
      diff: number
      effective: 'positive' | 'negative'
    }[] = []

    // 이번 주 보고서 기준으로 순회
    for (const thisReport of thisWeekReports) {
      // 지난 주 같은 KPI 보고서 찾기
      const lastReport = lastWeekReports.find(r => r.kpi_id === thisReport.kpi_id && r.team_id === thisReport.team_id)
      if (!lastReport) continue

      // 지난 주에 Plan + Do 모두 작성한 경우만 (= PDCA 사이클 실행)
      if (!lastReport.plan?.trim() || !lastReport.do_action?.trim()) continue

      const lastRate = lastReport.weekly_achievement_rate ?? lastReport.monthly_achievement_rate ?? null
      const thisRate = thisReport.weekly_achievement_rate ?? thisReport.monthly_achievement_rate ?? null
      if (lastRate == null || thisRate == null) continue

      const diff = thisRate - lastRate
      results.push({
        teamName: thisReport.team_name ?? '(팀 없음)',
        kpiName: thisReport.kpi_name ?? thisReport.kpi_id,
        lastRate: Math.round(lastRate * 10) / 10,
        thisRate: Math.round(thisRate * 10) / 10,
        diff: Math.round(diff * 10) / 10,
        effective: diff >= 0 ? 'positive' : 'negative',
      })
    }

    // 효과 있는 것 먼저, 그 안에서 diff 크기순
    results.sort((a, b) => {
      if (a.effective !== b.effective) return a.effective === 'positive' ? -1 : 1
      return Math.abs(b.diff) - Math.abs(a.diff)
    })
    return results
  }, [thisWeekReports, lastWeekReports])

  // --- 렌더링 ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400 text-lg">데이터를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-w-[360px] max-w-[1200px] mx-auto print:px-2 print:py-4">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">CEO 주간 브리핑</h1>
            <p className="text-gray-400 mt-1">{thisWeek.label} (이번 주)</p>
            {(() => {
              const now = new Date()
              const deadline = new Date()
              deadline.setHours(12, 30, 0, 0)
              const isPastDeadline = now >= deadline && now.getDay() === 5
              const isFriday = now.getDay() === 5

              if (isFriday && !isPastDeadline) {
                return <p className="text-amber-400 text-sm mt-1">⏳ 보고 마감 전입니다 (마감: 금요일 12:30)</p>
              } else if (isFriday && isPastDeadline) {
                return <p className="text-green-600 text-sm mt-1">✓ 보고 마감 완료 (12:30 기준)</p>
              } else {
                return <p className="text-gray-400 text-sm mt-1">금요일 12:30 마감 기준 데이터</p>
              }
            })()}
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

      {/* --- Section F: 월간 목표 달성 예측 --- */}
      <SectionLabel icon={<CalendarCheck className="w-4 h-4" />} label="SECTION F" title="월간 목표 달성 예측" />
      <div className="mb-10 print-break">
        {sectionF.length === 0 ? (
          <EmptyState message="이번 달 보고서가 없어 예측할 수 없습니다." />
        ) : (
          <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-300">팀명</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-300">KPI</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-300">월간목표</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-300">현재누적</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-300">예측</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">상태</th>
                </tr>
              </thead>
              <tbody>
                {sectionF.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 font-medium text-white">{item.teamName}</td>
                    <td className="px-4 py-3 text-gray-200 truncate max-w-[200px]">{item.kpiName}</td>
                    <td className="text-right px-4 py-3 text-gray-300">{item.monthlyTarget.toLocaleString()}</td>
                    <td className="text-right px-4 py-3 text-gray-300">{item.currentCumulative.toLocaleString()}</td>
                    <td className="text-right px-4 py-3 font-semibold text-white">
                      {item.projected.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                    <td className="text-center px-4 py-3">
                      {item.willAchieve ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-900/30 text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          달성 예상
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-900/30 text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          미달성 위험
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* --- Section G: PDCA 작성 품질 --- */}
      <SectionLabel icon={<ClipboardCheck className="w-4 h-4" />} label="SECTION G" title="PDCA 작성 품질" />
      <div className="mb-10 print-break">
        {sectionG.length === 0 ? (
          <EmptyState message="이번 주 보고서가 없습니다." />
        ) : (
          <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-300">팀명</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">보고 수</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">평균 작성률</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">상태</th>
                </tr>
              </thead>
              <tbody>
                {sectionG.map((team, idx) => (
                  <tr key={idx} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 font-medium text-white">{team.teamName}</td>
                    <td className="text-center px-4 py-3">{team.reportCount}</td>
                    <td className="text-center px-4 py-3">
                      <span
                        className={`font-bold ${
                          team.level === 'green'
                            ? 'text-green-600'
                            : team.level === 'yellow'
                            ? 'text-amber-400'
                            : 'text-red-600'
                        }`}
                      >
                        {team.avgRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {team.level === 'green' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-900/30 text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          우수
                        </span>
                      ) : team.level === 'yellow' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-900/30 text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          보통
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-900/30 text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          미흡
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* --- Section H: 반복 이슈 감지 --- */}
      <SectionLabel icon={<Repeat className="w-4 h-4" />} label="SECTION H" title="반복 이슈 감지" />
      <div className="mb-10 print-break">
        {sectionH.length === 0 ? (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-400 font-medium">반복 이슈 없음</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectionH.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border-2 p-4 bg-red-900/20 border-red-700"
              >
                <div className="flex items-start gap-3">
                  <Repeat className="w-6 h-6 mt-0.5 flex-shrink-0 text-red-600" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded">
                        {item.teamName}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-200 text-red-400">
                        {item.consecutiveWeeks}주 연속 이슈 보고
                      </span>
                    </div>
                    <p className="font-semibold text-white mt-1 truncate">{item.kpiName}</p>
                    <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                      최근 이슈: {item.latestIssue}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Section H-2: 반복 ACTION 감지 --- */}
      <SectionLabel icon={<Repeat className="w-4 h-4" />} label="SECTION H-2" title="반복 ACTION 감지" />
      <div className="mb-10 print-break">
        {sectionH2.length === 0 ? (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-400 font-medium">반복 ACTION 없음</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectionH2.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border-2 p-4 bg-amber-900/20 border-amber-700"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0 text-amber-400" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded">
                        {item.teamName}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-400">
                        {item.consecutiveWeeks}주 연속 유사한 ACTION
                      </span>
                    </div>
                    <p className="font-semibold text-white mt-1 truncate">{item.kpiName}</p>
                    <p className="text-sm text-amber-400 mt-1 font-medium">근본 개선 필요</p>
                    <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                      ACTION: {item.latestAction}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Section I: PDCA 효과성 --- */}
      <SectionLabel icon={<Target className="w-4 h-4" />} label="SECTION I" title="PDCA 효과성" />
      <div className="mb-10 print-break">
        {sectionI.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
            <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 font-medium">비교 가능한 PDCA 데이터 없음</p>
            <p className="text-xs text-gray-400 mt-1">지난주에 Plan + Do를 모두 작성한 KPI가 없습니다</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-300">팀</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-300">KPI</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">지난주 달성률</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">이번주 달성률</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">변화</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-300">판정</th>
                </tr>
              </thead>
              <tbody>
                {sectionI.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 font-medium text-white">{item.teamName}</td>
                    <td className="px-4 py-3 text-gray-300 truncate max-w-[200px]">{item.kpiName}</td>
                    <td className="text-center px-4 py-3">{item.lastRate}%</td>
                    <td className="text-center px-4 py-3">{item.thisRate}%</td>
                    <td className="text-center px-4 py-3">
                      <span className={item.diff >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {item.diff >= 0 ? '+' : ''}{item.diff}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {item.effective === 'positive' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> 효과 있음
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" /> 효과 없음
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Section E: 미제출 현황 --- */}
      <SectionLabel icon={<Users className="w-4 h-4" />} label="SECTION E" title="미제출 현황" />
      {(() => {
        const now = new Date()
        const deadline = new Date()
        deadline.setHours(12, 30, 0, 0)
        const isBeforeFridayDeadline = now.getDay() === 5 && now < deadline
        if (isBeforeFridayDeadline) {
          return <p className="text-gray-400 text-sm mb-2">마감 전이므로 미제출 현황은 참고용입니다</p>
        }
        return null
      })()}
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
