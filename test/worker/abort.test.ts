import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";

describe("中止", () => {
  let db: D1Database;
  let client: ReturnType<typeof makeClient>;
  let projectId: string;

  beforeEach(async () => {
    db = createTestD1();
    client = makeClient(db);
    const created = await client.post("/api/profile", {
      contractType: "準委任",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
      label: "中止テスト案件",
    });
    projectId = created.body.projectId;
  });

  it("理由なしでは中止できない", async () => {
    const res = await client.post(`/api/projects/${projectId}/abort`, {});
    expect(res.status).toBe(400);
  });

  it("中止するとP18以外は凍結され、P18のみ進行中になり精算基準が必須へ昇格する", async () => {
    const res = await client.post(`/api/projects/${projectId}/abort`, { reason: "発注者都合により中止" });
    expect(res.status).toBe(200);

    const flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(flow.project.state).toBe("中止");
    const p18 = flow.phases.find((p: { code: string }) => p.code === "P18");
    expect(p18.state).toBe("進行中");
    expect(flow.project.currentPhaseId).toBe(p18.id);
    for (const p of flow.phases) {
      if (p.code === "P18") continue;
      expect(p.state).toBe("凍結");
    }

    const p18Detail = (await client.get(`/api/phases/${p18.id}`)).body;
    const settlement = p18Detail.criteria.find((c: { text: string }) => c.text === "精算（工数・費用）が完了している");
    expect(settlement.level).toBe("必須");

    // 中止後は前進操作が拒否される
    const advance = await client.post(`/api/phases/${p18.id}/advance`);
    expect(advance.status).toBe(409);
  });
});
