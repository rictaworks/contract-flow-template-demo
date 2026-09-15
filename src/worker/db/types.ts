// D1 の行そのものの形（snake_case）。ドメイン層はこれを直接受け取り、過剰なマッピング層は設けない（KISS）。

export interface ProjectRow {
  id: string;
  session_id: string;
  label: string;
  contract_type: string;
  work_type: string;
  scale: string;
  requirement_certainty: string;
  state: string;
  current_phase_id: string | null;
  aborted_reason: string | null;
  created_at: string;
}

export interface ProjectWarningRow {
  id: string;
  session_id: string;
  project_id: string;
  rule_code: string;
  message: string;
  recommendation: string;
}

export interface PhaseRow {
  id: string;
  session_id: string;
  project_id: string;
  seq: number;
  phase_code: string;
  name: string;
  gate_kind: string;
  contract_segment: string | null;
  state: string;
}

export interface PhaseRuleRow {
  id: string;
  session_id: string;
  phase_id: string;
  rule_code: string;
  effect: string;
}

export interface DeliverableRow {
  id: string;
  session_id: string;
  phase_id: string;
  name: string;
  requirement: string;
  recurring: number;
  owner_role: string;
  state: string;
  origin_rule_code: string;
}

export interface CriterionRow {
  id: string;
  session_id: string;
  phase_id: string;
  text: string;
  level: string;
  auto_attached: number;
  satisfied: number;
  note: string | null;
}

export interface ApprovalRow {
  id: string;
  session_id: string;
  phase_id: string;
  approver_role: string;
  approved_on: string;
}

export interface GateReviewRow {
  id: string;
  session_id: string;
  phase_id: string;
  verdict: string;
  unmet_required: string;
  unmet_recommended: string;
  reviewed_at: string;
}

export interface CarryoverIssueRow {
  id: string;
  session_id: string;
  project_id: string;
  origin_phase_id: string;
  text: string;
  state: string;
  resolved_phase_id: string | null;
}

export interface ChangeRequestRow {
  id: string;
  session_id: string;
  project_id: string;
  raised_phase_id: string;
  title: string;
  affects_effort: number;
  affects_schedule: number;
  affects_cost: number;
  requires_amendment: number;
  state: string;
  reason: string | null;
}

export interface ChangeRequestImpactRow {
  id: string;
  session_id: string;
  change_request_id: string;
  deliverable_id: string;
}

export interface MaintenanceCycleRow {
  id: string;
  session_id: string;
  phase_id: string;
  cycle_no: number;
  stage: string;
  state: string;
}

export interface MaintenanceRecordRow {
  id: string;
  session_id: string;
  cycle_id: string;
  summary: string;
  state: string;
}

export interface TransitionRow {
  id: string;
  session_id: string;
  project_id: string;
  from_phase_id: string | null;
  to_phase_id: string | null;
  kind: string;
  reason: string | null;
  occurred_at: string;
}
