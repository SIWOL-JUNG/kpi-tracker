import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = searchParams.get('limit') || '200'

  const db = getDb()
  let sql = `
    SELECT r.*, k.name as kpi_name, k.unit as kpi_unit, k.monthly_target as kpi_monthly_target,
           t.name as team_name, t.leader
    FROM reports r
    LEFT JOIN kpis k ON r.kpi_id = k.id
    LEFT JOIN teams t ON r.team_id = t.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (teamId) { sql += ' AND r.team_id = ?'; params.push(teamId) }
  if (startDate) { sql += ' AND r.report_date >= ?'; params.push(startDate) }
  if (endDate) { sql += ' AND r.report_date <= ?'; params.push(endDate) }

  sql += ' ORDER BY r.report_date DESC LIMIT ?'
  params.push(parseInt(limit))

  const reports = db.prepare(sql).all(...params)
  return NextResponse.json(reports)
}

export async function POST(request: Request) {
  const body = await request.json()
  const db = getDb()
  const id = body.id || crypto.randomUUID()

  // upsert: 같은 kpi_id + report_date면 업데이트
  db.prepare(`
    INSERT INTO reports (id, kpi_id, team_id, report_date, monthly_target, weekly_target, weekly_achievement, weekly_achievement_rate, monthly_cumulative, monthly_achievement_rate, strategy, plan, do_action, check_result, action, issue, help_needed, action_executed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(kpi_id, report_date) DO UPDATE SET
      team_id = excluded.team_id,
      monthly_target = excluded.monthly_target,
      weekly_target = excluded.weekly_target,
      weekly_achievement = excluded.weekly_achievement,
      weekly_achievement_rate = excluded.weekly_achievement_rate,
      monthly_cumulative = excluded.monthly_cumulative,
      monthly_achievement_rate = excluded.monthly_achievement_rate,
      strategy = excluded.strategy,
      plan = excluded.plan,
      do_action = excluded.do_action,
      check_result = excluded.check_result,
      action = excluded.action,
      issue = excluded.issue,
      help_needed = excluded.help_needed,
      action_executed = excluded.action_executed
  `).run(
    id, body.kpi_id, body.team_id, body.report_date,
    body.monthly_target, body.weekly_target, body.weekly_achievement, body.weekly_achievement_rate,
    body.monthly_cumulative, body.monthly_achievement_rate,
    body.strategy, body.plan, body.do_action, body.check_result, body.action, body.issue, body.help_needed, body.action_executed ?? null
  )
  return NextResponse.json({ id, ...body })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const db = getDb()
  db.prepare(`
    UPDATE reports SET
      team_id = ?, kpi_id = ?, report_date = ?,
      monthly_target = ?, weekly_target = ?, weekly_achievement = ?, weekly_achievement_rate = ?,
      monthly_cumulative = ?, monthly_achievement_rate = ?,
      strategy = ?, plan = ?, do_action = ?, check_result = ?, action = ?, issue = ?, help_needed = ?, action_executed = ?
    WHERE id = ?
  `).run(
    body.team_id, body.kpi_id, body.report_date,
    body.monthly_target, body.weekly_target, body.weekly_achievement, body.weekly_achievement_rate,
    body.monthly_cumulative, body.monthly_achievement_rate,
    body.strategy, body.plan, body.do_action, body.check_result, body.action, body.issue, body.help_needed, body.action_executed ?? null,
    body.id
  )
  return NextResponse.json(body)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDb()
  db.prepare('DELETE FROM reports WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
