-- 受託業務標準フローテンプレート（デモ版） D1 初期スキーマ
-- マスタ（工程・成果物・判断基準・派生規則）はアプリケーションに同梱する固定データであり、
-- ここには案件ごとに展開された結果のみを保存する（requirements.md 10章）。
-- 全テーブル（sessions を除く）は session_id を保持し、オーナーキーとして全クエリに含めること。

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  contract_type TEXT NOT NULL,
  work_type TEXT NOT NULL,
  scale TEXT NOT NULL,
  requirement_certainty TEXT NOT NULL,
  state TEXT NOT NULL,
  current_phase_id TEXT,
  aborted_reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_session ON projects(session_id);

CREATE TABLE IF NOT EXISTS project_warnings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_project_warnings_session ON project_warnings(session_id);
CREATE INDEX IF NOT EXISTS idx_project_warnings_project ON project_warnings(project_id);

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  phase_code TEXT NOT NULL,
  name TEXT NOT NULL,
  gate_kind TEXT NOT NULL,
  contract_segment TEXT,
  state TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phases_session ON phases(session_id);
CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id);

CREATE TABLE IF NOT EXISTS phase_rules (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  effect TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phase_rules_session ON phase_rules(session_id);
CREATE INDEX IF NOT EXISTS idx_phase_rules_phase ON phase_rules(phase_id);

CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  name TEXT NOT NULL,
  requirement TEXT NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 0,
  owner_role TEXT NOT NULL,
  state TEXT NOT NULL,
  origin_rule_code TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deliverables_session ON deliverables(session_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_phase ON deliverables(phase_id);

CREATE TABLE IF NOT EXISTS criteria (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  text TEXT NOT NULL,
  level TEXT NOT NULL,
  auto_attached INTEGER NOT NULL DEFAULT 0,
  satisfied INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_criteria_session ON criteria(session_id);
CREATE INDEX IF NOT EXISTS idx_criteria_phase ON criteria(phase_id);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  approved_on TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approvals_session ON approvals(session_id);
CREATE INDEX IF NOT EXISTS idx_approvals_phase ON approvals(phase_id);

CREATE TABLE IF NOT EXISTS gate_reviews (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  verdict TEXT NOT NULL,
  unmet_required TEXT NOT NULL DEFAULT '[]',
  unmet_recommended TEXT NOT NULL DEFAULT '[]',
  reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gate_reviews_session ON gate_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_gate_reviews_phase ON gate_reviews(phase_id);

CREATE TABLE IF NOT EXISTS carryover_issues (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  origin_phase_id TEXT NOT NULL,
  text TEXT NOT NULL,
  state TEXT NOT NULL,
  resolved_phase_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_carryover_issues_session ON carryover_issues(session_id);
CREATE INDEX IF NOT EXISTS idx_carryover_issues_project ON carryover_issues(project_id);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  raised_phase_id TEXT NOT NULL,
  title TEXT NOT NULL,
  affects_effort INTEGER NOT NULL DEFAULT 0,
  affects_schedule INTEGER NOT NULL DEFAULT 0,
  affects_cost INTEGER NOT NULL DEFAULT 0,
  requires_amendment INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_change_requests_session ON change_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON change_requests(project_id);

CREATE TABLE IF NOT EXISTS change_request_impacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  change_request_id TEXT NOT NULL,
  deliverable_id TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cr_impacts_session ON change_request_impacts(session_id);
CREATE INDEX IF NOT EXISTS idx_cr_impacts_cr ON change_request_impacts(change_request_id);

CREATE TABLE IF NOT EXISTS maintenance_cycles (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  phase_id TEXT NOT NULL,
  cycle_no INTEGER NOT NULL,
  stage TEXT NOT NULL,
  state TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maintenance_cycles_session ON maintenance_cycles(session_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_cycles_phase ON maintenance_cycles(phase_id);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  state TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_session ON maintenance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_cycle ON maintenance_records(cycle_id);

CREATE TABLE IF NOT EXISTS transitions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  from_phase_id TEXT,
  to_phase_id TEXT,
  kind TEXT NOT NULL,
  reason TEXT,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transitions_session ON transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_transitions_project ON transitions(project_id);
