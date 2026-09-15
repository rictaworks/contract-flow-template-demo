import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";
import { fullySatisfyPhase, evaluateAndAdvance } from "./support/passPhase";

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

    // ゲート評価前の前進は（中止とは無関係に）拒否される
    const advance = await client.post(`/api/phases/${p18.id}/advance`);
    expect(advance.status).toBe(409);
  });

  it("中止後もP18を満たしてゲートを通過させれば前進でき、案件状態は「クローズ」になる（issue #8 回帰）", async () => {
    await client.post(`/api/projects/${projectId}/abort`, { reason: "発注者都合により中止" });

    const flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    const p18Id = flow.project.currentPhaseId as string;

    await fullySatisfyPhase(client, p18Id);
    const verdict = await evaluateAndAdvance(client, p18Id);
    expect(verdict).not.toBe("不通過");

    const after = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(after.project.state).toBe("クローズ");
  });

  it("中止後、P18以外（P01）は依然として前進・ゲート評価とも拒否される", async () => {
    await client.post(`/api/projects/${projectId}/abort`, { reason: "発注者都合により中止" });
    const flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    const p01 = flow.phases.find((p: { code: string }) => p.code === "P01");

    const evalRes = await client.post(`/api/phases/${p01.id}/evaluate`);
    expect(evalRes.status).toBe(409);

    const advanceRes = await client.post(`/api/phases/${p01.id}/advance`);
    expect(advanceRes.status).toBe(409);
  });

  it("中止で凍結された工程の成果物・判断基準は更新できない（8.3：P18以外は操作不能）", async () => {
    const beforeFlow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    const p01 = beforeFlow.phases.find((p: { code: string }) => p.code === "P01");
    const p01Detail = (await client.get(`/api/phases/${p01.id}`)).body;
    const deliverableId = p01Detail.deliverables[0].id as string;
    const criterion = p01Detail.criteria.find((c: { autoAttached: boolean }) => !c.autoAttached);
    const criterionId = criterion.id as string;

    await client.post(`/api/projects/${projectId}/abort`, { reason: "発注者都合により中止" });

    const deliverableUpdate = await client.patch(`/api/deliverables/${deliverableId}`, { state: "作成中" });
    expect(deliverableUpdate.status).toBe(409);

    const criterionUpdate = await client.patch(`/api/criteria/${criterionId}`, { satisfied: true, note: null });
    expect(criterionUpdate.status).toBe(409);
  });
});
