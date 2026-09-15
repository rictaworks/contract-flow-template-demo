import type { ContractSegment } from "../master/enums";

export const ChangeRequestService = {
  /** 未合意（起票・影響評価中・合意待ち）かどうか（8.4・R17）。 */
  isUnagreed(state: string): boolean {
    return state === "起票" || state === "影響評価中" || state === "合意待ち";
  },

  /**
   * 請負区間（ハイブリッドの請負区間を含む）で、金額または納期に影響がある変更要求を反映する場合、
   * 契約変更覚書を必須とする（8.4）。準委任は覚書を求めない。
   */
  requiresAmendment(contractSegment: ContractSegment | null, affectsSchedule: boolean, affectsCost: boolean): boolean {
    if (contractSegment !== "請負") return false;
    return affectsSchedule || affectsCost;
  },
};
