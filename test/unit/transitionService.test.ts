import { describe, expect, it } from "vitest";
import { TransitionService } from "../../src/worker/domain/transitionService";
import type { PhaseRow } from "../../src/worker/db/types";

function mkPhase(id: string, seq: number): PhaseRow {
  return {
    id,
    session_id: "s1",
    project_id: "p1",
    seq,
    phase_code: id,
    name: id,
    gate_kind: "内部レビュー",
    contract_segment: null,
    state: "未着手",
  };
}

const phases = [mkPhase("P01", 1), mkPhase("P02", 2), mkPhase("P03", 3), mkPhase("P04", 4)];

describe("TransitionService", () => {
  it("通過・条件付き通過のみ前進できる", () => {
    expect(TransitionService.canAdvance("通過")).toBe(true);
    expect(TransitionService.canAdvance("条件付き通過")).toBe(true);
    expect(TransitionService.canAdvance("不通過")).toBe(false);
  });

  it("次工程はseq+1のみ（飛ばし不可）", () => {
    expect(TransitionService.nextPhase(phases, "P02")?.id).toBe("P03");
    expect(TransitionService.nextPhase(phases, "P04")).toBeUndefined();
  });

  it("差戻し区間は差戻し先から現工程まで（両端含む）", () => {
    const range = TransitionService.rollbackRange(phases, "P04", "P02");
    expect(range.map((p) => p.id)).toEqual(["P02", "P03", "P04"]);
  });

  it("差戻し先が現工程より未来なら空配列", () => {
    expect(TransitionService.rollbackRange(phases, "P02", "P04")).toEqual([]);
  });
});
