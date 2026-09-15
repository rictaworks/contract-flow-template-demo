import type { GateKind, Role } from "./enums";

// 工程マスタ（requirements.md 6.3）。orderKey は工程の既定の並び順（コード末尾の数値）。
export interface PhaseMasterEntry {
  code: string;
  name: string;
  defaultGateKind: GateKind;
  mainRoles: Role[];
  orderKey: number;
}

export const PHASE_MASTER: Record<string, PhaseMasterEntry> = {
  P01: { code: "P01", name: "引合・与件整理", defaultGateKind: "内部レビュー", mainRoles: ["受注PM"], orderKey: 1 },
  P02: { code: "P02", name: "提案・見積", defaultGateKind: "顧客承認", mainRoles: ["受注PM"], orderKey: 2 },
  P03: { code: "P03", name: "契約締結", defaultGateKind: "顧客承認", mainRoles: ["受注PM", "発注者決裁者"], orderKey: 3 },
  P04: { code: "P04", name: "要件定義", defaultGateKind: "顧客承認", mainRoles: ["受注PM", "発注者窓口"], orderKey: 4 },
  P05: { code: "P05", name: "影響調査", defaultGateKind: "顧客承認", mainRoles: ["受注担当"], orderKey: 5 },
  P06: { code: "P06", name: "基本設計", defaultGateKind: "顧客承認", mainRoles: ["受注担当"], orderKey: 6 },
  P07: { code: "P07", name: "詳細設計", defaultGateKind: "内部レビュー", mainRoles: ["受注担当"], orderKey: 7 },
  P08: { code: "P08", name: "実装", defaultGateKind: "内部レビュー", mainRoles: ["受注担当"], orderKey: 8 },
  P09: { code: "P09", name: "結合テスト", defaultGateKind: "内部レビュー", mainRoles: ["受注担当"], orderKey: 9 },
  P10: { code: "P10", name: "総合テスト", defaultGateKind: "内部レビュー", mainRoles: ["受注担当"], orderKey: 10 },
  P11: { code: "P11", name: "受入テスト支援", defaultGateKind: "顧客承認", mainRoles: ["発注者窓口"], orderKey: 11 },
  P12: { code: "P12", name: "リリース・移行", defaultGateKind: "顧客承認", mainRoles: ["受注担当", "発注者窓口"], orderKey: 12 },
  P13: { code: "P13", name: "納品・検収", defaultGateKind: "検収", mainRoles: ["受注PM", "発注者決裁者"], orderKey: 13 },
  P14: { code: "P14", name: "業務完了報告", defaultGateKind: "顧客承認", mainRoles: ["受注PM", "発注者窓口"], orderKey: 14 },
  P15: { code: "P15", name: "保守運用サイクル", defaultGateKind: "顧客承認", mainRoles: ["受注担当", "発注者窓口"], orderKey: 15 },
  P16: { code: "P16", name: "調査実施", defaultGateKind: "内部レビュー", mainRoles: ["受注担当"], orderKey: 16 },
  P17: { code: "P17", name: "報告書作成", defaultGateKind: "顧客承認", mainRoles: ["受注PM"], orderKey: 17 },
  P18: { code: "P18", name: "クローズ", defaultGateKind: "内部レビュー", mainRoles: ["受注PM"], orderKey: 18 },
};
