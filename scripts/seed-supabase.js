// Supabase에 데이터 입력 (Vercel API 통해)
const fs = require('fs')
const path = require('path')

const API_BASE = 'https://kpi-tracker-chi.vercel.app/api'

const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'export-teams.json')))
const kpis = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'export-kpis.json')))
const reports = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'export-reports.json')))

async function run() {
  console.log('=== Supabase 데이터 입력 시작 ===\n')

  // 1. 팀 입력
  const teamIdMap = new Map() // old_id → new_id
  for (const team of teams) {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: team.name, leader: team.leader, sub_leader: team.sub_leader })
    })
    const data = await res.json()
    if (data.id) {
      teamIdMap.set(team.id, data.id)
      console.log(`팀: ${team.name} ✓`)
    } else {
      console.log(`팀 실패: ${team.name}`, data)
    }
  }
  console.log(`\n팀 ${teamIdMap.size}개 완료\n`)

  // 2. KPI 입력
  const kpiIdMap = new Map() // old_id → new_id
  for (const kpi of kpis) {
    const newTeamId = teamIdMap.get(kpi.team_id)
    if (!newTeamId) { console.log(`KPI 스킵 (팀 없음): ${kpi.name}`); continue }

    const res = await fetch(`${API_BASE}/kpis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: newTeamId,
        name: kpi.name,
        unit: kpi.unit,
        yearly_target: kpi.yearly_target,
        monthly_target: kpi.monthly_target,
        weekly_target: kpi.weekly_target,
        direction: kpi.direction || 'higher_better',
        weight: kpi.weight || 5,
        description: kpi.description,
        base_month: kpi.base_month,
        status: kpi.status || 'active',
      })
    })
    const data = await res.json()
    if (data.id) {
      kpiIdMap.set(kpi.id, data.id)
      console.log(`KPI: ${kpi.name} ✓`)
    } else {
      console.log(`KPI 실패: ${kpi.name}`, data)
    }
  }
  console.log(`\nKPI ${kpiIdMap.size}개 완료\n`)

  // 3. 보고서 입력
  let reportCount = 0
  for (const r of reports) {
    const newTeamId = teamIdMap.get(r.team_id)
    const newKpiId = kpiIdMap.get(r.kpi_id)
    if (!newTeamId || !newKpiId) continue

    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: newTeamId,
        kpi_id: newKpiId,
        report_date: r.report_date,
        monthly_target: r.monthly_target,
        weekly_target: r.weekly_target,
        weekly_achievement: r.weekly_achievement,
        weekly_achievement_rate: r.weekly_achievement_rate,
        monthly_cumulative: r.monthly_cumulative,
        monthly_achievement_rate: r.monthly_achievement_rate,
        strategy: r.strategy,
        plan: r.plan,
        do_action: r.do_action,
        check_result: r.check_result,
        action: r.action,
        issue: r.issue,
        help_needed: r.help_needed,
        action_executed: r.action_executed,
      })
    })
    if (res.ok) {
      reportCount++
      if (reportCount % 20 === 0) console.log(`보고서 ${reportCount}건 처리 중...`)
    }
  }

  console.log(`\n=== 완료 ===`)
  console.log(`팀: ${teamIdMap.size}개`)
  console.log(`KPI: ${kpiIdMap.size}개`)
  console.log(`보고서: ${reportCount}건`)
}

run().catch(console.error)
