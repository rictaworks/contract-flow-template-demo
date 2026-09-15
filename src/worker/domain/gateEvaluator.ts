import type { ApprovalRow, CriterionRow, DeliverableRow, PhaseRow } from "../db/types";
import type { GateVerdict } from "./types";

// R17 により自動付与され、達成状態を実データから自動算出する判断基準（人手による上書きを許さない）。
const AUTO_COMPUTED_CRITERIA = new Set(["承認記録が存在する", "持越し課題がゼロである", "未合意の変更要求がゼロである"]);

function requiredDeliverableState(gateKind: string): string[] {
  if (gateKind === "内部レビュー") return ["レビュー済", "承認済"];
  return ["承認済"]; // 顧客承認・検収
}

export interface GateEvaluationInput {
  phase: PhaseRow;
  deliverables: DeliverableRow[];
  criteria: CriterionRow[];
  approvals: ApprovalRow[];
  openCarryoverIssueCount: number;
  unagreedChangeRequestCount: number;
}

export const GateEvaluator = {
  evaluate(input: GateEvaluationInput): GateVerdict {
    const { phase, deliverables, criteria, approvals, openCarryoverIssueCount, unagreedChangeRequestCount } = input;
    const unmetRequired: string[] = [];
    const unmetRecommended: string[] = [];

    const okStates = requiredDeliverableState(phase.gate_kind);
    for (const d of deliverables) {
      if (d.requirement !== "必須") continue;
      if (!okStates.includes(d.state)) {
        unmetRequired.push(`成果物「${d.name}」が${okStates[okStates.length - 1]}になっていません`);
      }
    }

    if (phase.gate_kind !== "内部レビュー" && approvals.length === 0) {
      unmetRequired.push("承認記録が存在する");
    }

    for (const c of criteria) {
      const isAutoComputed = AUTO_COMPUTED_CRITERIA.has(c.text);
      let satisfied: boolean;
      if (isAutoComputed) {
        satisfied =
          c.text === "承認記録が存在する"
            ? approvals.length > 0
            : c.text === "持越し課題がゼロである"
              ? openCarryoverIssueCount === 0
              : unagreedChangeRequestCount === 0;
      } else {
        satisfied = c.satisfied === 1;
      }
      if (satisfied) continue;
      if (c.level === "必須") {
        if (!isAutoComputed || c.text !== "承認記録が存在する") unmetRequired.push(c.text);
      } else {
        unmetRecommended.push(c.text);
      }
    }

    // 承認記録の重複メッセージを除去
    const dedupedRequired = Array.from(new Set(unmetRequired));

    if (dedupedRequired.length > 0) {
      return { result: "不通過", unmetRequired: dedupedRequired, unmetRecommended: [] };
    }
    if (unmetRecommended.length > 0) {
      return { result: "条件付き通過", unmetRequired: [], unmetRecommended };
    }
    return { result: "通過", unmetRequired: [], unmetRecommended: [] };
  },
};
