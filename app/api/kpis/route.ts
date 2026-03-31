import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const kpis = db.prepare(`
    SELECT k.*, t.name as team_name
    FROM kpis k LEFT JOIN teams t ON k.team_id = t.id
    ORDER BY k.name
  `).all()
  return NextResponse.json(kpis)
}

export async function POST(request: Request) {
  const body = await request.json()
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO kpis (id, team_id, name, unit, yearly_target, monthly_target, weekly_target, direction, weight, description, base_month, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, body.team_id, body.name, body.unit, body.yearly_target, body.monthly_target, body.weekly_target, body.direction || 'higher_better', body.weight || 5, body.description, body.base_month, body.status || 'active')
  return NextResponse.json({ id, ...body })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const db = getDb()
  if (body.status !== undefined && Object.keys(body).length === 2) {
    // 상태만 변경
    db.prepare('UPDATE kpis SET status = ? WHERE id = ?').run(body.status, body.id)
  } else {
    db.prepare(`
      UPDATE kpis SET team_id = ?, name = ?, unit = ?, yearly_target = ?, monthly_target = ?, weekly_target = ?, direction = ?, weight = ?, description = ?, base_month = ?, status = ?
      WHERE id = ?
    `).run(body.team_id, body.name, body.unit, body.yearly_target, body.monthly_target, body.weekly_target, body.direction || 'higher_better', body.weight || 5, body.description, body.base_month, body.status || 'active', body.id)
  }
  return NextResponse.json(body)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDb()
  db.prepare('DELETE FROM kpis WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
