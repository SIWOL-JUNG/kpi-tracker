import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '200')

  let query = supabase
    .from('reports')
    .select('*, kpis:kpi_id(name, unit, monthly_target), teams:team_id(name, leader)')

  if (teamId) query = query.eq('team_id', teamId)
  if (startDate) query = query.gte('report_date', startDate)
  if (endDate) query = query.lte('report_date', endDate)

  query = query.order('report_date', { ascending: false }).limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 관계 데이터를 평탄화
  const reports = data.map((r: Record<string, unknown>) => {
    const kpis = r.kpis as Record<string, unknown> | null
    const teams = r.teams as Record<string, unknown> | null
    return {
      ...r,
      kpi_name: kpis?.name || null,
      kpi_unit: kpis?.unit || null,
      kpi_monthly_target: kpis?.monthly_target || null,
      team_name: teams?.name || null,
      leader: teams?.leader || null,
      kpis: undefined,
      teams: undefined,
    }
  })

  return NextResponse.json(reports)
}

export async function POST(request: Request) {
  const body = await request.json()
  // upsert: 같은 kpi_id + report_date면 업데이트
  const { data, error } = await supabase.from('reports').upsert([{
    kpi_id: body.kpi_id,
    team_id: body.team_id,
    report_date: body.report_date,
    monthly_target: body.monthly_target,
    weekly_target: body.weekly_target,
    weekly_achievement: body.weekly_achievement,
    weekly_achievement_rate: body.weekly_achievement_rate,
    monthly_cumulative: body.monthly_cumulative,
    monthly_achievement_rate: body.monthly_achievement_rate,
    strategy: body.strategy,
    plan: body.plan,
    do_action: body.do_action,
    check_result: body.check_result,
    action: body.action,
    issue: body.issue,
    help_needed: body.help_needed,
    action_executed: body.action_executed ?? null,
  }], { onConflict: 'kpi_id,report_date' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const body = await request.json()
  const { data, error } = await supabase.from('reports').update({
    team_id: body.team_id,
    kpi_id: body.kpi_id,
    report_date: body.report_date,
    monthly_target: body.monthly_target,
    weekly_target: body.weekly_target,
    weekly_achievement: body.weekly_achievement,
    weekly_achievement_rate: body.weekly_achievement_rate,
    monthly_cumulative: body.monthly_cumulative,
    monthly_achievement_rate: body.monthly_achievement_rate,
    strategy: body.strategy,
    plan: body.plan,
    do_action: body.do_action,
    check_result: body.check_result,
    action: body.action,
    issue: body.issue,
    help_needed: body.help_needed,
    action_executed: body.action_executed ?? null,
  }).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
