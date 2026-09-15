import { describe, expect, it } from "vitest";
import { FlowDeriver } from "../../src/worker/domain/flowDeriver";
import type { ProjectProfile } from "../../src/worker/domain/types";

function codes(flow: ReturnType<typeof FlowDeriver.derive>): string[] {
  return flow.phases.map((p) => p.code);
}

describe("FlowDeriver 決定性", () => {
  it("同一プロファイルから常に同一の工程列・成果物・判断基準・適用規則が生成される", () => {
    const profile: ProjectProfile = { contractType: "請負", workType: "新規開発", scale: "中", requirementCertainty: "確定" };
    const a = FlowDeriver.derive(profile, []);
    const b = FlowDeriver.derive(profile, []);
    expect(JSON.stringify(a.phases)).toBe(JSON.stringify(b.phases));
  });
});

describe("FlowDeriver R01/R02: 請負×新規開発×中×確定", () => {
  const profile: ProjectProfile = { contractType: "請負", workType: "新規開発", scale: "中", requirementCertainty: "確定" };
  const flow = FlowDeriver.derive(profile, []);

  it("P01,P02,P03,P04,P06-P12,P13,P18が順に生成される", () => {
    expect(codes(flow)).toEqual(["P01", "P02", "P03", "P04", "P06", "P07", "P08", "P09", "P10", "P11", "P12", "P13", "P18"]);
  });

  it("P04にR06のcriteriaが付与される", () => {
    const p04 = flow.phases.find((p) => p.code === "P04")!;
    expect(p04.criteria.some((c) => c.text === "検収基準の合意")).toBe(true);
  });

  it("顧客承認・検収の工程にR16の承認記録criteriaが付与される", () => {
    const p02 = flow.phases.find((p) => p.code === "P02")!;
    expect(p02.criteria.some((c) => c.text === "承認記録が存在する")).toBe(true);
    const p13 = flow.phases.find((p) => p.code === "P13")!;
    expect(p13.criteria.some((c) => c.text === "承認記録が存在する")).toBe(true);
  });

  it("P13にR17の持越し課題・変更要求criteriaが付与される", () => {
    const p13 = flow.phases.find((p) => p.code === "P13")!;
    expect(p13.criteria.some((c) => c.text === "持越し課題がゼロである")).toBe(true);
    expect(p13.criteria.some((c) => c.text === "未合意の変更要求がゼロである")).toBe(true);
  });
});

describe("FlowDeriver R03: 改修", () => {
  const profile: ProjectProfile = { contractType: "準委任", workType: "改修", scale: "中", requirementCertainty: "確定" };
  const flow = FlowDeriver.derive(profile, []);

  it("P04の直後にP05が生成される", () => {
    expect(codes(flow)).toEqual(["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12", "P14", "P18"]);
  });

  it("P09/P10に回帰テスト成果物が必須追加される、P12に切戻し手順書が追加される", () => {
    const p09 = flow.phases.find((p) => p.code === "P09")!;
    const p10 = flow.phases.find((p) => p.code === "P10")!;
    const p12 = flow.phases.find((p) => p.code === "P12")!;
    for (const p of [p09, p10]) {
      expect(p.deliverables.find((d) => d.name === "回帰テスト仕様")?.requirement).toBe("必須");
      expect(p.deliverables.find((d) => d.name === "回帰テスト結果")?.requirement).toBe("必須");
    }
    expect(p12.deliverables.find((d) => d.name === "切戻し手順書")?.requirement).toBe("必須");
  });
});

describe("FlowDeriver R04: 保守運用", () => {
  const profile: ProjectProfile = { contractType: "準委任", workType: "保守運用", scale: "中", requirementCertainty: "確定" };
  const flow = FlowDeriver.derive(profile, []);

  it("設計・実装・テスト工程を生成せず、P04は保守要件定義に置換、P15を生成する", () => {
    expect(codes(flow)).toEqual(["P01", "P02", "P03", "P04", "P15", "P14", "P18"]);
    const p04 = flow.phases.find((p) => p.code === "P04")!;
    expect(p04.name).toBe("保守要件定義");
    expect(p04.deliverables.map((d) => d.name).sort()).toEqual(["エスカレーション手順", "SLA定義書", "対応範囲定義"].sort());
  });
});

describe("FlowDeriver R05: 調査", () => {
  const profile: ProjectProfile = { contractType: "準委任", workType: "調査", scale: "中", requirementCertainty: "確定" };
  const flow = FlowDeriver.derive(profile, []);

  it("P04は調査計画に置換され、P16・P17が生成される", () => {
    expect(codes(flow)).toEqual(["P01", "P02", "P03", "P04", "P16", "P17", "P14", "P18"]);
    const p04 = flow.phases.find((p) => p.code === "P04")!;
    expect(p04.name).toBe("調査計画");
  });

  it("R14: 請負×調査でP04の検収基準criteriaが付与される", () => {
    const profileUkeoi: ProjectProfile = { contractType: "請負", workType: "調査", scale: "中", requirementCertainty: "確定" };
    const f = FlowDeriver.derive(profileUkeoi, []);
    const p04 = f.phases.find((p) => p.code === "P04")!;
    expect(p04.criteria.some((c) => c.text === "報告書目次案の合意")).toBe(true);
    expect(p04.criteria.some((c) => c.text === "評価観点一覧の合意")).toBe(true);
  });
});

describe("FlowDeriver R08: ハイブリッド", () => {
  const profile: ProjectProfile = { contractType: "ハイブリッド", workType: "新規開発", scale: "中", requirementCertainty: "確定" };
  const flow = FlowDeriver.derive(profile, []);

  it("P03が2回生成され、P04の前後に配置される。終端前はP13になる", () => {
    expect(codes(flow)).toEqual(["P01", "P02", "P03", "P04", "P03", "P06", "P07", "P08", "P09", "P10", "P11", "P12", "P13", "P18"]);
    const contractPhases = flow.phases.filter((p) => p.code === "P03");
    expect(contractPhases).toHaveLength(2);
    expect(contractPhases[0]?.name).toBe("契約締結（準委任）");
    expect(contractPhases[0]?.contractSegment).toBe("準委任");
    expect(contractPhases[1]?.name).toBe("契約締結（請負）");
    expect(contractPhases[1]?.contractSegment).toBe("請負");
  });

  it("P01,P02,P04以前は準委任区間", () => {
    for (const code of ["P01", "P02", "P04"]) {
      const p = flow.phases.find((ph) => ph.code === code)!;
      expect(p.contractSegment).toBe("準委任");
    }
  });
});

describe("FlowDeriver R09/R15: 規模小", () => {
  it("R09: 規模小でP06/P07とP09/P10が統合される", () => {
    const profile: ProjectProfile = { contractType: "請負", workType: "新規開発", scale: "小", requirementCertainty: "確定" };
    const flow = FlowDeriver.derive(profile, []);
    expect(codes(flow)).toEqual(["P01", "P02", "P03", "P04", "P06", "P08", "P09", "P11", "P12", "P13", "P18"]);
    const design = flow.phases.find((p) => p.name === "設計")!;
    expect(design.gateKind).toBe("顧客承認");
    const test = flow.phases.find((p) => p.name === "テスト")!;
    expect(test.gateKind).toBe("内部レビュー");
  });

  it("R15: 改修×小でP05がP04に統合される", () => {
    const profile: ProjectProfile = { contractType: "請負", workType: "改修", scale: "小", requirementCertainty: "確定" };
    const flow = FlowDeriver.derive(profile, []);
    expect(flow.phases.some((p) => p.code === "P05")).toBe(false);
    const p04 = flow.phases.find((p) => p.code === "P04")!;
    expect(p04.deliverables.find((d) => d.name === "影響範囲一覧")?.requirement).toBe("必須");
  });
});

describe("FlowDeriver R10: 規模大", () => {
  const profile: ProjectProfile = { contractType: "請負", workType: "新規開発", scale: "大", requirementCertainty: "確定" };
  const flow = FlowDeriver.derive(profile, []);

  it("P04以降の全工程に課題管理表が必須追加され、P12に移行計画書等が追加される", () => {
    for (const p of flow.phases) {
      if (p.code === "P01" || p.code === "P02" || p.code === "P03") continue;
      expect(p.deliverables.find((d) => d.name === "課題管理表")?.requirement).toBe("必須");
    }
    const p12 = flow.phases.find((p) => p.code === "P12")!;
    expect(p12.deliverables.find((d) => d.name === "移行計画書")?.requirement).toBe("必須");
    expect(p12.deliverables.find((d) => d.name === "移行リハーサル結果")?.requirement).toBe("必須");
  });
});

describe("FlowDeriver R11/R12/R13: 警告を伴う組み合わせの追加効果", () => {
  it("R11: 請負×未確定でP03に要件凍結合意書、P04の変更管理手順が必須化", () => {
    const profile: ProjectProfile = { contractType: "請負", workType: "新規開発", scale: "中", requirementCertainty: "未確定" };
    const flow = FlowDeriver.derive(profile, []);
    const p03 = flow.phases.find((p) => p.code === "P03")!;
    expect(p03.deliverables.find((d) => d.name === "要件凍結合意書")?.requirement).toBe("必須");
    const p04 = flow.phases.find((p) => p.code === "P04")!;
    expect(p04.deliverables.find((d) => d.name === "変更管理手順")?.requirement).toBe("必須");
  });

  it("R12: 準委任×未確定でP04に推奨criteriaが追加される", () => {
    const profile: ProjectProfile = { contractType: "準委任", workType: "新規開発", scale: "中", requirementCertainty: "未確定" };
    const flow = FlowDeriver.derive(profile, []);
    const p04 = flow.phases.find((p) => p.code === "P04")!;
    expect(p04.criteria.some((c) => c.text === "要件一覧の優先度付け" && c.level === "推奨")).toBe(true);
  });

  it("R13: 請負×保守運用でP03にSLA定義書、P13に月次報告書等が追加される", () => {
    const profile: ProjectProfile = { contractType: "請負", workType: "保守運用", scale: "中", requirementCertainty: "確定" };
    const flow = FlowDeriver.derive(profile, []);
    const p03 = flow.phases.find((p) => p.code === "P03")!;
    expect(p03.deliverables.find((d) => d.name === "SLA定義書")?.requirement).toBe("必須");
    const p13 = flow.phases.find((p) => p.code === "P13")!;
    expect(p13.deliverables.find((d) => d.name === "月次報告書")?.requirement).toBe("必須");
    expect(p13.deliverables.find((d) => d.name === "SLA達成報告")?.requirement).toBe("必須");
  });
});

describe("FlowDeriver R07: 準委任は検収ゲートを生成しない", () => {
  it("P13が生成されずP14が生成される", () => {
    const profile: ProjectProfile = { contractType: "準委任", workType: "新規開発", scale: "中", requirementCertainty: "確定" };
    const flow = FlowDeriver.derive(profile, []);
    expect(flow.phases.some((p) => p.code === "P13")).toBe(false);
    expect(flow.phases.some((p) => p.code === "P14")).toBe(true);
  });
});
