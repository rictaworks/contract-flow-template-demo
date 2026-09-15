import { describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";
import { runDailyReset } from "../../src/worker/index";

describe("日次リセット", () => {
  it("全テーブルが削除される（マスタはDBに存在しないため対象外）", async () => {
    const db = createTestD1();
    const client = makeClient(db);
    const created = await client.post("/api/profile", {
      contractType: "準委任",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
      label: "リセット対象案件",
    });
    expect(created.status).toBe(201);

    const before = await db.prepare("SELECT COUNT(*) as cnt FROM projects").first<{ cnt: number }>();
    expect(before?.cnt).toBe(1);

    await runDailyReset(db);

    const tables = ["projects", "phases", "deliverables", "criteria", "sessions", "transitions"];
    for (const table of tables) {
      const row = await db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).first<{ cnt: number }>();
      expect(row?.cnt).toBe(0);
    }
  });
});
