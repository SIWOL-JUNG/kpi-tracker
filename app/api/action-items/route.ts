import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const status = searchParams.get('status')
  const reportId = searchParams.get('report_id')
  const db = getDb()

  let sql = `
    SELECT a.*, t.name as team_name, k.name as kpi_name
    FROM action_items a
    LEFT JOIN teams t ON a.team_id = t.id
    LEFT JOIN kpis k ON a.kpi_id = k.id
    WHERE 1=1
  `
  const params: string[] = []
  if (teamId) { sql += ' AND a.team_id = ?'; params.push(teamId) }
  if (status) { sql += ' AND a.status = ?'; params.push(status) }
  if (reportId) { sql += ' AND a.report_id = ?'; params.push(reportId) }
  sql += ' ORDER BY a.created_at DESC'

  const items = db.prepare(sql).all(...params)
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO action_items (id, report_id, team_id, kpi_id, content, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, body.report_id || null, body.team_id, body.kpi_id || null, body.content, body.status || 'open'
  )
  return NextResponse.json({ id, ...body })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const db = getDb()
  if (body.status === 'resolved') {
    db.prepare('UPDATE action_items SET status = ?, resolved_at = datetime("now") WHERE id = ?').run(body.status, body.id)
  } else {
    db.prepare('UPDATE action_items SET status = ?, resolved_at = NULL WHERE id = ?').run(body.status, body.id)
  }
  return NextResponse.json(body)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDb()
  db.prepare('DELETE FROM action_items WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
