// ハニーポット方式のBot対策（requirements.md 18章）。不可視入力欄の名称はフロントエンドと共有する。
export const HONEYPOT_FIELD_NAME = "contact_channel";

export function isHoneypotTriggered(body: Record<string, unknown>): boolean {
  const value = body[HONEYPOT_FIELD_NAME];
  return typeof value === "string" && value.length > 0;
}
