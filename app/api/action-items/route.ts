import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const status = searchParams.get('status')
  const reportId = searchParams.get('report_id')

  let query = supabase
    .from('action_items')
    .select('*, teams:team_id(name), kpis:kpi_id(name)')
    .order('created_at', { ascending: false })

  if (teamId) query = query.eq('team_id', teamId)
  if (status) query = query.eq('status', status)
  if (reportId) query = query.eq('report_id', reportId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 관계 데이터를 평탄화
  const items = data.map((a: Record<string, unknown>) => ({
    ...a,
    team_name: (a.teams as Record<string, unknown> | null)?.name || null,
    kpi_name: (a.kpis as Record<string, unknown> | null)?.name || null,
    teams: undefined,
    kpis: undefined,
  }))

  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data, error } = await supabase.from('action_items').insert([{
    report_id: body.report_id || null,
    team_id: body.team_id,
    kpi_id: body.kpi_id || null,
    content: body.content,
    status: body.status || 'open',
  }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const body = await request.json()
  const updateData: Record<string, unknown> = { status: body.status }

  if (body.status === 'resolved') {
    updateData.resolved_at = new Date().toISOString()
  } else {
    updateData.resolved_at = null
  }

  const { data, error } = await supabase.from('action_items').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('action_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
