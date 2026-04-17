import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('kpis')
    .select('*, teams:team_id(name)')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // teams 관계를 team_name으로 평탄화
  const kpis = data.map((k: Record<string, unknown>) => ({
    ...k,
    team_name: (k.teams as Record<string, unknown> | null)?.name || null,
    teams: undefined,
  }))
  return NextResponse.json(kpis)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data, error } = await supabase.from('kpis').insert([{
    team_id: body.team_id,
    name: body.name,
    unit: body.unit,
    yearly_target: body.yearly_target,
    monthly_target: body.monthly_target,
    weekly_target: body.weekly_target,
    direction: body.direction || 'higher_better',
    weight: body.weight || 5,
    description: body.description,
    category: body.category || null,
    program: body.program || null,
    base_month: body.base_month,
    status: body.status || 'active',
  }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const body = await request.json()
  let updateData: Record<string, unknown>

  if (body.status !== undefined && Object.keys(body).length === 2) {
    // 상태만 변경
    updateData = { status: body.status }
  } else {
    updateData = {
      team_id: body.team_id,
      name: body.name,
      unit: body.unit,
      yearly_target: body.yearly_target,
      monthly_target: body.monthly_target,
      weekly_target: body.weekly_target,
      direction: body.direction || 'higher_better',
      weight: body.weight || 5,
      description: body.description,
      category: body.category || null,
      program: body.program || null,
      base_month: body.base_month,
      status: body.status || 'active',
    }
  }

  const { data, error } = await supabase.from('kpis').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('kpis').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
