import type { ProfileValidationResult, ProfileWarning, ProjectProfile } from "./types";
import { STRINGS } from "../strings/ja";

export const ProfileValidator = {
  /** R18: ハイブリッド×保守運用は不成立。R11・R13: 警告を伴うが受理可能。 */
  validate(profile: ProjectProfile): ProfileValidationResult {
    if (profile.contractType === "ハイブリッド" && profile.workType === "保守運用") {
      return {
        accepted: false,
        rejection: { ruleCode: "R18", reason: STRINGS.validation.hybridMaintenanceRejected },
        warnings: [],
      };
    }
    return { accepted: true, warnings: this.warnings(profile) };
  },

  warnings(profile: ProjectProfile): ProfileWarning[] {
    const warnings: ProfileWarning[] = [];
    if (profile.contractType === "請負" && profile.requirementCertainty === "未確定") {
      warnings.push({
        ruleCode: "R11",
        message: STRINGS.validation.ukeoiUncertainWarning,
        recommendation: STRINGS.validation.ukeoiUncertainRecommendation,
      });
    }
    if (profile.contractType === "請負" && profile.workType === "保守運用") {
      warnings.push({
        ruleCode: "R13",
        message: STRINGS.validation.ukeoiMaintenanceWarning,
        recommendation: STRINGS.validation.ukeoiMaintenanceRecommendation,
      });
    }
    return warnings;
  },
};
