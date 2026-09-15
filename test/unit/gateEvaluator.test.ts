import { describe, expect, it } from "vitest";
import { GateEvaluator } from "../../src/worker/domain/gateEvaluator";
import type { ApprovalRow, CriterionRow, DeliverableRow, PhaseRow } from "../../src/worker/db/types";

function phase(overrides: Partial<PhaseRow> = {}): PhaseRow {
  return {
    id: "phase-1",
    session_id: "s1",
    project_id: "proj-1",
    seq: 1,
    phase_code: "P04",
    name: "要件定義",
    gate_kind: "顧客承認",
    contract_segment: null,
    state: "進行中",
    ...overrides,
  };
}

function deliverable(overrides: Partial<DeliverableRow> = {}): DeliverableRow {
  return {
    id: "d1",
    session_id: "s1",
    phase_id: "phase-1",
    name: "要件定義書",
    requirement: "必須",
    recurring: 0,
    owner_role: "受注PM",
    state: "未作成",
    origin_rule_code: "R02",
    ...overrides,
  };
}

function criterion(overrides: Partial<CriterionRow> = {}): CriterionRow {
  return {
    id: "c1",
    session_id: "s1",
    phase_id: "phase-1",
    text: "要件一覧の各項目に採否が記録されている",
    level: "必須",
    auto_attached: 0,
    satisfied: 0,
    note: null,
    ...overrides,
  };
}

describe("GateEvaluator", () => {
  it("必須成果物が未達なら不通過", () => {
    const verdict = GateEvaluator.evaluate({
      phase: phase(),
      deliverables: [deliverable({ state: "未作成" })],
      criteria: [],
      approvals: [{ id: "a1", session_id: "s1", phase_id: "phase-1", approver_role: "発注者窓口", approved_on: "2026-09-01" } satisfies ApprovalRow],
      openCarryoverIssueCount: 0,
      unagreedChangeRequestCount: 0,
    });
    expect(verdict.result).toBe("不通過");
    expect(verdict.unmetRequired.length).toBeGreaterThan(0);
  });

  it("顧客承認ゲートで承認記録が無ければ他が達成済でも不通過", () => {
    const verdict = GateEvaluator.evaluate({
      phase: phase(),
      deliverables: [deliverable({ state: "承認済" })],
      criteria: [criterion({ satisfied: 1 })],
      approvals: [],
      openCarryoverIssueCount: 0,
      unagreedChangeRequestCount: 0,
    });
    expect(verdict.result).toBe("不通過");
    expect(verdict.unmetRequired).toContain("承認記録が存在する");
  });

  it("必須達成・推奨未達は条件付き通過", () => {
    const verdict = GateEvaluator.evaluate({
      phase: phase(),
      deliverables: [deliverable({ state: "承認済" })],
      criteria: [
        criterion({ satisfied: 1 }),
        criterion({ id: "c2", text: "非機能要件が数値または条件で記述されている", level: "推奨", satisfied: 0 }),
      ],
      approvals: [{ id: "a1", session_id: "s1", phase_id: "phase-1", approver_role: "発注者窓口", approved_on: "2026-09-01" }],
      openCarryoverIssueCount: 0,
      unagreedChangeRequestCount: 0,
    });
    expect(verdict.result).toBe("条件付き通過");
    expect(verdict.unmetRecommended).toContain("非機能要件が数値または条件で記述されている");
  });

  it("全て達成で通過", () => {
    const verdict = GateEvaluator.evaluate({
      phase: phase(),
      deliverables: [deliverable({ state: "承認済" })],
      criteria: [criterion({ satisfied: 1 })],
      approvals: [{ id: "a1", session_id: "s1", phase_id: "phase-1", approver_role: "発注者窓口", approved_on: "2026-09-01" }],
      openCarryoverIssueCount: 0,
      unagreedChangeRequestCount: 0,
    });
    expect(verdict.result).toBe("通過");
  });

  it("R17: P13で持越し課題が残っていれば不通過（criterion.satisfiedの手動上書きは効かない）", () => {
    const verdict = GateEvaluator.evaluate({
      phase: phase({ phase_code: "P13", gate_kind: "検収" }),
      deliverables: [],
      criteria: [
        criterion({ text: "持越し課題がゼロである", auto_attached: 1, satisfied: 1 /* 手動で達成済にしても無視される */ }),
        criterion({ id: "c3", text: "未合意の変更要求がゼロである", auto_attached: 1, satisfied: 1 }),
      ],
      approvals: [{ id: "a1", session_id: "s1", phase_id: "phase-1", approver_role: "発注者決裁者", approved_on: "2026-09-01" }],
      openCarryoverIssueCount: 2,
      unagreedChangeRequestCount: 0,
    });
    expect(verdict.result).toBe("不通過");
    expect(verdict.unmetRequired).toContain("持越し課題がゼロである");
  });

  it("内部レビューゲートはレビュー済で必須成果物条件を満たす", () => {
    const verdict = GateEvaluator.evaluate({
      phase: phase({ gate_kind: "内部レビュー" }),
      deliverables: [deliverable({ state: "レビュー済" })],
      criteria: [],
      approvals: [],
      openCarryoverIssueCount: 0,
      unagreedChangeRequestCount: 0,
    });
    expect(verdict.result).toBe("通過");
  });
});
