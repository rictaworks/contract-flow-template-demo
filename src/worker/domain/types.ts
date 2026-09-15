import type {
  ContractSegment,
  ContractType,
  Certainty,
  CriterionLevel,
  DeliverableRequirement,
  GateKind,
  Role,
  Scale,
  VerdictKind,
  WorkType,
} from "../master/enums";

export interface ProjectProfile {
  contractType: ContractType;
  workType: WorkType;
  scale: Scale;
  requirementCertainty: Certainty;
}

export interface ProfileWarning {
  ruleCode: string;
  message: string;
  recommendation: string;
}

export interface ProfileRejection {
  ruleCode: string;
  reason: string;
}

export interface ProfileValidationResult {
  accepted: boolean;
  rejection?: ProfileRejection;
  warnings: ProfileWarning[];
}

export interface DeliverableDraft {
  name: string;
  requirement: DeliverableRequirement;
  recurring: boolean;
  ownerRole: Role;
  originRuleCode: string;
}

export interface CriterionDraft {
  text: string;
  level: CriterionLevel;
  autoAttached: boolean;
  originRuleCode: string;
}

export interface PhaseDraft {
  key: string; // 案件内で一意（ハイブリッドのP03重複を区別するため code とは別軸）
  code: string; // 工程マスタのコード（P01〜P18）
  name: string;
  gateKind: GateKind;
  contractSegment?: ContractSegment;
  orderKey: number;
  appliedRules: string[];
  deliverables: DeliverableDraft[];
  criteria: CriterionDraft[];
}

export interface FlowInstance {
  profile: ProjectProfile;
  warnings: ProfileWarning[];
  phases: PhaseDraft[];
}

export interface GateVerdict {
  result: VerdictKind;
  unmetRequired: string[];
  unmetRecommended: string[];
}
