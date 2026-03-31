'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Team, ActionItem } from '@/types'
import {
  CheckSquare, Plus, Trash2, Clock, AlertCircle,
  Play, CheckCircle, RotateCcw, Filter, ListTodo,
} from 'lucide-react'
import StatCard from '@/components/StatCard'
import Notification from '@/components/Notification'
import ConfirmModal from '@/components/ConfirmModal'
import LoadingSpinner from '@/components/LoadingSpinner'

// 상태 뱃지 색상 매핑
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: '미해결', bg: 'bg-red-100', text: 'text-red-700' },
  in_progress: { label: '진행중', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved: { label: '해결됨', bg: 'bg-green-100', text: 'text-green-700' },
}

// 장기 미해결 기준 (일)
const LONG_OVERDUE_DAYS = 21

// 탭 목록
const STATUS_TABS = [
  { key: '', label: '전체' },
  { key: 'open', label: '미해결' },
  { key: 'in_progress', label: '진행중' },
  { key: 'resolved', label: '해결됨' },
]

// 날짜 포맷 (YYYY-MM-DD)
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return dateStr.split('T')[0]
}

// 경과 일수 계산
const getDaysSince = (dateStr: string): number => {
  const created = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - created.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function ActionsPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">로딩 중...</div>}>
      <ActionsPage />
    </Suspense>
  )
}

function ActionsPage() {
  const searchParams = useSearchParams()

  // 데이터 상태
  const [teams, setTeams] = useState<Team[]>([])
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)

  // 필터 상태 (URL 파라미터에서 초기값 설정)
  const [selectedTeam, setSelectedTeam] = useState<string>(searchParams.get('team') || '')
  const [activeStatus, setActiveStatus] = useState<string>('')

  // 새 아이템 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [formTeamId, setFormTeamId] = useState<string>('')
  const [formContent, setFormContent] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // UI 상태
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // 데이터 로딩
  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      if (data) setTeams(data)
    } catch {
      setNotification({ type: 'error', message: '팀 목록을 불러오지 못했습니다.' })
    }
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedTeam) params.set('team_id', selectedTeam)
      if (activeStatus) params.set('status', activeStatus)
      const url = `/api/action-items${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data) setItems(data)
    } catch {
      setNotification({ type: 'error', message: '액션 아이템을 불러오지 못했습니다.' })
    } finally {
      setLoading(false)
    }
  }, [selectedTeam, activeStatus])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // 새 아이템 저장
  const handleSave = async () => {
    if (!formTeamId || !formContent.trim()) {
      setNotification({ type: 'error', message: '팀과 내용을 입력해주세요.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: formTeamId,
          content: formContent.trim(),
          status: 'open',
        }),
      })
      if (!res.ok) throw new Error('저장 실패')
      setNotification({ type: 'success', message: '액션 아이템이 추가되었습니다.' })
      setFormContent('')
      setFormTeamId('')
      setShowForm(false)
      fetchItems()
    } catch {
      setNotification({ type: 'error', message: '저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  // 상태 변경
  const handleStatusChange = async (id: string, newStatus: 'open' | 'in_progress' | 'resolved') => {
    try {
      const res = await fetch('/api/action-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (!res.ok) throw new Error('상태 변경 실패')
      const statusLabel = STATUS_CONFIG[newStatus].label
      setNotification({ type: 'success', message: `상태가 "${statusLabel}"(으)로 변경되었습니다.` })
      fetchItems()
    } catch {
      setNotification({ type: 'error', message: '상태 변경에 실패했습니다.' })
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/action-items?id=${deleteTarget}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      setNotification({ type: 'success', message: '액션 아이템이 삭제되었습니다.' })
      setDeleteTarget(null)
      fetchItems()
    } catch {
      setNotification({ type: 'error', message: '삭제에 실패했습니다.' })
      setDeleteTarget(null)
    }
  }

  // 통계 계산
  const totalCount = items.length
  const openCount = items.filter(i => i.status === 'open').length
  const inProgressCount = items.filter(i => i.status === 'in_progress').length
  const resolvedCount = items.filter(i => i.status === 'resolved').length

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 알림 */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="액션 아이템 삭제"
        message="이 액션 아이템을 삭제하시겠습니까? 삭제된 항목은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 헤더 */}
      <div className="bg-white rounded-xl shadow border-2 border-gray-300 mb-8 overflow-hidden">
        <div className="h-1 bg-blue-600" />
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">액션 아이템 추적</h1>
              <p className="text-sm text-gray-400 mt-0.5">팀별 액션 아이템 현황을 관리합니다</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition shadow"
          >
            <Plus className="w-4 h-4" />
            새 아이템
          </button>
        </div>
      </div>

      {/* 새 아이템 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl shadow border-2 border-gray-300 mb-8 overflow-hidden">
          <div className="h-1 bg-blue-600" />
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">새 액션 아이템 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀 선택</label>
                <select
                  value={formTeamId}
                  onChange={(e) => setFormTeamId(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">팀을 선택하세요</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="액션 아이템 내용을 입력하세요..."
                  rows={3}
                  className="w-full border-2 border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowForm(false); setFormContent(''); setFormTeamId('') }}
                  className="px-4 py-2.5 text-sm text-gray-600 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 요약 통계 카드 */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ListTodo} label="전체" value={`${totalCount}건`} color="blue" />
          <StatCard icon={AlertCircle} label="미해결" value={`${openCount}건`} color="red" />
          <StatCard icon={Clock} label="진행중" value={`${inProgressCount}건`} color="yellow" />
          <StatCard icon={CheckCircle} label="해결됨" value={`${resolvedCount}건`} color="green" />
        </div>
      </div>

      {/* 팀 필터 + 상태 탭 */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">필터</h3>
        <div className="bg-white rounded-xl shadow border-2 border-gray-300 p-5">
          {/* 팀 필터 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 mr-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">팀:</span>
            </div>
            <button
              onClick={() => setSelectedTeam('')}
              className={`px-4 py-2 text-sm rounded-full border transition ${
                selectedTeam === ''
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeam(t.id)}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  selectedTeam === t.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* 상태 탭 */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-2">
              <CheckSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">상태:</span>
            </div>
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={`px-4 py-2 text-sm rounded-full border transition ${
                  activeStatus === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 아이템 목록 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          액션 아이템 ({items.length}건)
        </h3>

        {items.length === 0 ? (
          /* 빈 상태 */
          <div className="bg-white rounded-xl shadow border-2 border-gray-300 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="text-lg font-bold text-gray-500 mb-1">액션 아이템이 없습니다</h4>
            <p className="text-sm text-gray-400">
              {selectedTeam || activeStatus
                ? '필터 조건에 맞는 아이템이 없습니다. 필터를 변경해보세요.'
                : '새 아이템을 추가하여 액션을 추적하세요.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const daysSince = getDaysSince(item.created_at)
              const isOverdue = item.status !== 'resolved' && daysSince >= LONG_OVERDUE_DAYS
              const statusCfg = STATUS_CONFIG[item.status]

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow border-2 border-gray-300 overflow-hidden transition ${
                    isOverdue ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* 왼쪽: 내용 영역 */}
                      <div className="flex-1 min-w-0">
                        {/* 뱃지 행 */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {/* 팀 뱃지 */}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {item.team_name || '팀 미지정'}
                          </span>
                          {/* KPI 이름 */}
                          {item.kpi_name && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {item.kpi_name}
                            </span>
                          )}
                          {/* 상태 뱃지 */}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                            {statusCfg.label}
                          </span>
                          {/* 장기 미해결 뱃지 */}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3" />
                              장기 미해결
                            </span>
                          )}
                        </div>

                        {/* 내용 */}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </p>

                        {/* 날짜 정보 */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            생성: {formatDate(item.created_at)}
                          </span>
                          {item.resolved_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              해결: {formatDate(item.resolved_at)}
                            </span>
                          )}
                          {item.status !== 'resolved' && (
                            <span className={`${daysSince >= LONG_OVERDUE_DAYS ? 'text-red-500 font-medium' : ''}`}>
                              {daysSince}일 경과
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 오른쪽: 액션 버튼 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 상태 변경 버튼 */}
                        {item.status === 'open' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'in_progress')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition"
                            title="진행중으로 변경"
                          >
                            <Play className="w-3 h-3" />
                            진행중
                          </button>
                        )}
                        {item.status === 'open' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'resolved')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                            title="해결로 변경"
                          >
                            <CheckCircle className="w-3 h-3" />
                            해결
                          </button>
                        )}
                        {item.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'resolved')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                            title="해결로 변경"
                          >
                            <CheckCircle className="w-3 h-3" />
                            해결
                          </button>
                        )}
                        {item.status === 'resolved' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'open')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                            title="다시 열기"
                          >
                            <RotateCcw className="w-3 h-3" />
                            다시 열기
                          </button>
                        )}

                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => setDeleteTarget(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
