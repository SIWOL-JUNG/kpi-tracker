import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const teams = db.prepare('SELECT * FROM teams ORDER BY name').all()
  return NextResponse.json(teams)
}

export async function POST(request: Request) {
  const body = await request.json()
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO teams (id, name, leader, sub_leader) VALUES (?, ?, ?, ?)').run(id, body.name, body.leader || null, body.sub_leader || null)
  return NextResponse.json({ id, ...body })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const db = getDb()
  db.prepare('UPDATE teams SET name = ?, leader = ?, sub_leader = ? WHERE id = ?').run(body.name, body.leader || null, body.sub_leader || null, body.id)
  return NextResponse.json(body)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = getDb()
  db.prepare('DELETE FROM teams WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
