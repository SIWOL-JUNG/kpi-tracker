import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const goals = db.prepare('SELECT * FROM kpi_goals ORDER BY goal_month DESC').all()
  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const body = await request.json()
  const db = getDb()
  const id = crypto.randomUUID()
  // upsert: 같은 kpi_id + goal_month면 업데이트
  db.prepare(`
    INSERT INTO kpi_goals (id, kpi_id, goal_month, monthly_target, weekly_target)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(kpi_id, goal_month) DO UPDATE SET
      monthly_target = excluded.monthly_target,
      weekly_target = excluded.weekly_target
  `).run(id, body.kpi_id, body.goal_month, body.monthly_target, body.weekly_target)
  return NextResponse.json({ id, ...body })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDb()
  db.prepare('DELETE FROM kpi_goals WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
