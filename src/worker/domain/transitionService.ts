import type { PhaseRow } from "../db/types";
import type { VerdictKind } from "../master/enums";

export const TransitionService = {
  /** 前進は通過または条件付き通過でのみ可能（8.1）。 */
  canAdvance(verdict: VerdictKind): boolean {
    return verdict === "通過" || verdict === "条件付き通過";
  },

  /** 次工程を返す（工程の飛ばしは行えない＝seq+1のみ）。 */
  nextPhase(orderedPhases: PhaseRow[], currentPhaseId: string): PhaseRow | undefined {
    const idx = orderedPhases.findIndex((p) => p.id === currentPhaseId);
    if (idx === -1) return undefined;
    return orderedPhases[idx + 1];
  },

  /** 差戻し区間（差戻し先から現工程まで、両端含む）の工程を返す（8.2）。 */
  rollbackRange(orderedPhases: PhaseRow[], currentPhaseId: string, targetPhaseId: string): PhaseRow[] {
    const targetIdx = orderedPhases.findIndex((p) => p.id === targetPhaseId);
    const currentIdx = orderedPhases.findIndex((p) => p.id === currentPhaseId);
    if (targetIdx === -1 || currentIdx === -1 || targetIdx > currentIdx) return [];
    return orderedPhases.slice(targetIdx, currentIdx + 1);
  },
};
