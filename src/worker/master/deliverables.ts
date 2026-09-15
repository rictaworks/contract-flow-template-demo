import type { DeliverableRequirement, Role } from "./enums";

export interface DeliverableTemplate {
  name: string;
  requirement: DeliverableRequirement;
  recurring: boolean;
  ownerRole: Role;
}

// 成果物マスタ（requirements.md 6.4）。工程コード（置換前の基準コード）をキーとする。
export const DELIVERABLE_MASTER: Record<string, DeliverableTemplate[]> = {
  P01: [
    { name: "与件整理メモ", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "課題・制約一覧", requirement: "任意", recurring: false, ownerRole: "受注PM" },
  ],
  P02: [
    { name: "提案書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "見積書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "前提条件・除外事項一覧", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "体制図", requirement: "任意", recurring: false, ownerRole: "受注PM" },
  ],
  P03: [
    { name: "契約書または注文書・注文請書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "秘密保持契約", requirement: "任意", recurring: false, ownerRole: "受注PM" },
  ],
  P04: [
    { name: "要件定義書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "要件一覧", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "非機能要件一覧", requirement: "任意", recurring: false, ownerRole: "受注担当" },
    { name: "変更管理手順", requirement: "任意", recurring: false, ownerRole: "受注PM" },
  ],
  P05: [
    { name: "影響範囲一覧", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "現行仕様の確認記録", requirement: "任意", recurring: false, ownerRole: "受注担当" },
  ],
  P06: [
    { name: "基本設計書", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "画面・帳票一覧", requirement: "任意", recurring: false, ownerRole: "受注担当" },
    { name: "外部インターフェース定義", requirement: "任意", recurring: false, ownerRole: "受注担当" },
  ],
  P07: [
    { name: "詳細設計書", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "テスト計画書", requirement: "必須", recurring: false, ownerRole: "受注担当" },
  ],
  P08: [
    { name: "ソースコード", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "単体テスト結果", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "コードレビュー記録", requirement: "任意", recurring: false, ownerRole: "受注担当" },
  ],
  P09: [
    { name: "結合テスト仕様書", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "結合テスト結果", requirement: "必須", recurring: false, ownerRole: "受注担当" },
  ],
  P10: [
    { name: "総合テスト仕様書", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "総合テスト結果", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "不具合一覧", requirement: "必須", recurring: false, ownerRole: "受注担当" },
  ],
  P11: [
    { name: "受入テスト支援記録", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "受入テスト結果（発注者作成）", requirement: "必須", recurring: false, ownerRole: "発注者窓口" },
  ],
  P12: [
    { name: "リリース手順書", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "運用手引き", requirement: "任意", recurring: false, ownerRole: "受注担当" },
  ],
  P13: [
    { name: "納品物一覧", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "検収依頼書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "検収書（発注者作成）", requirement: "必須", recurring: false, ownerRole: "発注者決裁者" },
    { name: "契約不適合対応期間の定義", requirement: "必須", recurring: false, ownerRole: "受注PM" },
  ],
  P14: [
    { name: "業務報告書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "工数実績", requirement: "必須", recurring: false, ownerRole: "受注PM" },
  ],
  P15: [
    { name: "保守対応記録", requirement: "必須", recurring: true, ownerRole: "受注担当" },
    { name: "月次報告書", requirement: "必須", recurring: true, ownerRole: "受注PM" },
  ],
  P16: [
    { name: "調査記録", requirement: "必須", recurring: false, ownerRole: "受注担当" },
    { name: "検証環境の構成記録", requirement: "任意", recurring: false, ownerRole: "受注担当" },
  ],
  P17: [
    { name: "調査報告書", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "推奨事項・次段階の提案", requirement: "任意", recurring: false, ownerRole: "受注PM" },
  ],
  P18: [
    { name: "振り返り記録", requirement: "必須", recurring: false, ownerRole: "受注PM" },
    { name: "精算記録", requirement: "任意", recurring: false, ownerRole: "受注PM" },
  ],
};
