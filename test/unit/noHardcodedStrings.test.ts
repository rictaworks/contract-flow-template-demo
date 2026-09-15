import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ユーザー向けエラーメッセージ（JSONレスポンスの error フィールド）は必ず src/worker/strings/ja.ts の
// STRINGS を経由すること。ここに直接日本語リテラルを書くハードコードを検出する。
// なお、工程・成果物・判断基準の状態値（"進行中"等）はマスタ（enums.ts等）で一元管理された区分値であり、
// 対象としない（DOCS/DP.md: 無理な共通化はしない）。

const ROUTES_DIR = join(process.cwd(), "src/worker/routes");

function listTsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

describe("文字列リテラルのハードコード検出", () => {
  it("routes配下のerrorフィールドはすべてSTRINGS経由である", () => {
    const offenders: string[] = [];
    for (const file of listTsFiles(ROUTES_DIR)) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        // error: "..." のように直接文字列リテラルを返している行を検出する（STRINGS.で始まる参照は許可）
        if (/error:\s*"[^"]/.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("strings/ja.ts が STRINGS を必ずエクスポートしている", () => {
    const stringsFile = join(process.cwd(), "src/worker/strings/ja.ts");
    const content = readFileSync(stringsFile, "utf-8");
    expect(content).toMatch(/export const STRINGS/);
  });
});
