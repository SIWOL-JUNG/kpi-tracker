-- 기존 DB에 적용할 마이그레이션 SQL
-- Supabase SQL Editor에서 실행

-- 1. teams 테이블에서 unit 컬럼 제거 (단위는 KPI별로 관리)
-- ALTER TABLE teams DROP COLUMN IF EXISTS unit;
-- (주의: 기존 데이터가 있으면 먼저 확인 후 실행)

-- 2. kpi_goals 테이블 생성 (월별 목표)
CREATE TABLE IF NOT EXISTS kpi_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  goal_month TEXT NOT NULL,
  monthly_target NUMERIC,
  weekly_target NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(kpi_id, goal_month)
);

-- 3. reports 테이블에 누락된 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS monthly_target NUMERIC;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS weekly_achievement_rate NUMERIC;

-- 4. 중복 방지 제약 (같은 KPI + 같은 날짜)
-- 주의: 기존에 중복 데이터가 있으면 먼저 정리 필요
-- 중복 확인: SELECT kpi_id, report_date, COUNT(*) FROM reports GROUP BY kpi_id, report_date HAVING COUNT(*) > 1;
ALTER TABLE reports ADD CONSTRAINT IF NOT EXISTS unique_kpi_report UNIQUE (kpi_id, report_date);

-- 5. 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_kpi_goals_kpi_id ON kpi_goals(kpi_id);
CREATE INDEX IF NOT EXISTS idx_reports_kpi_date ON reports(kpi_id, report_date);

-- 6. KPI 상태 컬럼 추가
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 7. RLS 정책
ALTER TABLE kpi_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to kpi_goals" ON kpi_goals FOR ALL USING (true);

-- 8. KPI 카테고리/프로그램 컬럼 추가 (2026-04-06)
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE kpis ADD COLUMN IF NOT EXISTS program TEXT;
CREATE INDEX IF NOT EXISTS idx_kpis_category ON kpis(team_id, category);
