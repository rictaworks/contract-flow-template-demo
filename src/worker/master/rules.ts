import { DELIVERABLE_MASTER } from "./deliverables";
import { AUTO_COMPUTED_CRITERIA_TEXTS, CRITERIA_MASTER } from "./criteria";
import { PHASE_MASTER } from "./phases";
import type { GateKind, Role } from "./enums";
import type { CriterionDraft, DeliverableDraft, PhaseDraft, ProjectProfile } from "../domain/types";

/** フロー構築用の作業バッファ。派生規則はこのビルダーを介して工程列を組み立てる。 */
export class FlowDraftBuilder {
  phases: PhaseDraft[] = [];
  private keySeq = 0;

  private nextKey(code: string): string {
    this.keySeq += 1;
    // '#'はURLのフラグメント区切りと衝突するため使わない（工程IDに使われるため要注意）。
    return `${code}-${this.keySeq}`;
  }

  addPhase(
    code: string,
    ruleCode: string,
    opts: { name?: string; gateKind?: GateKind; orderKey?: number; deliverables?: DeliverableDraft[]; criteria?: CriterionDraft[] } = {},
  ): PhaseDraft {
    const master = PHASE_MASTER[code];
    if (!master) throw new Error(`unknown phase code: ${code}`);
    const deliverables =
      opts.deliverables ??
      (DELIVERABLE_MASTER[code] ?? []).map((d) => ({ ...d, originRuleCode: ruleCode }));
    const criteria =
      opts.criteria ??
      (CRITERIA_MASTER[code] ?? []).map((c) => ({ ...c, autoAttached: false, originRuleCode: ruleCode }));
    const draft: PhaseDraft = {
      key: this.nextKey(code),
      code,
      name: opts.name ?? master.name,
      gateKind: opts.gateKind ?? master.defaultGateKind,
      orderKey: opts.orderKey ?? master.orderKey,
      appliedRules: [ruleCode],
      deliverables,
      criteria,
    };
    this.phases.push(draft);
    return draft;
  }

  findByCode(code: string): PhaseDraft | undefined {
    return this.phases.find((p) => p.code === code);
  }

  allByCode(code: string): PhaseDraft[] {
    return this.phases.filter((p) => p.code === code);
  }

  markRule(phase: PhaseDraft, ruleCode: string): void {
    if (!phase.appliedRules.includes(ruleCode)) phase.appliedRules.push(ruleCode);
  }

  addDeliverable(
    phase: PhaseDraft,
    name: string,
    requirement: "必須" | "任意",
    ownerRole: Role,
    ruleCode: string,
    recurring = false,
  ): void {
    const existing = phase.deliverables.find((d) => d.name === name);
    if (existing) {
      if (requirement === "必須") existing.requirement = "必須";
      return;
    }
    phase.deliverables.push({ name, requirement, ownerRole, recurring, originRuleCode: ruleCode });
    this.markRule(phase, ruleCode);
  }

  promoteDeliverable(phase: PhaseDraft, name: string, ruleCode: string): void {
    const existing = phase.deliverables.find((d) => d.name === name);
    if (existing) {
      existing.requirement = "必須";
      this.markRule(phase, ruleCode);
    }
  }

  addCriterion(
    phase: PhaseDraft,
    text: string,
    level: "必須" | "推奨",
    ruleCode: string,
    autoAttached = true,
  ): void {
    if (phase.criteria.some((c) => c.text === text)) return;
    phase.criteria.push({ text, level, autoAttached, originRuleCode: ruleCode });
    this.markRule(phase, ruleCode);
  }

  removePhase(phase: PhaseDraft): void {
    this.phases = this.phases.filter((p) => p.key !== phase.key);
  }

  /** source を target に統合し、source を除去する。成果物・判断基準は名称/文言で和集合を取る。 */
  mergePhases(target: PhaseDraft, source: PhaseDraft, mergedName: string, ruleCode: string): void {
    for (const d of source.deliverables) {
      this.addDeliverable(target, d.name, d.requirement, d.ownerRole, d.originRuleCode, d.recurring);
    }
    for (const c of source.criteria) {
      this.addCriterion(target, c.text, c.level, c.originRuleCode, c.autoAttached);
    }
    target.name = mergedName;
    target.gateKind = stricterGate(target.gateKind, source.gateKind);
    this.markRule(target, ruleCode);
    this.removePhase(source);
  }
}

function stricterGate(a: GateKind, b: GateKind): GateKind {
  const rank: Record<GateKind, number> = { 内部レビュー: 0, 顧客承認: 1, 検収: 2 };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * 終端前工程（P13/P14）を挿入すべき位置。P18を除く現時点の最大orderKeyの直後とする。
 * 保守運用(P15)・調査(P16,P17)はカタログ番号がP13/P14より大きいため、静的な番号順に頼れない。
 */
function nextTerminalOrderKey(b: FlowDraftBuilder): number {
  const nonTerminal = b.phases.filter((p) => p.code !== "P18");
  const max = nonTerminal.length > 0 ? Math.max(...nonTerminal.map((p) => p.orderKey)) : 0;
  return max + 1;
}

export interface DerivationRule {
  code: string;
  matches(profile: ProjectProfile): boolean;
  apply(builder: FlowDraftBuilder, profile: ProjectProfile): void;
}

export const DERIVATION_RULES: DerivationRule[] = [
  {
    code: "R01",
    matches: () => true,
    apply: (b, _p) => {
      b.addPhase("P01", "R01");
      b.addPhase("P02", "R01");
      b.addPhase("P03", "R01");
      // P18は常に最終工程。カタログ番号(18)は保守運用/調査の主work工程(P15〜P17)より
      // 小さいため実際の並び順には使えず、十分大きい番兵値を用いる（reseqで最終的に連番化される）。
      b.addPhase("P18", "R01", { orderKey: 100000 });
    },
  },
  {
    code: "R02",
    matches: (p) => p.workType === "新規開発",
    apply: (b, _p) => {
      for (const code of ["P04", "P06", "P07", "P08", "P09", "P10", "P11", "P12"]) {
        b.addPhase(code, "R02");
      }
    },
  },
  {
    code: "R03",
    matches: (p) => p.workType === "改修",
    apply: (b, _p) => {
      for (const code of ["P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12"]) {
        b.addPhase(code, "R03");
      }
      const p09 = b.findByCode("P09");
      const p10 = b.findByCode("P10");
      if (p09) {
        b.addDeliverable(p09, "回帰テスト仕様", "必須", "受注担当", "R03");
        b.addDeliverable(p09, "回帰テスト結果", "必須", "受注担当", "R03");
      }
      if (p10) {
        b.addDeliverable(p10, "回帰テスト仕様", "必須", "受注担当", "R03");
        b.addDeliverable(p10, "回帰テスト結果", "必須", "受注担当", "R03");
      }
      const p12 = b.findByCode("P12");
      if (p12) b.addDeliverable(p12, "切戻し手順書", "必須", "受注担当", "R03");
    },
  },
  {
    code: "R04",
    matches: (p) => p.workType === "保守運用",
    apply: (b, _p) => {
      const p04 = b.addPhase("P04", "R04", {
        name: "保守要件定義",
        deliverables: [
          { name: "対応範囲定義", requirement: "必須", recurring: false, ownerRole: "受注PM", originRuleCode: "R04" },
          { name: "SLA定義書", requirement: "必須", recurring: false, ownerRole: "受注PM", originRuleCode: "R04" },
          { name: "エスカレーション手順", requirement: "必須", recurring: false, ownerRole: "受注PM", originRuleCode: "R04" },
        ],
      });
      void p04;
      b.addPhase("P15", "R04");
    },
  },
  {
    code: "R05",
    matches: (p) => p.workType === "調査",
    apply: (b, _p) => {
      b.addPhase("P04", "R05", {
        name: "調査計画",
        deliverables: [
          { name: "調査計画書", requirement: "必須", recurring: false, ownerRole: "受注PM", originRuleCode: "R05" },
          { name: "評価観点一覧", requirement: "必須", recurring: false, ownerRole: "受注PM", originRuleCode: "R05" },
          { name: "報告書目次案", requirement: "必須", recurring: false, ownerRole: "受注PM", originRuleCode: "R05" },
        ],
      });
      b.addPhase("P16", "R05");
      b.addPhase("P17", "R05");
    },
  },
  {
    code: "R06",
    matches: (p) => p.contractType === "請負",
    apply: (b, _p) => {
      b.addPhase("P13", "R06", { orderKey: nextTerminalOrderKey(b) });
      const p04 = b.findByCode("P04");
      if (p04) b.addCriterion(p04, "検収基準の合意", "必須", "R06");
    },
  },
  {
    code: "R07",
    matches: (p) => p.contractType === "準委任",
    apply: (b, _p) => {
      b.addPhase("P14", "R07", { orderKey: nextTerminalOrderKey(b) });
    },
  },
  {
    code: "R08",
    matches: (p) => p.contractType === "ハイブリッド",
    apply: (b, _p) => {
      const first = b.findByCode("P03");
      if (first) {
        first.name = "契約締結（準委任）";
        first.contractSegment = "準委任";
        b.markRule(first, "R08");
      }
      const second = b.addPhase("P03", "R08", { name: "契約締結（請負）", orderKey: 4.5 });
      second.contractSegment = "請負";
      for (const phase of b.phases) {
        if (phase.key === second.key) continue;
        if (phase.orderKey <= 4) phase.contractSegment = "準委任";
      }
      const p04 = b.findByCode("P04");
      if (p04) b.addCriterion(p04, "請負範囲・再見積の提示", "必須", "R08");
      b.addPhase("P13", "R08", { orderKey: nextTerminalOrderKey(b) });
    },
  },
  {
    code: "R09",
    matches: (p) => p.scale === "小",
    apply: (b, _p) => {
      const p06 = b.findByCode("P06");
      const p07 = b.findByCode("P07");
      if (p06 && p07) b.mergePhases(p06, p07, "設計", "R09");
      const p09 = b.findByCode("P09");
      const p10 = b.findByCode("P10");
      if (p09 && p10) b.mergePhases(p09, p10, "テスト", "R09");
    },
  },
  {
    code: "R10",
    matches: (p) => p.scale === "大",
    apply: (b, _p) => {
      for (const phase of b.phases) {
        if (phase.orderKey < 4) continue;
        b.addDeliverable(phase, "週次進捗報告", "任意", "受注PM", "R10", true);
        b.addDeliverable(phase, "課題管理表", "必須", "受注PM", "R10");
      }
      const p12 = b.findByCode("P12");
      if (p12) {
        b.addDeliverable(p12, "移行計画書", "必須", "受注担当", "R10");
        b.addDeliverable(p12, "移行リハーサル結果", "必須", "受注担当", "R10");
      }
    },
  },
  {
    code: "R11",
    matches: (p) => p.contractType === "請負" && p.requirementCertainty === "未確定",
    apply: (b, _p) => {
      const contractPhases = b.allByCode("P03");
      const target = contractPhases.find((ph) => ph.contractSegment !== "準委任") ?? contractPhases[0];
      if (target) b.addDeliverable(target, "要件凍結合意書", "必須", "受注PM", "R11");
      const p04 = b.findByCode("P04");
      if (p04) b.promoteDeliverable(p04, "変更管理手順", "R11");
    },
  },
  {
    code: "R12",
    matches: (p) => (p.contractType === "準委任" || p.contractType === "ハイブリッド") && p.requirementCertainty === "未確定",
    apply: (b, _p) => {
      const p04 = b.findByCode("P04");
      if (p04) b.addCriterion(p04, "要件一覧の優先度付け", "推奨", "R12");
    },
  },
  {
    code: "R13",
    matches: (p) => p.contractType === "請負" && p.workType === "保守運用",
    apply: (b, _p) => {
      const contractPhases = b.allByCode("P03");
      const target = contractPhases.find((ph) => ph.contractSegment !== "準委任") ?? contractPhases[0];
      if (target) b.addDeliverable(target, "SLA定義書", "必須", "受注PM", "R13");
      const p13 = b.findByCode("P13");
      if (p13) {
        b.addDeliverable(p13, "月次報告書", "必須", "受注PM", "R13", true);
        b.addDeliverable(p13, "SLA達成報告", "必須", "受注担当", "R13", true);
      }
    },
  },
  {
    code: "R14",
    matches: (p) => p.contractType === "請負" && p.workType === "調査",
    apply: (b, _p) => {
      const p04 = b.findByCode("P04");
      if (p04) {
        b.addCriterion(p04, "報告書目次案の合意", "必須", "R14");
        b.addCriterion(p04, "評価観点一覧の合意", "必須", "R14");
      }
    },
  },
  {
    code: "R15",
    matches: (p) => p.workType === "改修" && p.scale === "小",
    apply: (b, _p) => {
      const p04 = b.findByCode("P04");
      const p05 = b.findByCode("P05");
      if (p04 && p05) {
        b.mergePhases(p04, p05, p04.name, "R15");
        b.addDeliverable(p04, "影響範囲一覧", "必須", "受注担当", "R15");
      }
    },
  },
  {
    code: "R16",
    matches: () => true,
    apply: (b, _p) => {
      for (const phase of b.phases) {
        if (phase.gateKind === "顧客承認" || phase.gateKind === "検収") {
          b.addCriterion(phase, AUTO_COMPUTED_CRITERIA_TEXTS.approvalExists, "必須", "R16");
        }
      }
    },
  },
  {
    code: "R17",
    matches: () => true,
    apply: (b, _p) => {
      for (const phase of b.phases) {
        if (phase.code === "P13" || phase.code === "P14") {
          b.addCriterion(phase, AUTO_COMPUTED_CRITERIA_TEXTS.noOpenCarryover, "必須", "R17");
          b.addCriterion(phase, AUTO_COMPUTED_CRITERIA_TEXTS.noUnagreedChangeRequest, "必須", "R17");
        }
      }
    },
  },
];
