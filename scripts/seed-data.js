// 시트 데이터를 앱 DB에 넣는 스크립트
// 실행: node scripts/seed-data.js

const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')

const DB_PATH = path.join(__dirname, '..', 'data', 'kpi.db')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, leader TEXT, sub_leader TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS kpis (id TEXT PRIMARY KEY, team_id TEXT REFERENCES teams(id) ON DELETE CASCADE, name TEXT NOT NULL, unit TEXT, yearly_target REAL, monthly_target REAL, weekly_target REAL, description TEXT, base_month TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS kpi_goals (id TEXT PRIMARY KEY, kpi_id TEXT REFERENCES kpis(id) ON DELETE CASCADE, goal_month TEXT NOT NULL, monthly_target REAL, weekly_target REAL, created_at TEXT DEFAULT (datetime('now')), UNIQUE(kpi_id, goal_month));
  CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, kpi_id TEXT REFERENCES kpis(id) ON DELETE CASCADE, team_id TEXT REFERENCES teams(id) ON DELETE CASCADE, report_date TEXT NOT NULL, monthly_target REAL, weekly_target REAL, weekly_achievement REAL, weekly_achievement_rate REAL, monthly_cumulative REAL, monthly_achievement_rate REAL, strategy TEXT, plan TEXT, do_action TEXT, check_result TEXT, action TEXT, issue TEXT, created_at TEXT DEFAULT (datetime('now')), UNIQUE(kpi_id, report_date));
  CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, report_id TEXT REFERENCES reports(id) ON DELETE CASCADE, author TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS action_items (id TEXT PRIMARY KEY, report_id TEXT REFERENCES reports(id) ON DELETE CASCADE, team_id TEXT REFERENCES teams(id), kpi_id TEXT REFERENCES kpis(id), content TEXT NOT NULL, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')), resolved_at TEXT);
`)

// 팀 데이터
const teams = [
  { name: '마케팅', leader: '이성희', sub_leader: null },
  { name: '운영', leader: '정시월', sub_leader: '최예솔' },
  { name: '유통혁신', leader: '김준헌', sub_leader: null },
  { name: '품질관리', leader: '정시월', sub_leader: '천승민' },
  { name: 'B2B 솔루션', leader: '최수림', sub_leader: null },
  { name: '경영관리', leader: '배주연', sub_leader: null },
  { name: 'PI', leader: '정시월', sub_leader: null },
]

// KPI 데이터 (02_Goals 시트 기반)
const kpis = [
  // 마케팅
  { team: '마케팅', name: '제휴마케팅 매출', unit: '원', monthly_target: 10000000, base_month: '2025-12' },
  { team: '마케팅', name: 'B2C ROAS', unit: '퍼센트', monthly_target: 1200, base_month: '2025-12' },
  { team: '마케팅', name: 'B2C 고도몰 매출 YOY', unit: '원', monthly_target: 100000000, base_month: '2025-12' },
  { team: '마케팅', name: 'B2C 매출총이익률', unit: '퍼센트', monthly_target: 30, base_month: '2025-12' },
  { team: '마케팅', name: 'B2C 총 매출목표', unit: '원', monthly_target: 600000000, base_month: '2025-12' },

  // 운영
  { team: '운영', name: '상품추천 전환률', unit: '퍼센트', monthly_target: 27, base_month: '2025-12' },
  { team: '운영', name: '환불 인입률 감소', unit: '퍼센트', monthly_target: 15, base_month: '2025-12' },
  { team: '운영', name: '환불 방어', unit: '퍼센트', monthly_target: 7, base_month: '2025-12' },
  { team: '운영', name: '환불 인입 사유 분석 및 제거', unit: '건수', monthly_target: 5, base_month: '2025-12' },
  { team: '운영', name: 'ARS 도입 후 수치 변화', unit: '건수', monthly_target: 10, base_month: '2025-12' },
  { team: '운영', name: '실물 재고 일치율 증가', unit: '퍼센트', monthly_target: 98, base_month: '2025-12' },
  { team: '운영', name: '출고 지연 사유 분석후 사유 제거', unit: '건수', monthly_target: 5, base_month: '2025-12' },
  { team: '운영', name: '상품화 완료 후 업로드 누락률 감소(개별)', unit: '퍼센트', monthly_target: 1, base_month: '2025-12' },
  { team: '운영', name: '고도몰 관리 효율 개선 건수 증가', unit: '건수', monthly_target: 3, base_month: '2025-12' },
  { team: '운영', name: '출고시간 단축', unit: '시간', monthly_target: 1.7, base_month: '2025-12' },

  // 유통혁신
  { team: '유통혁신', name: '신규 유통 채널 매출 (내부 리소스 사용O)', unit: '원', monthly_target: 5000000, base_month: '2025-12' },
  { team: '유통혁신', name: '아웃바운드 매입 절감율', unit: '퍼센트', monthly_target: 5, base_month: '2026-01' },
  { team: '유통혁신', name: '아웃바운드 매입 대수', unit: '건수', monthly_target: 100, base_month: '2025-12' },
  { team: '유통혁신', name: '인바운드 매입수량', unit: '건수', monthly_target: 100, base_month: '2025-12' },
  { team: '유통혁신', name: '개인매입 인바운드 문의 고객전환률', unit: '퍼센트', monthly_target: 20, base_month: '2025-12' },
  { team: '유통혁신', name: '인바운드 매입기준가 대비 할인율', unit: '퍼센트', monthly_target: 30, base_month: '2025-12' },
  { team: '유통혁신', name: '인바운드 1차 매입 전환률', unit: '퍼센트', monthly_target: 25, base_month: '2025-12' },
  { team: '유통혁신', name: '인바운드 2차 매입 전환률', unit: '퍼센트', monthly_target: 20, base_month: '2025-12' },
  { team: '유통혁신', name: 'B2B 매입 제안 받은 횟수', unit: '건수', monthly_target: 8, base_month: '2025-12' },
  { team: '유통혁신', name: 'B2B 매출액 (유통혁신)', unit: '원', monthly_target: 5000000, base_month: '2025-12' },
  { team: '유통혁신', name: '신규 제품 또는 카테고리 추가로 매출액 증가', unit: '건수', monthly_target: 1, base_month: '2026-01' },
  { team: '유통혁신', name: '신규 유통 채널 매출', unit: '원', monthly_target: 5000000, base_month: '2026-02' },
  { team: '유통혁신', name: '태블릿 매출액', unit: '원', monthly_target: 20000000, base_month: '2026-02' },
  { team: '유통혁신', name: '정부지원사업 매출액', unit: '원', monthly_target: 66000000, base_month: '2026-02' },
  { team: '유통혁신', name: '노트북 매출액', unit: '원', monthly_target: 5000000, base_month: '2026-02' },

  // 품질관리
  { team: '품질관리', name: '결함 감지 및 제거 증가', unit: '개선건수', monthly_target: 5, base_month: '2026-01' },
  { team: '품질관리', name: '리드효과 유지', unit: '리드효과', monthly_target: 1.8, base_month: '2025-12' },
  { team: '품질관리', name: '마감 산출물 달성률', unit: '퍼센트', monthly_target: 95, base_month: '2025-12' },
  { team: '품질관리', name: '불량률 감소', unit: '퍼센트', monthly_target: 2, base_month: '2025-12' },
  { team: '품질관리', name: '산출물 수량 주 총량', unit: '수량', monthly_target: 1800, base_month: '2025-12' },
  { team: '품질관리', name: '필요 수량 주 총량', unit: '수량', monthly_target: 140, base_month: '2025-12' },

  // B2B 솔루션
  { team: 'B2B 솔루션', name: '고도몰 문의 건의 전환 비율', unit: '퍼센트', monthly_target: 66, base_month: '2025-11' },
  { team: 'B2B 솔루션', name: '기준가 대비 증감 비율', unit: '퍼센트', monthly_target: 10, base_month: '2025-11' },
  { team: 'B2B 솔루션', name: '입찰 중요도에 따른 낙찰 비율', unit: '퍼센트', monthly_target: 100, base_month: '2025-11' },
  { team: 'B2B 솔루션', name: '주간별 업로드 횟수', unit: '건수', monthly_target: 2, base_month: '2025-11' },
  { team: 'B2B 솔루션', name: '특정 주기별 특정 업체와 판매 제품 종류 수', unit: '건수', monthly_target: 2, base_month: '2025-11' },
  { team: 'B2B 솔루션', name: '월간 출고 수량', unit: '수량', monthly_target: 300, base_month: '2025-12' },
  { team: 'B2B 솔루션', name: '판매 업무 매뉴얼화', unit: '건수', monthly_target: 6, base_month: '2025-12' },
  { team: 'B2B 솔루션', name: '매뉴얼화된 판매 업무 인수인계', unit: '건수', monthly_target: 6, base_month: '2025-12' },

  // 경영관리 (구 HR)
  { team: '경영관리', name: '인사관련 KPI 대표님 컨펌 대기', unit: '건수', monthly_target: 1, base_month: '2025-12' },

  // PI
  { team: 'PI', name: 'PI관련 KPI 대표님 컨펌 대기', unit: '건수', monthly_target: 1, base_month: '2025-12' },
  { team: 'PI', name: '개선 과제 완료 건수', unit: '건수', monthly_target: 12, base_month: '2026-01' },
]

// 실행
console.log('=== KPI Tracker 데이터 입력 시작 ===\n')

// 1. 팀 입력
const insertTeam = db.prepare('INSERT INTO teams (id, name, leader, sub_leader) VALUES (?, ?, ?, ?)')
const teamMap = new Map()

for (const team of teams) {
  const id = crypto.randomUUID()
  insertTeam.run(id, team.name, team.leader, team.sub_leader)
  teamMap.set(team.name, id)
  console.log(`팀 추가: ${team.name} (팀장: ${team.leader}${team.sub_leader ? ', 부팀장: ' + team.sub_leader : ''})`)
}
console.log(`\n팀 ${teams.length}개 추가 완료\n`)

// 2. KPI 입력
const insertKpi = db.prepare('INSERT INTO kpis (id, team_id, name, unit, monthly_target, base_month, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
let kpiCount = 0

for (const kpi of kpis) {
  const teamId = teamMap.get(kpi.team)
  if (!teamId) {
    console.log(`⚠ 팀 "${kpi.team}" 을 찾을 수 없음: ${kpi.name}`)
    continue
  }
  const id = crypto.randomUUID()
  insertKpi.run(id, teamId, kpi.name, kpi.unit, kpi.monthly_target, kpi.base_month, 'active')
  kpiCount++
}
console.log(`KPI ${kpiCount}개 추가 완료\n`)

console.log('=== 데이터 입력 완료 ===')
console.log(`팀: ${teams.length}개`)
console.log(`KPI: ${kpiCount}개`)

db.close()
