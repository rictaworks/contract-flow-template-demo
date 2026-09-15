import type { MaintenanceStage } from "../master/enums";

const STAGE_ORDER: MaintenanceStage[] = ["受付", "切り分け", "対応", "報告"];

export const MaintenanceCycleService = {
  /** 周期内の段階遷移（8.5）：受付→切り分け→対応→報告。 */
  nextStage(stage: MaintenanceStage): MaintenanceStage | undefined {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx === -1 || idx === STAGE_ORDER.length - 1) return undefined;
    return STAGE_ORDER[idx + 1];
  },

  /** 周期の完了は、当該周期の月次報告書が承認済であることをもって判定する（8.5）。 */
  isCycleComplete(monthlyReportState: string): boolean {
    return monthlyReportState === "承認済";
  },
};
