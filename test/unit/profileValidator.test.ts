import { describe, expect, it } from "vitest";
import { ProfileValidator } from "../../src/worker/domain/profileValidator";

describe("ProfileValidator", () => {
  it("R18: ハイブリッド×保守運用は不成立", () => {
    const result = ProfileValidator.validate({
      contractType: "ハイブリッド",
      workType: "保守運用",
      scale: "中",
      requirementCertainty: "確定",
    });
    expect(result.accepted).toBe(false);
    expect(result.rejection?.ruleCode).toBe("R18");
  });

  it("R11: 請負×未確定は警告付きで受理", () => {
    const result = ProfileValidator.validate({
      contractType: "請負",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "未確定",
    });
    expect(result.accepted).toBe(true);
    expect(result.warnings.map((w) => w.ruleCode)).toContain("R11");
  });

  it("R13: 請負×保守運用は警告付きで受理", () => {
    const result = ProfileValidator.validate({
      contractType: "請負",
      workType: "保守運用",
      scale: "中",
      requirementCertainty: "確定",
    });
    expect(result.accepted).toBe(true);
    expect(result.warnings.map((w) => w.ruleCode)).toContain("R13");
  });

  it("警告のない組み合わせは警告が空", () => {
    const result = ProfileValidator.validate({
      contractType: "準委任",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
    });
    expect(result.accepted).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
