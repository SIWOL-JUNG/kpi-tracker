'use client'

import { useState } from 'react'
import { Database, Trash2, Check, AlertCircle } from 'lucide-react'
import Notification from '@/components/Notification'
import ConfirmModal from '@/components/ConfirmModal'

export default function MigratePage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<{teams: number, kpis: number} | null>(null)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // 샘플 데이터 로드
  const loadSampleData = async () => {
    setLoading(true)
    setResult(null)
    let teamCount = 0
    let kpiCount = 0

    try {
      // 팀 데이터
      const teams = [
        { name: 'B2B 솔루션', leader: '최수림' },
        { name: '유통혁신', leader: '김준헌' },
        { name: '품질관리', leader: '천승민' },
        { name: '마케팅', leader: '이성희' },
        { name: '운영', leader: '최예솔' },
        { name: 'HR', leader: null },
        { name: 'PI', leader: '정시월' },
      ]

      for (const team of teams) {
        setStatus(`팀 "${team.name}" 추가 중...`)
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(team),
        })
        if (res.ok) teamCount++
      }

      // 팀 ID 조회
      const allTeams = await fetch('/api/teams').then(r => r.json())
      const teamMap = new Map<string, string>()
      allTeams.forEach((t: {id: string, name: string}) => teamMap.set(t.name, t.id))

      // KPI 데이터
      const kpis = [
        { team: '품질관리', name: '리드효과 유지', unit: '리드효과', monthly_target: 2 },
        { team: '품질관리', name: '마감 산출물 달성률', unit: '퍼센트', monthly_target: 95 },
        { team: '품질관리', name: '불량률 감소', unit: '퍼센트', monthly_target: 2 },
        { team: '운영', name: '상품추천 전환률', unit: '퍼센트', monthly_target: 27 },
        { team: '운영', name: '환불 인입률 감소', unit: '퍼센트', monthly_target: 15 },
        { team: '운영', name: '출고시간 단축', unit: '시간', monthly_target: 1.7 },
        { team: '유통혁신', name: '인바운드 매입수량', unit: '건수', monthly_target: 100 },
        { team: '유통혁신', name: '신규 유통 채널 매출', unit: '원', monthly_target: 5000000 },
        { team: 'B2B 솔루션', name: '기준가 대비 증감 비율', unit: '퍼센트', monthly_target: 10 },
        { team: 'B2B 솔루션', name: '월간 출고 수량', unit: '수량', monthly_target: 300 },
        { team: '마케팅', name: 'B2C ROAS', unit: '퍼센트', monthly_target: 1200 },
        { team: '마케팅', name: 'B2C 총 매출목표', unit: '원', monthly_target: 600000000 },
        { team: 'PI', name: '개선 과제 완료 건수', unit: '건수', monthly_target: 5 },
      ]

      for (const kpi of kpis) {
        const teamId = teamMap.get(kpi.team)
        if (!teamId) continue
        setStatus(`KPI "${kpi.name}" 추가 중...`)
        const res = await fetch('/api/kpis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: teamId,
            name: kpi.name,
            unit: kpi.unit,
            monthly_target: kpi.monthly_target,
            base_month: '2025-11',
            status: 'active',
          }),
        })
        if (res.ok) kpiCount++
      }

      setResult({ teams: teamCount, kpis: kpiCount })
      setNotification({ type: 'success', message: '샘플 데이터가 로드되었습니다.' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류'
      setNotification({ type: 'error', message: msg })
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  // 전체 초기화 — API를 통해 모든 데이터 삭제
  const resetAllData = async () => {
    setShowResetConfirm(false)
    setLoading(true)
    setStatus('데이터 초기화 중...')
    try {
      // 보고서 → 목표 → KPI → 팀 순서로 삭제 (외래키 순서)
      const reports = await fetch('/api/reports').then(r => r.json())
      for (const r of reports) {
        await fetch(`/api/reports?id=${r.id}`, { method: 'DELETE' })
      }
      const goals = await fetch('/api/kpi-goals').then(r => r.json())
      for (const g of goals) {
        await fetch(`/api/kpi-goals?id=${g.id}`, { method: 'DELETE' })
      }
      const kpis = await fetch('/api/kpis').then(r => r.json())
      for (const k of kpis) {
        await fetch(`/api/kpis?id=${k.id}`, { method: 'DELETE' })
      }
      const teams = await fetch('/api/teams').then(r => r.json())
      for (const t of teams) {
        await fetch(`/api/teams?id=${t.id}`, { method: 'DELETE' })
      }
      setNotification({ type: 'success', message: '모든 데이터가 초기화되었습니다.' })
      setResult(null)
    } catch (e) {
      setNotification({ type: 'error', message: '초기화 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {notification && (
        <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />
      )}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="전체 데이터 초기화"
        message="모든 팀, KPI, 보고서 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="전체 초기화"
        onConfirm={resetAllData}
        onCancel={() => setShowResetConfirm(false)}
      />

      <div className="bg-gray-900 rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-200 mb-2 flex items-center gap-2">
          <Database className="w-6 h-6" />
          데이터 관리
        </h2>
        <p className="text-gray-400 text-sm mb-6">샘플 데이터를 로드하거나 데이터를 초기화합니다.</p>

        <button
          onClick={loadSampleData}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          <Database className="w-5 h-5" />
          {loading ? status || '처리 중...' : '샘플 데이터 로드 (기존 시트 기반)'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-400 font-medium text-sm">완료</p>
            </div>
            <ul className="text-green-400 text-sm space-y-1">
              <li>팀: {result.teams}개 추가</li>
              <li>KPI: {result.kpis}개 추가</li>
            </ul>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg shadow p-6">
        <h3 className="font-bold text-red-400 mb-2 text-sm">위험 영역</h3>
        <p className="text-gray-400 text-xs mb-3">데이터를 초기화하고 처음부터 다시 시작합니다.</p>
        <button
          onClick={() => setShowResetConfirm(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-red-700 text-red-600 rounded-lg hover:bg-red-900/20 text-sm disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          전체 데이터 초기화
        </button>
      </div>
    </div>
  )
}
