-- KPI Tracker Database Schema for Supabase

-- 팀 테이블 (00_Config 시트 대응)
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leader TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPI 항목 테이블
CREATE TABLE kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT,
  yearly_target NUMERIC,               -- 연간 총 목표
  monthly_target NUMERIC,             -- 기본 월간목표 (fallback)
  weekly_target NUMERIC,              -- 기본 주간목표 (fallback)
  description TEXT,
  base_month TEXT,                     -- KPI 측정 시작월 (YYYY-MM)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 월별 KPI 목표 테이블 (02_Goals 시트 대응)
-- 같은 KPI도 월마다 목표가 다를 수 있음
CREATE TABLE kpi_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  goal_month TEXT NOT NULL,            -- '2026-03' 형식
  monthly_target NUMERIC,
  weekly_target NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(kpi_id, goal_month)
);

-- 주간 보고서 테이블 (01_Log 시트 대응)
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  monthly_target NUMERIC,              -- 해당 보고 시점의 월간목표
  weekly_target NUMERIC,
  weekly_achievement NUMERIC,
  weekly_achievement_rate NUMERIC,     -- 주간달성률
  monthly_cumulative NUMERIC,          -- 월간누적달성
  monthly_achievement_rate NUMERIC,    -- 월간달성률
  strategy TEXT,                       -- 전략
  plan TEXT,                           -- PLAN (계획)
  do_action TEXT,                      -- DO (실행현황)
  check_result TEXT,                   -- CHECK (분석 및 피드백)
  action TEXT,                         -- ACTION (다음 주 계획)
  issue TEXT,                          -- 해결과제 & 도움
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(kpi_id, report_date)          -- 같은 KPI + 같은 날짜 중복 방지
);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 공개 접근 허용 (내부 팀 전용, 인증 없이 사용)
CREATE POLICY "Allow all access to teams" ON teams FOR ALL USING (true);
CREATE POLICY "Allow all access to kpis" ON kpis FOR ALL USING (true);
CREATE POLICY "Allow all access to kpi_goals" ON kpi_goals FOR ALL USING (true);
CREATE POLICY "Allow all access to reports" ON reports FOR ALL USING (true);

-- 인덱스
CREATE INDEX idx_kpis_team_id ON kpis(team_id);
CREATE INDEX idx_kpi_goals_kpi_id ON kpi_goals(kpi_id);
CREATE INDEX idx_reports_team_id ON reports(team_id);
CREATE INDEX idx_reports_kpi_id ON reports(kpi_id);
CREATE INDEX idx_reports_date ON reports(report_date);
CREATE INDEX idx_reports_kpi_date ON reports(kpi_id, report_date);
