import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 画面文言は必ず src/frontend/strings/ja.ts の STRINGS を経由すること。
// 例外：
//  - src/frontend/strings/ja.ts 自体（文言の集約先）
//  - src/frontend/masterOptions.ts（バックエンドのマスタ区分値をミラーする定数。UI文言ではなくドメイン値）
//  - 判断基準の比較（=== "..." / !== "..."）やTypeScriptのユニオン型リテラル（区分値の型定義）は
//    表示文言のハードコードではないため対象外とする。
const TARGET_DIRS = ["src/frontend/pages", "src/frontend/components", "src/frontend"];
const EXCLUDE_FILES = new Set(["src/frontend/strings/ja.ts", "src/frontend/masterOptions.ts"]);
const JAPANESE = /[぀-ゟ゠-ヿ一-鿿]/;

function listTsFilesRecursive(dir: string, seen = new Set<string>()): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (seen.has(full)) continue;
    seen.add(full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "pages" || entry === "components") continue; // 個別にトップレベルで列挙済み
      results.push(...listTsFilesRecursive(full, seen));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

function collectTargetFiles(): string[] {
  const root = process.cwd();
  const files = new Set<string>();
  for (const dir of TARGET_DIRS) {
    const abs = join(root, dir);
    for (const file of listTsFilesRecursive(abs)) {
      const rel = file.slice(root.length + 1).replace(/\\/g, "/");
      if (EXCLUDE_FILES.has(rel)) continue;
      files.add(rel);
    }
  }
  return Array.from(files);
}

function stripAllowedPatterns(line: string): string {
  // 比較演算子の右辺（ドメイン区分値との照合）
  let stripped = line.replace(/[!=]==\s*"[^"]*"/g, "");
  // TypeScriptのユニオン型リテラル（例: requirement: "必須" | "任意";）
  stripped = stripped.replace(/:\s*"[^"]*"(\s*\|\s*"[^"]*")+/g, ":");
  return stripped;
}

describe("フロントエンドの文字列リテラルのハードコード検出", () => {
  it("STRINGSを経由しない日本語の表示文言が無い", () => {
    const offenders: string[] = [];
    for (const file of collectTargetFiles()) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      content.split("\n").forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        const stripped = stripAllowedPatterns(line);
        const match = /"[^"]*"/g;
        let m: RegExpExecArray | null;
        while ((m = match.exec(stripped))) {
          if (JAPANESE.test(m[0])) {
            offenders.push(`${file}:${i + 1}: ${line.trim()}`);
            break;
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("alert/confirm/prompt を使用していない", () => {
    const offenders: string[] = [];
    for (const file of collectTargetFiles()) {
      const content = readFileSync(join(process.cwd(), file), "utf-8");
      const codeOnly = content
        .split("\n")
        .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
        .join("\n");
      if (/\b(alert|confirm|window\.prompt)\s*\(/.test(codeOnly) || /\bprompt\s*\(/.test(codeOnly)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("strings/ja.ts が STRINGS を必ずエクスポートしている", () => {
    const content = readFileSync(join(process.cwd(), "src/frontend/strings/ja.ts"), "utf-8");
    expect(content).toMatch(/export const STRINGS/);
  });
});
