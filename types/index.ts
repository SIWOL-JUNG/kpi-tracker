export interface Team {
  id: string;
  name: string;
  leader: string;
  sub_leader?: string;
  created_at: string;
}

export interface KPI {
  id: string;
  team_id: string;
  team_name?: string;
  name: string;
  unit: string;
  yearly_target?: number;
  monthly_target: number;
  weekly_target: number;
  direction: 'higher_better' | 'lower_better';
  weight: number;
  description: string;
  category?: string;    // 카테고리 (예: "개별 프로그램 성과")
  program?: string;     // 프로그램 (예: "상품 자동 추천")
  base_month: string;
  status: 'active' | 'completed';
  created_at: string;
}

// 월별 KPI 목표 (같은 KPI도 월마다 다른 목표)
export interface KPIGoal {
  id: string;
  kpi_id: string;
  goal_month: string;     // 'YYYY-MM' 형식
  monthly_target: number;
  weekly_target: number;
  created_at: string;
}

export interface Report {
  id: string;
  kpi_id: string;
  kpi_name?: string;
  team_id: string;
  team_name?: string;
  leader?: string;
  report_date: string;
  monthly_target?: number;
  weekly_target?: number;
  weekly_achievement?: number;
  weekly_achievement_rate?: number;
  monthly_cumulative?: number;
  monthly_achievement_rate?: number;
  strategy?: string;
  plan?: string;
  do_action?: string;
  check_result?: string;
  action?: string;
  action_executed?: boolean | null;
  issue?: string;
  help_needed?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  report_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  report_id: string;
  team_id: string;
  team_name?: string;
  kpi_id: string;
  kpi_name?: string;
  content: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export interface DashboardFilter {
  team_id: string;
  start_date: string;
  end_date: string;
}
