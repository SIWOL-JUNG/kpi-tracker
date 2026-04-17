import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('kpi_goals')
    .select('*')
    .order('goal_month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  // upsert: 같은 kpi_id + goal_month면 업데이트
  const { data, error } = await supabase.from('kpi_goals').upsert([{
    kpi_id: body.kpi_id,
    goal_month: body.goal_month,
    monthly_target: body.monthly_target,
    weekly_target: body.weekly_target,
  }], { onConflict: 'kpi_id,goal_month' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('kpi_goals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
