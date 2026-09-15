import { describe, expect, it } from "vitest";
import { ChangeRequestService } from "../../src/worker/domain/changeRequestService";

describe("ChangeRequestService", () => {
  it("起票・影響評価中・合意待ちは未合意", () => {
    expect(ChangeRequestService.isUnagreed("起票")).toBe(true);
    expect(ChangeRequestService.isUnagreed("影響評価中")).toBe(true);
    expect(ChangeRequestService.isUnagreed("合意待ち")).toBe(true);
    expect(ChangeRequestService.isUnagreed("反映済")).toBe(false);
    expect(ChangeRequestService.isUnagreed("却下")).toBe(false);
  });

  it("請負区間で金額または納期に影響があれば契約変更覚書が必須", () => {
    expect(ChangeRequestService.requiresAmendment("請負", true, false)).toBe(true);
    expect(ChangeRequestService.requiresAmendment("請負", false, true)).toBe(true);
    expect(ChangeRequestService.requiresAmendment("請負", false, false)).toBe(false);
  });

  it("準委任は覚書を求めない", () => {
    expect(ChangeRequestService.requiresAmendment("準委任", true, true)).toBe(false);
  });
});
