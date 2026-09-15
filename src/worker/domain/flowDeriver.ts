import { DERIVATION_RULES, FlowDraftBuilder } from "../master/rules";
import type { FlowInstance, PhaseDraft, ProfileWarning, ProjectProfile } from "./types";

export const FlowDeriver = {
  /**
   * 派生規則 R01〜R17 を順に適用し、決定的にフローを展開する。
   * profile は事前に ProfileValidator.validate() で受理済みであること（呼び出し側の責務）。
   */
  derive(profile: ProjectProfile, warnings: ProfileWarning[]): FlowInstance {
    const builder = new FlowDraftBuilder();
    for (const rule of DERIVATION_RULES) {
      if (rule.matches(profile)) rule.apply(builder, profile);
    }
    const phases = [...builder.phases].sort((a, b) => a.orderKey - b.orderKey);
    return { profile, warnings, phases: reseq(phases) };
  },
};

function reseq(phases: PhaseDraft[]): PhaseDraft[] {
  return phases.map((p, i) => ({ ...p, orderKey: i + 1 }));
}
