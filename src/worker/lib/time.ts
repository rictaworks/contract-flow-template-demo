const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function nowIso(): string {
  return new Date().toISOString();
}

/** UTC の Date を JST の `YYYY-MM-DD` 表記に変換する（承認日等の表示用）。 */
export function toJstDateString(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, 10);
}
