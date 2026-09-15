// ユーザー向け文言はすべてここに集約する（CLAUDE.md「文字列リテラルは設定ファイルに分離する」）。
// ハードコード検出テスト（test/unit/noHardcodedStrings.test.ts）はこのファイル以外の日本語リテラルを検出する。

export const STRINGS = {
  validation: {
    hybridMaintenanceRejected:
      "ハイブリッド×保守運用の組み合わせは受理できません。保守運用は要件定義を境とする契約の切替えを持たないため、契約形態を準委任または請負に変更してください。",
    ukeoiUncertainWarning: "要件が未確定のまま請負契約を結ぶと、範囲と金額の前提が崩れやすくなります。",
    ukeoiUncertainRecommendation: "ハイブリッド契約への変更を推奨します。",
    ukeoiMaintenanceWarning: "保守運用は業務の遂行が対価の対象であり、完成物の検収に馴染みません。",
    ukeoiMaintenanceRecommendation: "準委任契約への変更を推奨します。",
  },
  errors: {
    badRequest: "入力内容を確認してください。",
    invalidProfileField: "選択肢の値が不正です。",
    honeypotTriggered: "送信内容を確認できませんでした。",
    notFound: "対象のデータが見つかりません。",
    sessionMismatch: "この案件を操作する権限がありません。",
    profileRejected: "このプロファイルの組み合わせは登録できません。",
    gateNotEvaluable: "この工程は現在ゲート評価を実行できる状態ではありません。",
    advanceNotAllowed: "現在のゲート判定では前進できません。通過または条件付き通過が必要です。",
    rollbackReasonRequired: "差戻しには理由の入力が必須です。",
    abortReasonRequired: "中止には理由の入力が必須です。",
    projectAborted: "この案件は中止されています。クローズ工程のみ操作できます。",
    changeRequestPhaseTooEarly: "契約締結（P03）の通過後にのみ変更要求を起票できます。",
    changeRequestInvalidTransition: "この変更要求は現在その操作を行える状態ではありません。",
  },
} as const;
