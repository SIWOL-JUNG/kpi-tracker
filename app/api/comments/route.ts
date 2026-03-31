import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('report_id')
  const db = getDb()

  if (reportId) {
    const comments = db.prepare('SELECT * FROM comments WHERE report_id = ? ORDER BY created_at DESC').all(reportId)
    return NextResponse.json(comments)
  }

  const comments = db.prepare('SELECT * FROM comments ORDER BY created_at DESC').all()
  return NextResponse.json(comments)
}

export async function POST(request: Request) {
  const body = await request.json()
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO comments (id, report_id, author, content) VALUES (?, ?, ?, ?)').run(id, body.report_id, body.author, body.content)
  return NextResponse.json({ id, ...body })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDb()
  db.prepare('DELETE FROM comments WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
