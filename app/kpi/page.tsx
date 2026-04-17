'use client'

import { useState, useEffect } from 'react'
import { Team, KPI, KPIGoal } from '@/types'
import { groupKpisByCategoryProgram } from '@/lib/kpi-utils'
import { Plus, Edit2, Trash2, X, Save, Users, Target, RefreshCw, Calendar, CheckCircle, Clock } from 'lucide-react'
import Notification from '@/components/Notification'
import ConfirmModal from '@/components/ConfirmModal'
import StatCard from '@/components/StatCard'
import LoadingSpinner from '@/components/LoadingSpinner'

// 경과 기간 계산
const getElapsedText = (baseMonth: string) => {
  if (!baseMonth) return ''
  const [year, month] = baseMonth.split('-').map(Number)
  const start = new Date(year, month - 1)
  const now = new Date()
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (diffMonths < 1) return '이번 달 시작'
  if (diffMonths < 12) return `${diffMonths}개월째`
  const years = Math.floor(diffMonths / 12)
  const remainMonths = diffMonths % 12
  return remainMonths > 0 ? `${years}년 ${remainMonths}개월째` : `${years}년째`
}

export default function KPIPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [kpiGoals, setKpiGoals] = useState<KPIGoal[]>([])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showKPIModal, setShowKPIModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null)
  const [goalKPI, setGoalKPI] = useState<KPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'team' | 'kpi' | 'goal', id: string, name: string} | null>(null)
  const [viewMode, setViewMode] = useState<'active' | 'completed'>('active')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')

  const [teamForm, setTeamForm] = useState({ name: '', leader: '', sub_leader: '' })
  const [kpiForm, setKpiForm] = useState({
    team_id: '',
    name: '',
    unit: '',
    direction: 'higher_better' as 'higher_better' | 'lower_better',
    weight: '5',
    yearly_target: '',
    monthly_target: '',
    weekly_target: '',
    description: '',
    category: '',
    program: '',
    base_month: ''
  })
  const [goalForm, setGoalForm] = useState({ goal_month: '', monthly_target: '', weekly_target: '' })

  useEffect(() => {
    fetchData()
  }, [])

  // 첫 팀 자동 선택
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id)
    }
  }, [teams])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [teamsData, kpisData, goalsData] = await Promise.all([
        fetch('/api/teams').then(r => { if (!r.ok) throw new Error('팀 데이터 로드 실패'); return r.json() }),
        fetch('/api/kpis').then(r => { if (!r.ok) throw new Error('KPI 데이터 로드 실패'); return r.json() }),
        fetch('/api/kpi-goals').then(r => { if (!r.ok) throw new Error('목표 데이터 로드 실패'); return r.json() })
      ])

      setTeams(teamsData)
      const formatted = kpisData.map((k: Record<string, unknown>) => ({
        ...k,
        team_name: (k.teams as Record<string, unknown>)?.name,
        status: (k as Record<string, unknown>).status || 'active',
      }))
      setKpis(formatted as KPI[])
      setKpiGoals(goalsData)
    } catch (e) {
      console.error('Error:', e)
      showNotif('error', '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // ===== 팀 CRUD =====
  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) {
      showNotif('error', '팀명을 입력해주세요.')
      return
    }
    try {
      if (editingTeam) {
        const res = await fetch('/api/teams', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTeam.id, ...teamForm })
        })
        if (!res.ok) throw new Error(await res.text())
        showNotif('success', '팀이 수정되었습니다.')
      } else {
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamForm)
        })
        if (!res.ok) throw new Error(await res.text())
        showNotif('success', '팀이 추가되었습니다.')
      }
      setShowTeamModal(false)
      setTeamForm({ name: '', leader: '', sub_leader: '' })
      setEditingTeam(null)
      fetchData()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e)
      showNotif('error', `팀 저장 오류: ${errMsg}`)
    }
  }

  const handleDeleteTeam = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'team') return
    try {
      const res = await fetch(`/api/teams?id=${deleteConfirm.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      showNotif('success', '팀이 삭제되었습니다.')
      fetchData()
    } catch (e) {
      showNotif('error', '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // ===== KPI CRUD =====
  const handleSaveKPI = async () => {
    if (!kpiForm.team_id || !kpiForm.name.trim()) {
      showNotif('error', '팀과 KPI명을 입력해주세요.')
      return
    }
    try {
      const data = {
        team_id: kpiForm.team_id,
        name: kpiForm.name,
        unit: kpiForm.unit || null,
        direction: kpiForm.direction,
        weight: parseInt(kpiForm.weight),
        yearly_target: kpiForm.yearly_target ? parseFloat(kpiForm.yearly_target) : null,
        monthly_target: kpiForm.monthly_target ? parseFloat(kpiForm.monthly_target) : null,
        weekly_target: kpiForm.weekly_target ? parseFloat(kpiForm.weekly_target) : null,
        description: kpiForm.description || null,
        category: kpiForm.category || null,
        program: kpiForm.program || null,
        base_month: kpiForm.base_month || null,
        status: 'active',
      }

      if (editingKPI) {
        const res = await fetch('/api/kpis', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingKPI.id, ...data })
        })
        if (!res.ok) throw new Error(await res.text())
        showNotif('success', 'KPI가 수정되었습니다.')
      } else {
        const res = await fetch('/api/kpis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error(await res.text())
        showNotif('success', 'KPI가 추가되었습니다.')
      }
      setShowKPIModal(false)
      setKpiForm({ team_id: '', name: '', unit: '', direction: 'higher_better', weight: '5', yearly_target: '', monthly_target: '', weekly_target: '', description: '', category: '', program: '', base_month: '' })
      setEditingKPI(null)
      fetchData()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e)
      showNotif('error', `KPI 저장 오류: ${errMsg}`)
    }
  }

  const handleDeleteKPI = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'kpi') return
    try {
      const res = await fetch(`/api/kpis?id=${deleteConfirm.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      showNotif('success', 'KPI가 삭제되었습니다.')
      fetchData()
    } catch (e) {
      showNotif('error', '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // KPI 상태 변경 (활성 ↔ 완료)
  const handleToggleStatus = async (kpi: KPI) => {
    const newStatus = kpi.status === 'active' ? 'completed' : 'active'
    try {
      const res = await fetch('/api/kpis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: kpi.id, status: newStatus })
      })
      if (!res.ok) throw new Error(await res.text())
      showNotif('success', newStatus === 'completed' ? 'KPI가 완료 처리되었습니다.' : 'KPI가 다시 활성화되었습니다.')
      fetchData()
    } catch (e) {
      showNotif('error', '상태 변경 중 오류가 발생했습니다.')
    }
  }

  // ===== 월별 목표 CRUD =====
  const handleSaveGoal = async () => {
    if (!goalKPI || !goalForm.goal_month) {
      showNotif('error', '월을 선택해주세요.')
      return
    }
    try {
      const data = {
        kpi_id: goalKPI.id,
        goal_month: goalForm.goal_month,
        monthly_target: goalForm.monthly_target ? parseFloat(goalForm.monthly_target) : null,
        weekly_target: goalForm.weekly_target ? parseFloat(goalForm.weekly_target) : null,
      }
      const res = await fetch('/api/kpi-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error(await res.text())
      showNotif('success', `${goalForm.goal_month} 목표가 저장되었습니다.`)
      setGoalForm({ goal_month: '', monthly_target: '', weekly_target: '' })
      fetchData()
    } catch (e) {
      showNotif('error', '목표 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteGoal = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'goal') return
    try {
      const res = await fetch(`/api/kpi-goals?id=${deleteConfirm.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      showNotif('success', '월별 목표가 삭제되었습니다.')
      fetchData()
    } catch (e) {
      showNotif('error', '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // 모달 열기
  const openTeamModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team)
      setTeamForm({ name: team.name, leader: team.leader || '', sub_leader: team.sub_leader || '' })
    } else {
      setEditingTeam(null)
      setTeamForm({ name: '', leader: '', sub_leader: '' })
    }
    setShowTeamModal(true)
  }

  const openKPIModal = (kpi?: KPI) => {
    if (kpi) {
      setEditingKPI(kpi)
      setKpiForm({
        team_id: kpi.team_id,
        name: kpi.name,
        unit: kpi.unit || '',
        direction: kpi.direction || 'higher_better',
        weight: kpi.weight?.toString() || '5',
        yearly_target: kpi.yearly_target?.toString() || '',
        monthly_target: kpi.monthly_target?.toString() || '',
        weekly_target: kpi.weekly_target?.toString() || '',
        description: kpi.description || '',
        category: kpi.category || '',
        program: kpi.program || '',
        base_month: kpi.base_month || ''
      })
    } else {
      setEditingKPI(null)
      setKpiForm({ team_id: '', name: '', unit: '', direction: 'higher_better', weight: '5', yearly_target: '', monthly_target: '', weekly_target: '', description: '', category: '', program: '', base_month: '' })
    }
    setShowKPIModal(true)
  }

  const openGoalModal = (kpi: KPI) => {
    setGoalKPI(kpi)
    setGoalForm({ goal_month: '', monthly_target: '', weekly_target: '' })
    setShowGoalModal(true)
  }

  // 삭제 확인
  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'team') handleDeleteTeam()
    else if (deleteConfirm.type === 'kpi') handleDeleteKPI()
    else if (deleteConfirm.type === 'goal') handleDeleteGoal()
  }

  const deleteMessage = deleteConfirm
    ? deleteConfirm.type === 'team'
      ? `"${deleteConfirm.name}" 팀을 삭제하시겠습니까? 관련 KPI와 보고서도 모두 삭제됩니다.`
      : deleteConfirm.type === 'kpi'
        ? `"${deleteConfirm.name}" KPI를 삭제하시겠습니까? 관련 보고서와 월별 목표도 삭제됩니다.`
        : `"${deleteConfirm.name}" 월별 목표를 삭제하시겠습니까?`
    : ''

  const goalsByKPI = goalKPI ? kpiGoals.filter(g => g.kpi_id === goalKPI.id) : []

  // 필터된 KPI (활성/완료)
  const filteredKpis = kpis.filter(k => k.status === viewMode)
  const activeCount = kpis.filter(k => k.status === 'active').length
  const completedCount = kpis.filter(k => k.status === 'completed').length

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {notification && (
        <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />
      )}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="삭제 확인"
        message={deleteMessage}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* 헤더 - 색상 악센트 바 */}
      <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden mb-8">
        <div className="h-1 bg-blue-600"></div>
        <div className="p-5 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">KPI 관리</h2>
            <p className="text-gray-400 text-sm">팀과 KPI 항목을 관리합니다</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 text-gray-300 border-2 border-gray-700 rounded-xl hover:bg-gray-700 text-sm font-medium transition">
              <RefreshCw className="w-4 h-4" /> 새로고침
            </button>
            <button onClick={() => openTeamModal()} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 text-sm font-medium transition">
              <Users className="w-4 h-4" /> 팀 추가
            </button>
            <button onClick={() => openKPIModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium transition">
              <Plus className="w-4 h-4" /> KPI 추가
            </button>
          </div>
        </div>
      </div>

      {/* 요약 - 섹션 라벨 */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="팀 수" value={teams.length} color="blue" />
          <StatCard icon={Target} label="활성 KPI" value={activeCount} color="green" />
          <StatCard icon={CheckCircle} label="완료 KPI" value={completedCount} color="purple" />
          <StatCard label="팀당 평균" value={teams.length > 0 ? `${(activeCount / teams.length).toFixed(1)}개` : '0개'} color="yellow" />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-8">
          {/* 팀 선택 버튼 - 색상 악센트 바 */}
          <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
            <div className="h-1 bg-indigo-500"></div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-300">팀 선택</h3>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full">{teams.length}개 팀</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {teams.map(team => {
                  const teamActiveKpis = kpis.filter(k => k.team_id === team.id && k.status === 'active').length
                  const isSelected = selectedTeamId === team.id
                  return (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`flex flex-col items-start px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]'
                          : 'bg-gray-900 text-gray-300 border-2 border-gray-700 hover:border-blue-700 hover:bg-blue-900/20 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{team.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isSelected ? 'bg-blue-900/200 text-blue-100' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {teamActiveKpis}
                        </span>
                      </div>
                      {team.leader && (
                        <span className={`text-xs mt-1 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                          {team.leader}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 선택된 팀 정보 + KPI 목록 */}
          {selectedTeamId && (() => {
            const selectedTeam = teams.find(t => t.id === selectedTeamId)
            if (!selectedTeam) return null
            const teamKpis = filteredKpis.filter(k => k.team_id === selectedTeamId)

            return (
              <div className="bg-gray-900 rounded-xl shadow border-2 border-gray-700 overflow-hidden">
                {/* 파란 악센트 바 */}
                <div className="h-1 bg-blue-600"></div>

                {/* 팀 헤더 */}
                <div className="px-5 py-4 bg-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{selectedTeam.name}</h3>
                    <span className="text-sm text-gray-400">
                      팀장: {selectedTeam.leader || '-'}
                      {selectedTeam.sub_leader && ` / 부팀장: ${selectedTeam.sub_leader}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openTeamModal(selectedTeam)} className="text-blue-600 hover:bg-blue-900/30 p-2 rounded-xl transition" title="팀 수정">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'team', id: selectedTeam.id, name: selectedTeam.name })} className="text-red-600 hover:bg-red-900/30 p-2 rounded-xl transition" title="팀 삭제">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 활성/완료 탭 - 필(pill) 스타일 */}
                <div className="px-5 py-3 border-b border-gray-700 flex gap-2">
                  <button
                    onClick={() => setViewMode('active')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'active'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-400 bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    활성
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      viewMode === 'active' ? 'bg-blue-900/200 text-blue-100' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {kpis.filter(k => k.team_id === selectedTeamId && k.status === 'active').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setViewMode('completed')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'completed'
                        ? 'bg-gray-700 text-white shadow'
                        : 'text-gray-400 bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    완료
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      viewMode === 'completed' ? 'bg-gray-600 text-gray-100' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {kpis.filter(k => k.team_id === selectedTeamId && k.status === 'completed').length}
                    </span>
                  </button>
                </div>

                {/* KPI 목록 */}
                {teamKpis.length > 0 ? (
                  <div>
                    {(() => {
                      const groups = groupKpisByCategoryProgram(teamKpis)
                      let lastCategory: string | null | undefined = undefined
                      return groups.map((group, gi) => {
                        const showCategoryHeader = group.category && group.category !== lastCategory
                        if (group.category) lastCategory = group.category
                        return (
                          <div key={gi}>
                            {showCategoryHeader && (
                              <div className="px-5 py-2.5 bg-gray-800/70 border-b border-gray-700">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{group.category}</span>
                              </div>
                            )}
                            {group.program && (
                              <div className="px-5 py-2 bg-gray-800/40 border-b border-gray-700 pl-8">
                                <span className="text-xs font-semibold text-gray-400">{group.program}</span>
                              </div>
                            )}
                            <div className="divide-y divide-gray-700">
                    {group.kpis.map(kpi => {
                      const goalCount = kpiGoals.filter(g => g.kpi_id === kpi.id).length
                      const elapsed = getElapsedText(kpi.base_month)
                      const isCompleted = kpi.status === 'completed'

                      return (
                        <div key={kpi.id} className={`px-5 py-4 hover:bg-gray-700 transition border-l-4 ${
                          isCompleted ? 'border-l-gray-300 bg-gray-800/50/50 opacity-60' : 'border-l-blue-600'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`font-semibold text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>{kpi.name}</span>
                                {kpi.unit && (
                                  <span className="text-xs bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-lg font-medium">{kpi.unit}</span>
                                )}
                                {kpi.direction === 'lower_better' ? (
                                  <span className="text-xs bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-lg font-bold" title="낮을수록 좋음">&#8595;</span>
                                ) : (
                                  <span className="text-xs bg-green-900/30 text-green-600 px-1.5 py-0.5 rounded-lg font-bold" title="높을수록 좋음">&#8593;</span>
                                )}
                                {isCompleted && (
                                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full font-medium">완료</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                {kpi.yearly_target && (
                                  <span className="text-blue-600 font-medium">연간: {kpi.yearly_target.toLocaleString()}</span>
                                )}
                                {kpi.monthly_target && (
                                  <span>월간: {kpi.monthly_target.toLocaleString()}</span>
                                )}
                                {kpi.base_month && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {kpi.base_month} 시작 {elapsed && `(${elapsed})`}
                                  </span>
                                )}
                                {goalCount > 0 && (
                                  <span className="text-blue-600">{goalCount}개월 목표 설정됨</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                              <button
                                onClick={() => handleToggleStatus(kpi)}
                                className={`p-2 rounded-xl transition ${
                                  kpi.status === 'active'
                                    ? 'text-green-600 hover:bg-green-900/20'
                                    : 'text-blue-600 hover:bg-blue-900/20'
                                }`}
                                title={kpi.status === 'active' ? '완료 처리' : '다시 활성화'}
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button onClick={() => openGoalModal(kpi)} className="text-blue-600 hover:bg-blue-900/20 p-2 rounded-xl transition" title="월별 목표">
                                <Calendar className="w-5 h-5" />
                              </button>
                              <button onClick={() => openKPIModal(kpi)} className="text-blue-600 hover:bg-blue-900/20 p-2 rounded-xl transition" title="수정">
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => setDeleteConfirm({ type: 'kpi', id: kpi.id, name: kpi.name })} className="text-red-600 hover:bg-red-900/20 p-2 rounded-xl transition" title="삭제">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-2xl mb-4">
                      <Target className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-base mb-2 font-medium">
                      {viewMode === 'active' ? '등록된 활성 KPI가 없습니다' : '완료된 KPI가 없습니다'}
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                      {viewMode === 'active' ? '새 KPI를 추가하여 팀 성과를 추적하세요' : '활성 KPI를 완료 처리하면 여기에 표시됩니다'}
                    </p>
                    {viewMode === 'active' && (
                      <button
                        onClick={() => openKPIModal()}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium transition shadow"
                      >
                        <Plus className="w-4 h-4" /> KPI 추가
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* 팀 Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md overflow-hidden">
            <div className="h-1 bg-blue-600"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{editingTeam ? '팀 수정' : '팀 추가'}</h3>
                <button onClick={() => setShowTeamModal(false)} className="text-gray-400 hover:text-gray-300 transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">팀명 <span className="text-red-600">*</span></label>
                  <input type="text" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="예: 마케팅팀" />
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">팀장</label>
                      <input type="text" value={teamForm.leader} onChange={(e) => setTeamForm({ ...teamForm, leader: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="예: 김철수" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">부팀장</label>
                      <input type="text" value={teamForm.sub_leader} onChange={(e) => setTeamForm({ ...teamForm, sub_leader: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="예: 박영희" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-3 border-t border-gray-700">
                  <button onClick={() => setShowTeamModal(false)} className="px-4 py-2 border-2 border-gray-700 rounded-xl hover:bg-gray-700 transition">취소</button>
                  <button onClick={handleSaveTeam} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 transition">
                    <Save className="w-4 h-4" /> 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Modal */}
      {showKPIModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1 bg-blue-600 flex-shrink-0"></div>
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{editingKPI ? 'KPI 수정' : 'KPI 추가'}</h3>
                <button onClick={() => setShowKPIModal(false)} className="text-gray-400 hover:text-gray-300 transition"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {/* 기본 정보 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">팀 <span className="text-red-600">*</span></label>
                  <select value={kpiForm.team_id} onChange={(e) => setKpiForm({ ...kpiForm, team_id: e.target.value })}
                    className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">팀 선택</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                {/* 분류 (카테고리/프로그램) */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">분류</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">카테고리</label>
                      <input type="text" value={kpiForm.category}
                        onChange={(e) => setKpiForm({ ...kpiForm, category: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="예: 개별 프로그램 성과"
                        list="category-suggestions" />
                      <datalist id="category-suggestions">
                        {[...new Set(kpis.filter(k => k.team_id === kpiForm.team_id && k.category).map(k => k.category))].map(c => (
                          <option key={c} value={c!} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">프로그램</label>
                      <input type="text" value={kpiForm.program}
                        onChange={(e) => setKpiForm({ ...kpiForm, program: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="예: 상품 자동 추천 (선택사항)"
                        list="program-suggestions" />
                      <datalist id="program-suggestions">
                        {[...new Set(kpis.filter(k => k.team_id === kpiForm.team_id && k.category === kpiForm.category && k.program).map(k => k.program))].map(p => (
                          <option key={p} value={p!} />
                        ))}
                      </datalist>
                      <p className="text-xs text-gray-400 mt-1">카테고리 안에서 세분화할 때 입력하세요</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">KPI명 <span className="text-red-600">*</span></label>
                  <input type="text" value={kpiForm.name} onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
                    className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="예: 매출액" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">단위 <span className="text-red-600">*</span></label>
                  <select value={kpiForm.unit} onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                    className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">단위 선택</option>
                    <option value="원">원 (&#8361;)</option>
                    <option value="퍼센트">퍼센트 (%)</option>
                    <option value="건수">건수</option>
                    <option value="수량">수량</option>
                    <option value="대">대</option>
                    <option value="시간">시간</option>
                    <option value="명">명</option>
                    <option value="개">개</option>
                    <option value="리드효과">리드효과</option>
                    <option value="개선건수">개선건수</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">방향성 <span className="text-red-600">*</span></label>
                  <select value={kpiForm.direction} onChange={(e) => setKpiForm({ ...kpiForm, direction: e.target.value as 'higher_better' | 'lower_better' })}
                    className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="higher_better">높을수록 좋음 (매출, 전환률 등)</option>
                    <option value="lower_better">낮을수록 좋음 (불량률, 환불률 등)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">가중치 (1-10) <span className="text-red-600">*</span></label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="10" value={kpiForm.weight} onChange={(e) => setKpiForm({ ...kpiForm, weight: e.target.value })}
                      className="flex-1" />
                    <span className="text-lg font-bold text-blue-600 w-8 text-center">{kpiForm.weight}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">핵심 KPI는 높은 가중치, 부수적 KPI는 낮은 가중치</p>
                </div>

                {/* 목표 설정 */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">목표 설정</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">연간목표</label>
                      <input type="number" value={kpiForm.yearly_target} onChange={(e) => setKpiForm({ ...kpiForm, yearly_target: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="예: 1200 (연간 총 목표)" />
                      <p className="text-xs text-gray-400 mt-1">1년간 달성할 총 목표 수치를 입력하세요</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">기본 월간목표</label>
                        <input type="number" value={kpiForm.monthly_target} onChange={(e) => setKpiForm({ ...kpiForm, monthly_target: e.target.value })}
                          className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder={kpiForm.yearly_target ? `연간의 1/12 = ${(parseFloat(kpiForm.yearly_target) / 12).toFixed(0)}` : ''} />
                      </div>
                      {kpiForm.yearly_target && kpiForm.monthly_target && (
                        Math.abs(parseFloat(kpiForm.yearly_target) / 12 - parseFloat(kpiForm.monthly_target)) > parseFloat(kpiForm.monthly_target) * 0.3 && (
                          <p className="text-amber-400 text-xs mt-1 col-span-2">&#9888; 월간목표({kpiForm.monthly_target})가 연간목표의 1/12({(parseFloat(kpiForm.yearly_target)/12).toFixed(0)})과 30% 이상 차이납니다</p>
                        )
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">기본 주간목표</label>
                        <input type="number" value={kpiForm.weekly_target} onChange={(e) => setKpiForm({ ...kpiForm, weekly_target: e.target.value })}
                          className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 추가 정보 */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">추가 정보</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">시작월 (KPI 측정 시작)</label>
                      <input type="month" value={kpiForm.base_month} onChange={(e) => setKpiForm({ ...kpiForm, base_month: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      <p className="text-xs text-gray-400 mt-1">KPI 측정을 시작한 월을 선택하세요</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">상세설명</label>
                      <textarea value={kpiForm.description} onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                        className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-gray-700">
                  <button onClick={() => setShowKPIModal(false)} className="px-4 py-2 border-2 border-gray-700 rounded-xl hover:bg-gray-700 transition">취소</button>
                  <button onClick={handleSaveKPI} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 transition">
                    <Save className="w-4 h-4" /> 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 월별 목표 Modal */}
      {showGoalModal && goalKPI && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1 bg-blue-600 flex-shrink-0"></div>
            <div className="p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">월별 목표 설정</h3>
                  <p className="text-sm text-gray-400">{goalKPI.team_name} &gt; {goalKPI.name}</p>
                </div>
                <button onClick={() => setShowGoalModal(false)} className="text-gray-400 hover:text-gray-300 transition"><X className="w-5 h-5" /></button>
              </div>

              {goalsByKPI.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">설정된 목표</h4>
                  <div className="divide-y divide-gray-700 border-2 border-gray-700 rounded-xl overflow-hidden">
                    {goalsByKPI.map((goal) => (
                      <div key={goal.id} className="flex justify-between items-center px-4 py-3 text-sm bg-gray-900 hover:bg-gray-700 transition">
                        <div>
                          <span className="font-medium text-white">{goal.goal_month}</span>
                          <span className="text-gray-400 ml-3">월간: {goal.monthly_target?.toLocaleString() ?? '-'}</span>
                          <span className="text-gray-400 ml-3">주간: {goal.weekly_target?.toLocaleString() ?? '-'}</span>
                        </div>
                        <button onClick={() => setDeleteConfirm({ type: 'goal', id: goal.id, name: goal.goal_month })}
                          className="text-red-600 hover:bg-red-900/20 p-2 rounded-xl transition">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-300">새 월별 목표 추가</h4>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">대상 월 <span className="text-red-600">*</span></label>
                  <input type="month" value={goalForm.goal_month} onChange={(e) => setGoalForm({ ...goalForm, goal_month: e.target.value })}
                    className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">월간목표</label>
                    <input type="number" value={goalForm.monthly_target} onChange={(e) => setGoalForm({ ...goalForm, monthly_target: e.target.value })}
                      className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={goalKPI.monthly_target?.toString() || ''} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">주간목표</label>
                    <input type="number" value={goalForm.weekly_target} onChange={(e) => setGoalForm({ ...goalForm, weekly_target: e.target.value })}
                      className="w-full border-2 border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={goalKPI.weekly_target?.toString() || ''} />
                  </div>
                </div>
                <button onClick={handleSaveGoal} disabled={!goalForm.goal_month}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2 text-sm transition">
                  <Save className="w-4 h-4" /> 목표 저장
                </button>
              </div>

              <div className="flex justify-end pt-4 mt-4 border-t border-gray-700">
                <button onClick={() => setShowGoalModal(false)} className="px-4 py-2 border-2 border-gray-700 rounded-xl hover:bg-gray-700 text-sm transition">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
