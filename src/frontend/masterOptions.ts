// バックエンド src/worker/master/enums.ts のホワイトリストと必ず一致させる区分値。
import { STRINGS } from "./strings/ja";

export const CONTRACT_TYPE_OPTIONS = [
  { value: "請負", label: STRINGS.contractTypeOptions.請負 },
  { value: "準委任", label: STRINGS.contractTypeOptions.準委任 },
  { value: "ハイブリッド", label: STRINGS.contractTypeOptions.ハイブリッド },
];

export const WORK_TYPE_OPTIONS = [
  { value: "新規開発", label: STRINGS.workTypeOptions.新規開発 },
  { value: "改修", label: STRINGS.workTypeOptions.改修 },
  { value: "保守運用", label: STRINGS.workTypeOptions.保守運用 },
  { value: "調査", label: STRINGS.workTypeOptions.調査 },
];

export const SCALE_OPTIONS = [
  { value: "小", label: STRINGS.scaleOptions.小 },
  { value: "中", label: STRINGS.scaleOptions.中 },
  { value: "大", label: STRINGS.scaleOptions.大 },
];

export const CERTAINTY_OPTIONS = [
  { value: "確定", label: STRINGS.certaintyOptions.確定 },
  { value: "未確定", label: STRINGS.certaintyOptions.未確定 },
];

export const ROLE_OPTIONS = [
  { value: "受注PM", label: "受注PM" },
  { value: "受注担当", label: "受注担当" },
  { value: "発注者窓口", label: "発注者窓口" },
  { value: "発注者決裁者", label: "発注者決裁者" },
];

export const DELIVERABLE_STATE_OPTIONS = [
  { value: "未作成", label: "未作成" },
  { value: "作成中", label: "作成中" },
  { value: "レビュー済", label: "レビュー済" },
  { value: "承認済", label: "承認済" },
  { value: "要更新", label: "要更新" },
];

export const MAINTENANCE_STAGE_OPTIONS = [
  { value: "受付", label: "受付" },
  { value: "切り分け", label: "切り分け" },
  { value: "対応", label: "対応" },
  { value: "報告", label: "報告" },
];

export const MAINTENANCE_STAGE_ORDER = MAINTENANCE_STAGE_OPTIONS.map((opt) => opt.value);
