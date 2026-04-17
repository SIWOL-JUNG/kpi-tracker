'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Team, KPI, Report, KPIGoal } from '@/types'
import { groupKpisByCategoryProgram } from '@/lib/kpi-utils'
import { Save, Edit2, Trash2, RefreshCw, FileText, Target, Calendar, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Users } from 'lucide-react'
import Notification from '@/components/Notification'
import ConfirmModal from '@/components/ConfirmModal'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'

// 일괄 입력 모드용 KPI별 폼 데이터 타입
interface BatchKPIFormData {
  weekly_target: string
  weekly_achievement: string
  strategy: string
  plan: string
  action_executed: boolean
  do_action: string
  check_result: string
  action: string
  issue: string
  help_needed: string
}

// 빈 일괄 폼 데이터 생성
const createEmptyBatchForm = (): BatchKPIFormData => ({
  weekly_target: '',
  weekly_achievement: '',
  strategy: '',
  plan: '',
  action_executed: false,
  do_action: '',
  check_result: '',
  action: '',
  issue: '',
  help_needed: '',
})

export default function ReportsPage() {
  // 모드 전환 상태
  const [mode, setMode] = useState<'batch' | 'individual'>('batch')

  // === 공통 상태 ===
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [kpiGoals, setKpiGoals] = useState<KPIGoal[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)

  // === 개별 입력 모드 상태 ===
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [selectedKPI, setSelectedKPI] = useState<string>('')
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [planAutoFilled, setPlanAutoFilled] = useState(false)

  const [form, setForm] = useState({
    report_date: new Date().toISOString().split('T')[0],
    weekly_target: '',
    weekly_achievement: '',
    monthly_target: '',
    monthly_cumulative: '',
    strategy: '',
    plan: '',
    action_executed: false,
    do_action: '',
    check_result: '',
    action: '',
    issue: '',
    help_needed: ''
  })

  // === 일괄 입력 모드 상태 ===
  const [batchTeamId, setBatchTeamId] = useState<string>('')
  const [batchDate, setBatchDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [batchFormData, setBatchFormData] = useState<Record<string, BatchKPIFormData>>({})
  const [batchExpandedKpis, setBatchExpandedKpis] = useState<Set<string>>(new Set())
  const [batchSaving, setBatchSaving] = useState(false)

  // === 공통 데이터 로드 ===
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [teamsData, kpisData, goalsData, reportsData] = await Promise.all([
        fetch('/api/teams').then(r => { if (!r.ok) throw new Error('팀 데이터 로드 실패'); return r.json() }),
        fetch('/api/kpis').then(r => { if (!r.ok) throw new Error('KPI 데이터 로드 실패'); return r.json() }),
        fetch('/api/kpi-goals').then(r => { if (!r.ok) throw new Error('목표 데이터 로드 실패'); return r.json() }),
        fetch('/api/reports?limit=500').then(r => { if (!r.ok) throw new Error('보고서 데이터 로드 실패'); return r.json() }),
      ])
      setTeams(teamsData)
      const formatted = kpisData.map((k: Record<string, unknown>) => ({
        ...k,
        team_name: (k.teams as Record<string, unknown>)?.name,
        status: (k as Record<string, unknown>).status || 'active',
      }))
      setKpis(formatted as KPI[])
      setKpiGoals(goalsData)
      setReports(reportsData as Report[])
    } catch (e) {
      console.error('Error:', e)
      showNotif('error', '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // ============================================================
  // 일괄 입력 모드 로직
  // ============================================================

  // 일괄: 보고일자의 월 (YYYY-MM)
  const batchReportMonth = batchDate ? batchDate.substring(0, 7) : ''

  // 일괄: 첫 팀 자동 선택
  useEffect(() => {
    if (teams.length > 0 && !batchTeamId) {
      setBatchTeamId(teams[0].id)
    }
  }, [teams, batchTeamId])

  // 일괄: 팀 선택 시 해당 팀의 모든 KPI를 펼침 (PDCA 기본 표시)
  useEffect(() => {
    if (batchTeamId && kpis.length > 0) {
      const teamKpiIds = kpis.filter(k => k.team_id === batchTeamId && k.status === 'active').map(k => k.id)
      setBatchExpandedKpis(new Set(teamKpiIds))
    }
  }, [batchTeamId, kpis])

  // 일괄: 선택된 팀의 활성 KPI 목록
  const batchTeamKpis = kpis.filter(k => k.team_id === batchTeamId && k.status === 'active')

  // 일괄: 팀/날짜 변경 시 폼 데이터 초기화 및 기존 보고서/이전 ACTION 로드
  useEffect(() => {
    if (!batchTeamId || !batchDate || batchTeamKpis.length === 0) return

    const newFormData: Record<string, BatchKPIFormData> = {}

    const reportMonth = batchDate.substring(0, 7)

    batchTeamKpis.forEach(kpi => {
      const existingReport = reports.find(
        r => r.kpi_id === kpi.id && r.report_date === batchDate
      )

      // weekly_target 초기값 우선순위: 같은 날짜 보고서 → 같은 월 다른 보고서 → 월별 목표 → KPI 기본값
      const sameMonthReport = reports.find(
        r => r.kpi_id === kpi.id && r.report_date.substring(0, 7) === reportMonth
      )
      const monthGoal = kpiGoals.find(g => g.kpi_id === kpi.id && g.goal_month === reportMonth)
      const initialWeeklyTarget =
        existingReport?.weekly_target ??
        sameMonthReport?.weekly_target ??
        monthGoal?.weekly_target ??
        kpi.weekly_target ??
        null

      if (existingReport) {
        newFormData[kpi.id] = {
          weekly_target: initialWeeklyTarget != null ? String(initialWeeklyTarget) : '',
          weekly_achievement: existingReport.weekly_achievement != null ? String(existingReport.weekly_achievement) : '',
          strategy: existingReport.strategy || '',
          plan: existingReport.plan || '',
          action_executed: existingReport.action_executed || false,
          do_action: existingReport.do_action || '',
          check_result: existingReport.check_result || '',
          action: existingReport.action || '',
          issue: existingReport.issue || '',
          help_needed: existingReport.help_needed || '',
        }
      } else {
        const batchForm = createEmptyBatchForm()
        batchForm.weekly_target = initialWeeklyTarget != null ? String(initialWeeklyTarget) : ''

        // 직전 보고서의 전략 → 이번 전략, ACTION → 이번 PLAN 자동 채움
        const prevReports = reports
          .filter(r => r.kpi_id === kpi.id && r.report_date < batchDate)
          .sort((a, b) => b.report_date.localeCompare(a.report_date))
        const prevReport = prevReports[0]
        if (prevReport?.strategy) {
          batchForm.strategy = prevReport.strategy
        }
        if (prevReport?.action) {
          batchForm.plan = prevReport.action
        }

        newFormData[kpi.id] = batchForm
      }
    })

    setBatchFormData(newFormData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchTeamId, batchDate, reports, kpis])

  // 일괄: KPI별 월간 목표 조회
  const batchGetMonthlyTarget = useCallback((kpi: KPI): number => {
    if (!batchReportMonth) return kpi.monthly_target || 0

    const sameMonthReport = reports.find(
      r => r.kpi_id === kpi.id && r.report_date.substring(0, 7) === batchReportMonth
    )
    if (sameMonthReport?.monthly_target) return sameMonthReport.monthly_target

    const goal = kpiGoals.find(g => g.kpi_id === kpi.id && g.goal_month === batchReportMonth)
    if (goal) return goal.monthly_target

    return kpi.monthly_target || 0
  }, [batchReportMonth, reports, kpiGoals])

  // 일괄: KPI별 주간 목표 조회 (입력 폼 우선, 폴백: 같은달 보고서 → 월별 목표 → KPI 기본값)
  const batchGetWeeklyTarget = useCallback((kpi: KPI): number => {
    const formValue = batchFormData[kpi.id]?.weekly_target
    if (formValue !== undefined && formValue !== '') {
      const parsed = parseFloat(formValue)
      if (!isNaN(parsed)) return parsed
    }

    if (!batchReportMonth) return kpi.weekly_target || 0

    const sameMonthReport = reports.find(
      r => r.kpi_id === kpi.id && r.report_date.substring(0, 7) === batchReportMonth
    )
    if (sameMonthReport?.weekly_target) return sameMonthReport.weekly_target

    const goal = kpiGoals.find(g => g.kpi_id === kpi.id && g.goal_month === batchReportMonth)
    if (goal) return goal.weekly_target

    return kpi.weekly_target || 0
  }, [batchFormData, batchReportMonth, reports, kpiGoals])

  // 일괄: 월간 누적 계산
  const batchCalcMonthlyCumulative = useCallback((kpiId: string): number => {
    if (!batchReportMonth) return 0

    const prevSum = reports
      .filter(r =>
        r.kpi_id === kpiId &&
        r.report_date.substring(0, 7) === batchReportMonth &&
        r.report_date < batchDate &&
        r.report_date !== batchDate
      )
      .reduce((sum, r) => sum + (r.weekly_achievement || 0), 0)

    const currentWeekly = parseFloat(batchFormData[kpiId]?.weekly_achievement || '0')
    return prevSum + currentWeekly
  }, [batchReportMonth, batchDate, reports, batchFormData])

  // 일괄: 주간 달성률 계산
  const batchCalcWeeklyRate = useCallback((kpi: KPI): string => {
    const target = batchGetWeeklyTarget(kpi)
    const achievement = parseFloat(batchFormData[kpi.id]?.weekly_achievement || '0')
    if (target > 0 && achievement > 0) {
      if (kpi.direction === 'lower_better') return ((target / achievement) * 100).toFixed(1)
      return ((achievement / target) * 100).toFixed(1)
    }
    return '-'
  }, [batchFormData, batchGetWeeklyTarget])

  // 일괄: 월간 달성률 계산
  const batchCalcMonthlyRate = useCallback((kpi: KPI): string => {
    const target = batchGetMonthlyTarget(kpi)
    const cumulative = batchCalcMonthlyCumulative(kpi.id)
    if (target > 0 && cumulative > 0) {
      if (kpi.direction === 'lower_better') return ((target / cumulative) * 100).toFixed(1)
      return ((cumulative / target) * 100).toFixed(1)
    }
    return '-'
  }, [batchGetMonthlyTarget, batchCalcMonthlyCumulative])

  // 일괄: 폼 데이터 업데이트
  const batchUpdateForm = (kpiId: string, field: keyof BatchKPIFormData, value: string | boolean) => {
    setBatchFormData(prev => ({
      ...prev,
      [kpiId]: {
        ...(prev[kpiId] || createEmptyBatchForm()),
        [field]: value,
      },
    }))
  }

  // 일괄: PDCA 섹션 토글
  const batchToggleExpand = (kpiId: string) => {
    setBatchExpandedKpis(prev => {
      const next = new Set(prev)
      if (next.has(kpiId)) {
        next.delete(kpiId)
      } else {
        next.add(kpiId)
      }
      return next
    })
  }

  // 일괄: 데이터가 입력된 KPI 수
  const batchFilledCount = batchTeamKpis.filter(kpi => {
    const batchForm = batchFormData[kpi.id]
    return batchForm && batchForm.weekly_achievement !== ''
  }).length

  // 일괄: 데이터가 있는 KPI인지 확인
  const batchHasData = (kpiId: string): boolean => {
    const batchForm = batchFormData[kpiId]
    if (!batchForm) return false
    return batchForm.weekly_achievement !== ''
  }

  // 일괄: 달성률 색상
  const batchGetRateColor = (rateStr: string): string => {
    if (rateStr === '-') return 'text-gray-400'
    const rate = parseFloat(rateStr)
    if (rate >= 100) return 'text-green-600'
    if (rate >= 80) return 'text-blue-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 일괄: 전체 저장
  const handleBatchSaveAll = async () => {
    if (batchSaving) return

    const kpisToSave = batchTeamKpis.filter(kpi => batchHasData(kpi.id))

    if (kpisToSave.length === 0) {
      showNotif('error', '저장할 데이터가 없습니다. 주간 달성값을 입력해주세요.')
      return
    }

    setBatchSaving(true)
    let savedCount = 0
    let errorCount = 0
    const savedReportIds: { kpi: KPI; reportId: string; form: BatchKPIFormData }[] = []

    try {
      for (const kpi of kpisToSave) {
        const batchForm = batchFormData[kpi.id]
        if (!batchForm) continue

        const monthlyTarget = batchGetMonthlyTarget(kpi)
        const weeklyTarget = batchGetWeeklyTarget(kpi)
        const weeklyAchievement = parseFloat(batchForm.weekly_achievement || '0')
        const monthlyCumulative = batchCalcMonthlyCumulative(kpi.id)
        const isLowerBetter = kpi.direction === 'lower_better'
        const weeklyRate = weeklyTarget > 0 && weeklyAchievement > 0
          ? (isLowerBetter ? (weeklyTarget / weeklyAchievement) * 100 : (weeklyAchievement / weeklyTarget) * 100)
          : 0
        const monthlyRate = monthlyTarget > 0 && monthlyCumulative > 0
          ? (isLowerBetter ? (monthlyTarget / monthlyCumulative) * 100 : (monthlyCumulative / monthlyTarget) * 100)
          : 0

        const reportBody = {
          kpi_id: kpi.id,
          team_id: batchTeamId,
          report_date: batchDate,
          monthly_target: monthlyTarget,
          weekly_target: weeklyTarget,
          weekly_achievement: weeklyAchievement,
          weekly_achievement_rate: parseFloat(weeklyRate.toFixed(2)),
          monthly_cumulative: monthlyCumulative,
          monthly_achievement_rate: parseFloat(monthlyRate.toFixed(2)),
          strategy: batchForm.strategy || null,
          plan: batchForm.plan || null,
          action_executed: batchForm.action_executed ? 1 : null,
          do_action: batchForm.do_action || null,
          check_result: batchForm.check_result || null,
          action: batchForm.action || null,
          issue: batchForm.issue || null,
          help_needed: batchForm.help_needed || null,
        }

        try {
          const res = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportBody),
          })

          if (!res.ok) throw new Error('저장 실패')

          const savedReport = await res.json()
          savedCount++
          savedReportIds.push({ kpi, reportId: savedReport.id, form: batchForm })
        } catch {
          errorCount++
        }
      }

      // 해결과제(issue)가 있는 보고서 → 액션 아이템 자동 생성
      for (const { kpi, reportId, form: batchForm } of savedReportIds) {
        if (batchForm.issue && batchForm.issue.trim()) {
          try {
            await fetch('/api/action-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                report_id: reportId,
                team_id: batchTeamId,
                kpi_id: kpi.id,
                content: batchForm.issue.trim(),
                status: 'open',
              }),
            })
          } catch {
            // 액션 아이템 생성 실패는 무시
          }
        }
      }

      if (errorCount > 0) {
        showNotif('error', `${savedCount}개 저장, ${errorCount}개 실패`)
      } else {
        showNotif('success', `${savedCount}개 KPI 보고서 저장 완료`)
      }

      // 보고서 목록 새로고침
      const reportsData = await fetch('/api/reports?limit=500').then(r => r.json())
      setReports(reportsData as Report[])
    } catch {
      showNotif('error', '저장 중 오류가 발생했습니다.')
    } finally {
      setBatchSaving(false)
    }
  }

  // ============================================================
  // 개별 입력 모드 로직
  // ============================================================

  // 개별: 팀별 KPI 필터
  const filteredKPIs = selectedTeam
    ? kpis.filter(k => k.team_id === selectedTeam)
    : kpis

  // 개별: 선택된 KPI 정보
  const selectedKPIInfo = kpis.find(k => k.id === selectedKPI)

  // 개별: 보고일자의 월 (YYYY-MM)
  const reportMonth = form.report_date ? form.report_date.substring(0, 7) : ''

  // 개별: 해당 월의 KPI 목표 조회
  const currentGoal = selectedKPI && reportMonth
    ? kpiGoals.find(g => g.kpi_id === selectedKPI && g.goal_month === reportMonth)
    : null

  // 개별: KPI + 날짜 선택 시 목표값 자동 채움
  useEffect(() => {
    if (!selectedKPI || !reportMonth) return
    if (editingReportId) return

    const sameMonthReport = reports.find(r =>
      r.kpi_id === selectedKPI &&
      r.report_date.substring(0, 7) === reportMonth
    )

    if (sameMonthReport?.monthly_target || sameMonthReport?.weekly_target) {
      setForm(prev => ({
        ...prev,
        monthly_target: String(sameMonthReport.monthly_target ?? prev.monthly_target),
        weekly_target: String(sameMonthReport.weekly_target ?? prev.weekly_target),
      }))
      return
    }

    const goal = kpiGoals.find(g => g.kpi_id === selectedKPI && g.goal_month === reportMonth)
    if (goal) {
      setForm(prev => ({
        ...prev,
        monthly_target: String(goal.monthly_target ?? ''),
        weekly_target: String(goal.weekly_target ?? ''),
      }))
      return
    }

    const kpi = kpis.find(k => k.id === selectedKPI)
    setForm(prev => ({
      ...prev,
      monthly_target: String(kpi?.monthly_target ?? ''),
      weekly_target: String(kpi?.weekly_target ?? ''),
    }))
  }, [selectedKPI, reportMonth, kpiGoals, kpis, reports, editingReportId])

  // 개별: 직전 보고서의 ACTION → 이번 PLAN 자동 채움
  useEffect(() => {
    if (!selectedKPI || editingReportId) return

    const prev = reports.find(r =>
      r.kpi_id === selectedKPI &&
      r.report_date < form.report_date &&
      r.id !== editingReportId
    )

    if (prev?.action) {
      setForm(prevForm => ({
        ...prevForm,
        plan: prev.action || '',
      }))
      setPlanAutoFilled(true)
    } else {
      setPlanAutoFilled(false)
    }
  }, [selectedKPI, form.report_date, reports, editingReportId])

  // 개별: 월간누적 자동 계산
  const calcMonthlyCumulative = () => {
    if (!selectedKPI || !reportMonth) return 0

    const prevSum = reports
      .filter(r =>
        r.kpi_id === selectedKPI &&
        r.report_date.substring(0, 7) === reportMonth &&
        r.report_date < form.report_date &&
        r.id !== editingReportId
      )
      .reduce((sum, r) => sum + (r.weekly_achievement || 0), 0)

    const currentWeekly = parseFloat(form.weekly_achievement || '0')
    return prevSum + currentWeekly
  }

  const monthlyCumulative = calcMonthlyCumulative()

  // 개별: 주간달성률 계산
  const calcWeeklyRate = () => {
    const target = parseFloat(form.weekly_target || '0')
    const achievement = parseFloat(form.weekly_achievement || '0')
    if (target > 0 && achievement > 0) {
      const kpiInfo = kpis.find(k => k.id === selectedKPI)
      if (kpiInfo?.direction === 'lower_better') return ((target / achievement) * 100).toFixed(2)
      return ((achievement / target) * 100).toFixed(2)
    }
    return ''
  }

  // 개별: 월간달성률 계산
  const calcMonthlyRate = () => {
    const target = parseFloat(form.monthly_target || '0')
    if (target > 0 && monthlyCumulative > 0) {
      const kpiInfo = kpis.find(k => k.id === selectedKPI)
      if (kpiInfo?.direction === 'lower_better') return ((target / monthlyCumulative) * 100).toFixed(2)
      return ((monthlyCumulative / target) * 100).toFixed(2)
    }
    return ''
  }

  // 개별: 달성률 색상 (값 텍스트용)
  const getRateColor = (rate: number) => {
    if (rate >= 100) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 개별: 달성률 상태 색상 (배지용)
  const getStatusColor = (rate: number) => {
    if (rate >= 100) return 'text-green-600 bg-green-900/30'
    if (rate >= 70) return 'text-yellow-600 bg-yellow-900/30'
    return 'text-red-600 bg-red-900/30'
  }

  // 개별: PDCA 왼쪽 테두리 색상 맵
  const pdcaBorderColors: Record<string, string> = {
    strategy: 'border-l-4 border-l-gray-300',
    plan: 'border-l-4 border-l-blue-400',
    do_action: 'border-l-4 border-l-gray-300',
    check_result: 'border-l-4 border-l-gray-300',
    action: 'border-l-4 border-l-gray-300',
    issue: 'border-l-4 border-l-red-400',
    help_needed: 'border-l-4 border-l-yellow-400',
  }

  // 개별: 보고서 저장 (upsert)
  const handleSave = async () => {
    if (!selectedTeam || !selectedKPI) {
      showNotif('error', '팀과 KPI를 선택해주세요.')
      return
    }
    if (!form.report_date) {
      showNotif('error', '보고일자를 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      const weeklyRate = parseFloat(calcWeeklyRate() || '0')
      const monthlyRate = parseFloat(calcMonthlyRate() || '0')

      const data = {
        team_id: selectedTeam,
        kpi_id: selectedKPI,
        report_date: form.report_date,
        monthly_target: form.monthly_target ? parseFloat(form.monthly_target) : null,
        weekly_target: form.weekly_target ? parseFloat(form.weekly_target) : null,
        weekly_achievement: form.weekly_achievement ? parseFloat(form.weekly_achievement) : null,
        weekly_achievement_rate: weeklyRate || null,
        monthly_cumulative: monthlyCumulative || null,
        monthly_achievement_rate: monthlyRate || null,
        strategy: form.strategy || null,
        plan: form.plan || null,
        action_executed: form.action_executed ? 1 : null,
        do_action: form.do_action || null,
        check_result: form.check_result || null,
        action: form.action || null,
        issue: form.issue || null,
        help_needed: form.help_needed || null,
      }

      let res: Response
      if (editingReportId) {
        res = await fetch('/api/reports', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingReportId, ...data }),
        })
      } else {
        res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }

      const resBody = await res.json().catch(() => ({}))
      const resId = editingReportId || resBody.id

      showNotif('success', editingReportId ? '보고서가 수정되었습니다.' : '보고서가 저장되었습니다.')

      // 이슈가 있으면 액션 아이템 자동 생성
      if (data.issue && resId) {
        try {
          const existingActions = await fetch(`/api/action-items?report_id=${resId}`).then(r => r.json())
          if (existingActions.length === 0) {
            await fetch('/api/action-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                report_id: resId,
                team_id: selectedTeam,
                kpi_id: selectedKPI,
                content: data.issue,
                status: 'open',
              }),
            })
          }
        } catch (e) {
          console.error('Action item auto-create failed:', e)
        }
      }

      resetForm()
      fetchData()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e)
      console.error('Error saving:', errMsg)
      showNotif('error', `저장 오류: ${errMsg}`)
    } finally {
      setSaving(false)
    }
  }

  // 개별: 보고서 수정 모드 진입
  const handleEdit = (report: Report) => {
    setMode('individual')
    setSelectedTeam(report.team_id)
    setSelectedKPI(report.kpi_id)
    setEditingReportId(report.id)
    setPlanAutoFilled(false)
    setForm({
      report_date: report.report_date,
      monthly_target: report.monthly_target?.toString() || '',
      weekly_target: report.weekly_target?.toString() || '',
      weekly_achievement: report.weekly_achievement?.toString() || '',
      monthly_cumulative: report.monthly_cumulative?.toString() || '',
      strategy: report.strategy || '',
      plan: report.plan || '',
      action_executed: report.action_executed || false,
      do_action: report.do_action || '',
      check_result: report.check_result || '',
      action: report.action || '',
      issue: report.issue || '',
      help_needed: report.help_needed || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 개별: 보고서 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/reports?id=${deleteTarget}`, { method: 'DELETE' })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }
      showNotif('success', '보고서가 삭제되었습니다.')
      if (editingReportId === deleteTarget) resetForm()
      fetchData()
    } catch (e) {
      console.error('Error deleting:', e)
      showNotif('error', '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleteTarget(null)
    }
  }

  // 개별: 폼 초기화
  const resetForm = () => {
    setEditingReportId(null)
    setSelectedKPI('')
    setPlanAutoFilled(false)
    setForm({
      report_date: new Date().toISOString().split('T')[0],
      weekly_target: '',
      weekly_achievement: '',
      monthly_target: '',
      monthly_cumulative: '',
      strategy: '',
      plan: '',
      action_executed: false,
      do_action: '',
      check_result: '',
      action: '',
      issue: '',
      help_needed: ''
    })
  }

  // ============================================================
  // 렌더링
  // ============================================================

  if (loading) {
    return <LoadingSpinner message="데이터를 불러오는 중..." />
  }

  // 탭 스타일
  const activeTabClass = 'bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium'
  const inactiveTabClass = 'bg-gray-900 text-gray-300 border-2 border-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700'

  return (
    <div className={mode === 'batch' ? 'max-w-4xl mx-auto p-4 pb-28' : 'max-w-7xl mx-auto p-4 md:p-6'}>
      {/* 알림 */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* 삭제 확인 모달 (개별 모드용) */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="보고서 삭제"
        message="이 보고서를 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 헤더 */}
      <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden mb-6">
        <div className="h-1 bg-blue-600"></div>
        <div className="p-5">
          <h2 className="text-2xl font-bold text-white">
            {mode === 'batch'
              ? '주간 보고서 일괄 입력'
              : editingReportId
                ? '보고서 수정'
                : '보고서 개별 입력'
            }
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'batch'
              ? '팀의 모든 KPI 보고서를 한 번에 작성하고 저장합니다.'
              : editingReportId
                ? '수정 후 저장 버튼을 클릭하세요'
                : '팀장 회의를 위한 주간 보고서를 입력하세요'
            }
          </p>
        </div>
      </div>

      {/* 탭 전환 버튼 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('batch')}
          className={mode === 'batch' ? activeTabClass : inactiveTabClass}
        >
          일괄 입력
        </button>
        <button
          onClick={() => setMode('individual')}
          className={mode === 'individual' ? activeTabClass : inactiveTabClass}
        >
          개별 입력
        </button>
      </div>

      {/* ============================================================ */}
      {/* 일괄 입력 모드 */}
      {/* ============================================================ */}
      {mode === 'batch' && (
        <>
          {/* 팀 선택 */}
          <div className="bg-gray-900 rounded-xl border-2 border-gray-700 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">팀 선택</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setBatchTeamId(team.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    batchTeamId === team.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          {/* 보고 날짜 선택 */}
          <div className="bg-gray-900 rounded-xl border-2 border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">보고 날짜</span>
            </div>
            <input
              type="date"
              value={batchDate}
              onChange={e => setBatchDate(e.target.value)}
              className="px-4 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* KPI 카드 목록 */}
          {batchTeamKpis.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border-2 border-gray-700 p-8 text-center">
              <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">선택된 팀에 활성 KPI가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const groups = groupKpisByCategoryProgram(batchTeamKpis)
                let lastCategory: string | null | undefined = undefined
                return groups.map((group, gi) => {
                  const showCategoryHeader = group.category && group.category !== lastCategory
                  if (group.category) lastCategory = group.category
                  return (
                    <React.Fragment key={gi}>
                      {showCategoryHeader && (
                        <div className="px-4 py-2 bg-gray-800/70 rounded-lg border border-gray-700">
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{group.category}</span>
                        </div>
                      )}
                      {group.program && (
                        <div className="px-4 py-1.5 pl-6">
                          <span className="text-xs font-semibold text-gray-400">{group.program}</span>
                        </div>
                      )}
                      {group.kpis.map(kpi => {
                const batchForm = batchFormData[kpi.id] || createEmptyBatchForm()
                const isExpanded = batchExpandedKpis.has(kpi.id)
                const filled = batchHasData(kpi.id)
                const monthlyTarget = batchGetMonthlyTarget(kpi)
                const weeklyRateStr = batchCalcWeeklyRate(kpi)
                const monthlyRateStr = batchCalcMonthlyRate(kpi)
                const batchMonthlyCumulative = batchCalcMonthlyCumulative(kpi.id)

                return (
                  <div
                    key={kpi.id}
                    className={`bg-gray-900 rounded-xl border-2 transition-colors ${
                      filled
                        ? 'border-gray-700 border-l-4 border-l-green-600'
                        : 'border-gray-700'
                    }`}
                  >
                    {/* KPI 헤더 */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{kpi.name}</h3>
                          <span className="px-2 py-0.5 bg-blue-900/20 text-blue-400 text-xs font-medium rounded-full">
                            {kpi.unit}
                          </span>
                        </div>
                        {filled && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>

                      {/* 목표 정보 */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
                        <span>월간 목표: <span className="font-medium text-gray-300">{monthlyTarget.toLocaleString()}</span></span>
                      </div>

                      {/* 주간 목표 + 주간 달성 입력 */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            주간 목표
                          </label>
                          <input
                            type="number"
                            value={batchForm.weekly_target}
                            onChange={e => batchUpdateForm(kpi.id, 'weekly_target', e.target.value)}
                            placeholder="주간 목표값"
                            className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            주간 달성
                          </label>
                          <input
                            type="number"
                            value={batchForm.weekly_achievement}
                            onChange={e => batchUpdateForm(kpi.id, 'weekly_achievement', e.target.value)}
                            placeholder="이번 주 달성값 입력"
                            className="w-full px-4 py-3 text-lg font-semibold border-2 border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* 자동 계산 지표 */}
                      {batchForm.weekly_achievement !== '' && (
                        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-800/50 rounded-lg text-sm">
                          <div>
                            <span className="text-gray-400 text-xs">주간달성률</span>
                            <p className={`font-bold ${batchGetRateColor(weeklyRateStr)}`}>
                              {weeklyRateStr === '-' ? '-' : `${weeklyRateStr}%`}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">월간누적</span>
                            <p className="font-bold text-gray-200">{batchMonthlyCumulative.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">월간달성률</span>
                            <p className={`font-bold ${batchGetRateColor(monthlyRateStr)}`}>
                              {monthlyRateStr === '-' ? '-' : `${monthlyRateStr}%`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PDCA 토글 버튼 */}
                    <button
                      onClick={() => batchToggleExpand(kpi.id)}
                      className="w-full flex items-center justify-center gap-1 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700 border-t border-gray-700 transition-colors"
                    >
                      {isExpanded ? (
                        <>PDCA 접기 <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>PDCA 펼치기 <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>

                    {/* PDCA 섹션 (확장 시) */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-700 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            전략
                            {batchForm.strategy && reports.some(r => r.kpi_id === kpi.id && r.report_date < batchDate && r.strategy === batchForm.strategy) && (
                              <span className="ml-1 text-blue-500">(이전 주에서 가져옴)</span>
                            )}
                          </label>
                          <textarea
                            rows={2}
                            value={batchForm.strategy}
                            onChange={e => batchUpdateForm(kpi.id, 'strategy', e.target.value)}
                            placeholder="전략적 방향"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            PLAN
                            {batchForm.plan && reports.some(r => r.kpi_id === kpi.id && r.report_date < batchDate && r.action === batchForm.plan) && (
                              <span className="ml-1 text-blue-500">(이전 주 ACTION에서 가져옴)</span>
                            )}
                          </label>
                          <textarea
                            rows={2}
                            value={batchForm.plan}
                            onChange={e => batchUpdateForm(kpi.id, 'plan', e.target.value)}
                            placeholder="이번 주 계획"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        {/* 지난주 ACTION 실행 여부 체크박스 */}
                        {(() => {
                          const prevBatchReport = reports.find(
                            r => r.kpi_id === kpi.id && r.report_date < batchDate && r.action
                          )
                          return prevBatchReport?.action ? (
                            <div className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-xl border-2 border-blue-700">
                              <input
                                type="checkbox"
                                checked={batchForm.action_executed || false}
                                onChange={(e) => batchUpdateForm(kpi.id, 'action_executed', e.target.checked)}
                                className="w-5 h-5 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <p className="text-sm font-medium text-white">지난주 ACTION 실행 완료</p>
                                <p className="text-xs text-gray-400 mt-0.5">&quot;{prevBatchReport.action}&quot;</p>
                              </div>
                            </div>
                          ) : null
                        })()}
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">DO</label>
                          <textarea
                            rows={2}
                            value={batchForm.do_action}
                            onChange={e => batchUpdateForm(kpi.id, 'do_action', e.target.value)}
                            placeholder="실행한 내용"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">CHECK</label>
                          {/* CHECK 필드 위에 시스템 수치 자동 표시 */}
                          {(() => {
                            const prevReports = reports.filter(r => r.kpi_id === kpi.id && r.report_date < batchDate).sort((a,b) => b.report_date.localeCompare(a.report_date))
                            const lastReport = prevReports[0]
                            const currentAchievement = parseFloat(batchForm.weekly_achievement || '0')
                            const lastAchievement = lastReport?.weekly_achievement || 0
                            const diff = currentAchievement - lastAchievement
                            if (lastReport) {
                              return (
                                <div className="bg-gray-800/50 rounded-lg px-3 py-2 mb-2 text-xs text-gray-300 border border-gray-700">
                                  <span className="font-medium">시스템 분석:</span>
                                  {' '}주간달성 {currentAchievement.toLocaleString()} (전주 {lastAchievement.toLocaleString()},{' '}
                                  <span className={diff >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                                  </span>)
                                  {' '}| 달성률 {batchCalcWeeklyRate(kpi)}%
                                </div>
                              )
                            }
                            return null
                          })()}
                          <textarea
                            rows={2}
                            value={batchForm.check_result}
                            onChange={e => batchUpdateForm(kpi.id, 'check_result', e.target.value)}
                            placeholder="점검 결과"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">ACTION</label>
                          <textarea
                            rows={2}
                            value={batchForm.action}
                            onChange={e => batchUpdateForm(kpi.id, 'action', e.target.value)}
                            placeholder="개선 조치 (다음 주 PLAN에 자동 반영)"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-orange-500" />
                            해결과제
                            <span className="text-orange-500 text-xs">(입력 시 액션 아이템 자동 생성)</span>
                          </label>
                          <textarea
                            rows={2}
                            value={batchForm.issue}
                            onChange={e => batchUpdateForm(kpi.id, 'issue', e.target.value)}
                            placeholder="이슈 / 해결과제"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">필요한 도움</label>
                          <textarea
                            rows={2}
                            value={batchForm.help_needed}
                            onChange={e => batchUpdateForm(kpi.id, 'help_needed', e.target.value)}
                            placeholder="필요한 도움 / 지원 요청"
                            className="w-full px-3 py-2 border-2 border-gray-700 rounded-xl text-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
                    </React.Fragment>
                  )
                })
              })()}
            </div>
          )}

          {/* 하단 고정 푸터 */}
          {batchTeamKpis.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-gray-700 shadow-lg z-40">
              <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  <span className={`font-semibold ${batchFilledCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {batchFilledCount}
                  </span>
                  <span className="text-gray-400"> / {batchTeamKpis.length} KPI 입력됨</span>
                </div>
                <button
                  onClick={handleBatchSaveAll}
                  disabled={batchSaving || batchFilledCount === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    batchSaving || batchFilledCount === 0
                      ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {batchSaving ? '저장 중...' : '전체 저장'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* 개별 입력 모드 */}
      {/* ============================================================ */}
      {mode === 'individual' && (
        <>
          {/* 요약 카드 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">요약</span>
              <div className="h-px bg-gray-700 flex-1"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={FileText} label="총 보고서" value={reports.length} color="blue" />
              <StatCard icon={Target} label="KPI 수" value={kpis.length} color="green" />
              <StatCard icon={Calendar} label="오늘" value={new Date().toLocaleDateString('ko-KR')} color="blue" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 입력 폼 */}
            <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
              <div className="h-1 bg-blue-600"></div>
              <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">
                  {editingReportId ? '보고서 수정' : '보고서 작성'}
                </h3>
                <div className="flex gap-2">
                  {editingReportId && (
                    <button
                      onClick={resetForm}
                      className="text-sm text-gray-400 hover:text-gray-300 border border-gray-700 rounded-xl px-3 py-1"
                    >
                      수정 취소
                    </button>
                  )}
                  <button onClick={fetchData} className="text-gray-400 hover:text-gray-300 hover:bg-gray-700 p-2 rounded-xl transition">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* 섹션: 팀/KPI 선택 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase px-2">팀 / KPI 선택</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">팀 *</label>
                      <select
                        value={selectedTeam}
                        onChange={(e) => {
                          setSelectedTeam(e.target.value)
                          setSelectedKPI('')
                          if (!editingReportId) resetForm()
                          setSelectedTeam(e.target.value)
                        }}
                        className="w-full border border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">팀 선택</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">KPI *</label>
                      <select
                        value={selectedKPI}
                        onChange={(e) => setSelectedKPI(e.target.value)}
                        className="w-full border border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={!selectedTeam}
                      >
                        <option value="">KPI 선택</option>
                        {(() => {
                          const groups = groupKpisByCategoryProgram(filteredKPIs)
                          return groups.map((g, i) => {
                            const label = [g.category, g.program].filter(Boolean).join(' > ') || '미분류'
                            return (
                              <optgroup key={i} label={label}>
                                {g.kpis.map(kpi => (
                                  <option key={kpi.id} value={kpi.id}>{kpi.name}</option>
                                ))}
                              </optgroup>
                            )
                          })
                        })()}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 섹션: 보고일자 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase px-2">보고일자</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">보고일자 *</label>
                    <input
                      type="date"
                      value={form.report_date}
                      onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                      className="w-full border border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* 섹션: KPI 정보 */}
                {selectedKPIInfo && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px bg-gray-700 flex-1"></div>
                      <span className="text-xs font-semibold text-gray-400 uppercase px-2">KPI 정보</span>
                      <div className="h-px bg-gray-700 flex-1"></div>
                    </div>
                    <div className="bg-blue-900/20 rounded-xl p-3 text-sm border border-blue-700">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-blue-600">
                          {reportMonth ? `${reportMonth.replace('-', '년 ')}월 목표` : 'KPI 정보'}
                        </span>
                        {currentGoal && (
                          <span className="text-xs text-blue-600 bg-blue-900/30 px-2 py-0.5 rounded">월별 목표 적용됨</span>
                        )}
                      </div>
                      {selectedKPIInfo.yearly_target && (
                        <p><strong>연간목표:</strong> {selectedKPIInfo.yearly_target.toLocaleString()}</p>
                      )}
                      <p><strong>월간목표:</strong> {currentGoal?.monthly_target?.toLocaleString() ?? selectedKPIInfo.monthly_target?.toLocaleString() ?? '-'}</p>
                      <p><strong>주간목표:</strong> {currentGoal?.weekly_target?.toLocaleString() ?? selectedKPIInfo.weekly_target?.toLocaleString() ?? '-'}</p>
                      <p><strong>단위:</strong> {selectedKPIInfo.unit || '-'}</p>
                    </div>
                  </div>
                )}

                {/* 섹션: 목표 및 실적 입력 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase px-2">목표 / 실적 입력</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-1">
                        주간 목표
                      </label>
                      <input
                        type="number"
                        value={form.weekly_target}
                        onChange={(e) => setForm({ ...form, weekly_target: e.target.value })}
                        className="w-full border-2 border-gray-700 bg-gray-800 rounded-xl px-3 py-2.5 text-xl font-medium text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="목표값"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-1">
                        이번 주 달성 실적 *
                      </label>
                      <input
                        type="number"
                        value={form.weekly_achievement}
                        onChange={(e) => setForm({ ...form, weekly_achievement: e.target.value })}
                        className="w-full border-2 border-blue-700 bg-blue-900/20/20 rounded-xl px-3 py-2.5 text-xl font-medium text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder={selectedKPIInfo ? `단위: ${selectedKPIInfo.unit || '-'}` : '숫자 입력'}
                      />
                    </div>
                  </div>
                </div>

                {/* 섹션: 달성률 요약 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase px-2">달성률 요약</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 border-2 border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">월간목표</span>
                        <span className="text-sm font-medium text-white">
                          {form.monthly_target ? parseFloat(form.monthly_target).toLocaleString() : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">주간목표</span>
                        <span className="text-sm font-medium text-white">
                          {form.weekly_target ? parseFloat(form.weekly_target).toLocaleString() : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-700"></div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <span className="text-xs text-gray-400">주간달성</span>
                        <p className="text-sm font-bold text-white">
                          {form.weekly_achievement ? parseFloat(form.weekly_achievement).toLocaleString() : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">월간누적</span>
                        <p className="text-sm font-bold text-white">
                          {monthlyCumulative ? monthlyCumulative.toLocaleString() : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">주간달성률</span>
                        <p className={`text-lg font-bold ${getRateColor(parseFloat(calcWeeklyRate() || '0'))}`}>
                          {calcWeeklyRate() || '0'}%
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">월간달성률</span>
                        <p className={`text-lg font-bold ${getRateColor(parseFloat(calcMonthlyRate() || '0'))}`}>
                          {calcMonthlyRate() || '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 섹션: PDCA 입력 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-gray-700 flex-1"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase px-2">PDCA 입력</span>
                    <div className="h-px bg-gray-700 flex-1"></div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'strategy', label: '전략', placeholder: '이번 주/월 전략' },
                      { key: 'plan', label: 'PLAN (계획)', placeholder: '계획 내용' },
                      { key: 'do_action', label: 'DO (실행현황)', placeholder: '실행 현황' },
                      { key: 'check_result', label: 'CHECK (분석 및 피드백)', placeholder: '분석 및 피드백' },
                      { key: 'action', label: 'ACTION (피드백 적용 한 다음 주 계획)', placeholder: '피드백 적용 및 다음 주 계획' },
                      { key: 'issue', label: '해결해야할 과제', placeholder: '해결이 필요한 과제 (여러 개는 줄바꿈으로 구분)' },
                      { key: 'help_needed', label: '필요한 도움', placeholder: '필요한 지원사항 (여러 개는 줄바꿈으로 구분)' },
                    ].map(({ key, label, placeholder }) => {
                      // 지난주 ACTION 실행 여부 체크박스 (DO 필드 바로 앞)
                      const prevReport = selectedKPI
                        ? reports.find(r => r.kpi_id === selectedKPI && r.report_date < form.report_date && r.action)
                        : null
                      const actionCheckbox = key === 'do_action' && prevReport?.action ? (
                        <div key="action_executed" className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-xl border-2 border-blue-700">
                          <input
                            type="checkbox"
                            checked={form.action_executed || false}
                            onChange={(e) => setForm({...form, action_executed: e.target.checked})}
                            className="w-5 h-5 rounded border-gray-700 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">지난주 ACTION 실행 완료</p>
                            <p className="text-xs text-gray-400 mt-0.5">&quot;{prevReport.action}&quot;</p>
                          </div>
                        </div>
                      ) : null

                      // CHECK 필드 위에 시스템 수치 자동 표시 (개별 모드)
                      const checkStatsBox = key === 'check_result' && selectedKPI ? (() => {
                        const prevReports = reports.filter(r => r.kpi_id === selectedKPI && r.report_date < form.report_date).sort((a,b) => b.report_date.localeCompare(a.report_date))
                        const lastReport = prevReports[0]
                        const currentAchievement = parseFloat(form.weekly_achievement || '0')
                        const lastAchievement = lastReport?.weekly_achievement || 0
                        const diff = currentAchievement - lastAchievement
                        const weeklyRate = calcWeeklyRate()
                        if (lastReport) {
                          return (
                            <div className="bg-gray-800/50 rounded-lg px-3 py-2 mb-2 text-xs text-gray-300 border border-gray-700">
                              <span className="font-medium">시스템 분석:</span>
                              {' '}주간달성 {currentAchievement.toLocaleString()} (전주 {lastAchievement.toLocaleString()},{' '}
                              <span className={diff >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                              </span>)
                              {weeklyRate ? ` | 달성률 ${weeklyRate}%` : ''}
                            </div>
                          )
                        }
                        return null
                      })() : null

                      return (
                        <React.Fragment key={key}>
                          {actionCheckbox}
                          {checkStatsBox}
                          <div
                            className={`border-2 border-gray-700 rounded-xl overflow-hidden ${pdcaBorderColors[key] || ''}`}
                          >
                            <div className="px-3 pt-2 pb-1 bg-gray-800/50/50">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-300">{label}</label>
                                {key === 'plan' && planAutoFilled && !editingReportId && (
                                  <span className="text-xs text-blue-600 bg-blue-900/20 px-1.5 py-0.5 rounded">
                                    지난주 ACTION에서 가져옴
                                  </span>
                                )}
                              </div>
                            </div>
                            <textarea
                              value={form[key as keyof typeof form] as string}
                              onChange={(e) => {
                                setForm({ ...form, [key]: e.target.value })
                                if (key === 'plan') setPlanAutoFilled(false)
                              }}
                              className="w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border-0 resize-none"
                              rows={3}
                              placeholder={placeholder}
                            />
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>

                {/* 저장 버튼 */}
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedTeam || !selectedKPI}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base font-bold shadow-md transition"
                >
                  <Save className="w-5 h-5" />
                  {saving ? '저장 중...' : editingReportId ? '보고서 수정' : '보고서 저장'}
                </button>
              </div>
            </div>

            {/* 최근 보고서 */}
            <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
              <div className="h-1 bg-blue-600"></div>
              <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">최근 입력된 보고서</h3>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">{reports.length}개</span>
              </div>
              <div className="max-h-[700px] overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="w-12 h-12 mb-3 stroke-1" />
                    <p className="text-sm font-medium">보고서를 작성해주세요</p>
                    <p className="text-xs mt-1">좌측 폼에서 보고서를 입력하면 여기에 표시됩니다</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {reports.map((report) => {
                      const rate = report.monthly_achievement_rate || 0
                      const isEditing = editingReportId === report.id
                      const strategyPreview = report.strategy ? report.strategy.substring(0, 50) + (report.strategy.length > 50 ? '...' : '') : ''
                      const planPreview = report.plan ? report.plan.substring(0, 50) + (report.plan.length > 50 ? '...' : '') : ''
                      return (
                        <div
                          key={report.id}
                          className={`p-4 transition ${
                            isEditing ? 'bg-blue-900/20 border-l-4 border-l-blue-600' : 'hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white">{report.report_date}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rate)}`}>
                                  {rate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-900/20 text-blue-600 text-xs px-2 py-0.5 rounded">{report.team_name}</span>
                                <h4 className="font-medium text-gray-300 text-sm">{report.kpi_name}</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(report)}
                                className="text-blue-600 hover:bg-blue-900/20 border border-blue-700 px-2 py-1 rounded-lg transition flex items-center gap-1 text-xs"
                                title="수정"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden md:inline font-medium">수정</span>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(report.id)}
                                className="text-red-600 hover:bg-red-900/20 border border-red-700 px-2 py-1 rounded-lg transition flex items-center gap-1 text-xs"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden md:inline font-medium">삭제</span>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-gray-300 mt-2">
                            <div className="text-xs">목표: <span className="text-sm font-medium">{report.weekly_target?.toLocaleString() || '-'}</span></div>
                            <div className="text-xs">달성: <span className="text-sm font-medium">{report.weekly_achievement?.toLocaleString() || '-'}</span></div>
                            <div className="text-xs">누적: <span className="text-sm font-medium">{report.monthly_cumulative?.toLocaleString() || '-'}</span></div>
                          </div>
                          {(strategyPreview || planPreview) && (
                            <div className="mt-2 pt-2 border-t border-gray-700 space-y-0.5">
                              {strategyPreview && (
                                <p className="text-xs text-gray-400 truncate">
                                  <span className="text-gray-400 font-medium">전략:</span> {strategyPreview}
                                </p>
                              )}
                              {planPreview && (
                                <p className="text-xs text-gray-400 truncate">
                                  <span className="text-gray-400 font-medium">계획:</span> {planPreview}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
