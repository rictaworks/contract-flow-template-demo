import { describe, expect, it } from "vitest";
import { MaintenanceCycleService } from "../../src/worker/domain/maintenanceCycleService";

describe("MaintenanceCycleService", () => {
  it("段階は受付→切り分け→対応→報告の順に進む", () => {
    expect(MaintenanceCycleService.nextStage("受付")).toBe("切り分け");
    expect(MaintenanceCycleService.nextStage("切り分け")).toBe("対応");
    expect(MaintenanceCycleService.nextStage("対応")).toBe("報告");
    expect(MaintenanceCycleService.nextStage("報告")).toBeUndefined();
  });

  it("月次報告書が承認済で周期完了", () => {
    expect(MaintenanceCycleService.isCycleComplete("承認済")).toBe(true);
    expect(MaintenanceCycleService.isCycleComplete("レビュー済")).toBe(false);
  });
});
