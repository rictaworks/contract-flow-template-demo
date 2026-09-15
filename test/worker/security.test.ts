import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";

describe("セキュリティ：ハニーポット・入力検証・セッション分離", () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1();
  });

  it("不可視ハニーポット欄に値があると400で拒否される", async () => {
    const client = makeClient(db);
    const res = await client.post("/api/profile/validate", {
      contractType: "請負",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
      contact_channel: "bot-filled-this",
    });
    expect(res.status).toBe(400);
  });

  it("マスタ区分値以外は400で拒否される", async () => {
    const client = makeClient(db);
    const res = await client.post("/api/profile/validate", {
      contractType: "不正な値",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
    });
    expect(res.status).toBe(400);
  });

  it("R18: ハイブリッド×保守運用はプロファイル登録APIでも拒否される", async () => {
    const client = makeClient(db);
    const res = await client.post("/api/profile", {
      contractType: "ハイブリッド",
      workType: "保守運用",
      scale: "中",
      requirementCertainty: "確定",
      label: "不成立案件",
    });
    expect(res.status).toBe(400);
  });

  it("セッションをまたいだ案件への到達はできない（404）", async () => {
    const ownerClient = makeClient(db);
    const created = await ownerClient.post("/api/profile", {
      contractType: "準委任",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
      label: "他人の案件",
    });
    const projectId = created.body.projectId as string;

    const strangerClient = makeClient(db);
    // 別セッションの初回アクセスでセッションを発行させる
    await strangerClient.get("/api/health");
    const strangerRes = await strangerClient.get(`/api/projects/${projectId}/flow`);
    expect(strangerRes.status).toBe(404);
  });
});
