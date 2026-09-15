import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

// vite/vitest の静的インポート解析が `node:sqlite` を素通りできないため、
// Node のネイティブ require 経由でビルトインモジュールを取得する（型のみ通常のimportで取得）。
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = DatabaseSyncType;

// D1Database は結合テストでは本物の SQLite（node:sqlite）で代替する。
// レポジトリ・ルート層の実装コードはそのまま実行され、モックはSQL実行エンジンの差し替えのみに限定する。

class BoundStatement {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private args: unknown[],
  ) {}

  async run() {
    const stmt = this.db.prepare(this.sql);
    stmt.run(...(this.args as never[]));
    return { success: true };
  }

  async all<T>() {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...(this.args as never[])) as T[];
    return { results: rows, success: true };
  }

  async first<T>() {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...(this.args as never[])) as T | undefined;
    return (row ?? null) as T | null;
  }
}

class PreparedStatementAdapter {
  constructor(
    private db: DatabaseSync,
    private sql: string,
  ) {}
  bind(...args: unknown[]) {
    return new BoundStatement(this.db, this.sql, args);
  }
  run() {
    return new BoundStatement(this.db, this.sql, []).run();
  }
  all<T>() {
    return new BoundStatement(this.db, this.sql, []).all<T>();
  }
  first<T>() {
    return new BoundStatement(this.db, this.sql, []).first<T>();
  }
}

export function createTestD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  const migrationPath = fileURLToPath(new URL("../../../src/worker/db/migrations/0001_init.sql", import.meta.url));
  const schema = readFileSync(migrationPath, "utf-8");
  db.exec(schema);
  return {
    prepare: (sql: string) => new PreparedStatementAdapter(db, sql),
    // D1Database#batch は複数の bind 済みステートメントを1回のラウンドトリップで実行する。
    // node:sqlite はインメモリで往復コストが無いため、ここでは単に順番に実行するだけでよい。
    batch: async (statements: BoundStatement[]) => {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
  } as unknown as D1Database;
}
