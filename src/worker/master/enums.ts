// マスタ区分値。すべての入力検証はこのホワイトリストと照合する（requirements.md 18章）。

export const CONTRACT_TYPES = ["請負", "準委任", "ハイブリッド"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const WORK_TYPES = ["新規開発", "改修", "保守運用", "調査"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const SCALES = ["小", "中", "大"] as const;
export type Scale = (typeof SCALES)[number];

export const CERTAINTIES = ["確定", "未確定"] as const;
export type Certainty = (typeof CERTAINTIES)[number];

export const GATE_KINDS = ["内部レビュー", "顧客承認", "検収"] as const;
export type GateKind = (typeof GATE_KINDS)[number];

export const CONTRACT_SEGMENTS = ["準委任", "請負"] as const;
export type ContractSegment = (typeof CONTRACT_SEGMENTS)[number];

export const PHASE_STATES = [
  "未着手",
  "進行中",
  "ゲート評価待ち",
  "要再確認",
  "通過",
  "条件付き通過",
  "凍結",
] as const;
export type PhaseState = (typeof PHASE_STATES)[number];

export const DELIVERABLE_REQUIREMENTS = ["必須", "任意"] as const;
export type DeliverableRequirement = (typeof DELIVERABLE_REQUIREMENTS)[number];

export const DELIVERABLE_STATES = ["未作成", "作成中", "レビュー済", "承認済", "要更新"] as const;
export type DeliverableState = (typeof DELIVERABLE_STATES)[number];

export const CRITERION_LEVELS = ["必須", "推奨"] as const;
export type CriterionLevel = (typeof CRITERION_LEVELS)[number];

export const VERDICT_KINDS = ["通過", "条件付き通過", "不通過"] as const;
export type VerdictKind = (typeof VERDICT_KINDS)[number];

export const PROJECT_STATES = ["起票中", "不成立", "進行中", "中止", "完了", "クローズ"] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];

export const CHANGE_REQUEST_STATES = ["起票", "影響評価中", "合意待ち", "反映済", "却下"] as const;
export type ChangeRequestState = (typeof CHANGE_REQUEST_STATES)[number];

export const CARRYOVER_ISSUE_STATES = ["未解決", "解決"] as const;
export type CarryoverIssueState = (typeof CARRYOVER_ISSUE_STATES)[number];

export const TRANSITION_KINDS = ["前進", "差戻し", "中止"] as const;
export type TransitionKind = (typeof TRANSITION_KINDS)[number];

export const MAINTENANCE_STAGES = ["受付", "切り分け", "対応", "報告"] as const;
export type MaintenanceStage = (typeof MAINTENANCE_STAGES)[number];

export const MAINTENANCE_CYCLE_STATES = ["進行中", "完了"] as const;
export type MaintenanceCycleState = (typeof MAINTENANCE_CYCLE_STATES)[number];

export const MAINTENANCE_RECORD_STATES = ["受付", "切り分け", "対応", "完了", "引継ぎ"] as const;
export type MaintenanceRecordState = (typeof MAINTENANCE_RECORD_STATES)[number];

export const ROLES = ["受注PM", "受注担当", "発注者窓口", "発注者決裁者"] as const;
export type Role = (typeof ROLES)[number];

function makeGuard<T extends readonly string[]>(values: T) {
  return (value: unknown): value is T[number] =>
    typeof value === "string" && (values as readonly string[]).includes(value);
}

export const isContractType = makeGuard(CONTRACT_TYPES);
export const isWorkType = makeGuard(WORK_TYPES);
export const isScale = makeGuard(SCALES);
export const isCertainty = makeGuard(CERTAINTIES);
export const isDeliverableState = makeGuard(DELIVERABLE_STATES);
export const isMaintenanceStage = makeGuard(MAINTENANCE_STAGES);
export const isMaintenanceRecordState = makeGuard(MAINTENANCE_RECORD_STATES);
export const isRole = makeGuard(ROLES);
