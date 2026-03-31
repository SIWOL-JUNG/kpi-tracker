import Database from 'better-sqlite3'
import path from 'path'

// DB 파일 경로 (앱 시작 시 자동 생성)
const DB_PATH = path.join(process.cwd(), 'data', 'kpi.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initTables(db)
  }
  return db
}

// 테이블 자동 생성
function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      leader TEXT,
      sub_leader TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kpis (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      unit TEXT,
      yearly_target REAL,
      monthly_target REAL,
      weekly_target REAL,
      direction TEXT DEFAULT 'higher_better' CHECK (direction IN ('higher_better', 'lower_better')),
      weight INTEGER DEFAULT 5,
      description TEXT,
      base_month TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kpi_goals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      kpi_id TEXT REFERENCES kpis(id) ON DELETE CASCADE,
      goal_month TEXT NOT NULL,
      monthly_target REAL,
      weekly_target REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(kpi_id, goal_month)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      kpi_id TEXT REFERENCES kpis(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      report_date TEXT NOT NULL,
      monthly_target REAL,
      weekly_target REAL,
      weekly_achievement REAL,
      weekly_achievement_rate REAL,
      monthly_cumulative REAL,
      monthly_achievement_rate REAL,
      strategy TEXT,
      plan TEXT,
      do_action TEXT,
      check_result TEXT,
      action TEXT,
      issue TEXT,
      help_needed TEXT,
      action_executed INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(kpi_id, report_date)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id),
      kpi_id TEXT REFERENCES kpis(id),
      content TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );
  `)

  // 기존 DB 마이그레이션 (컬럼이 없으면 추가)
  const migrations = [
    'ALTER TABLE reports ADD COLUMN action_executed INTEGER',
    "ALTER TABLE kpis ADD COLUMN direction TEXT DEFAULT 'higher_better'",
    'ALTER TABLE kpis ADD COLUMN weight INTEGER DEFAULT 5',
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch { /* 이미 존재하면 무시 */ }
  }
}
