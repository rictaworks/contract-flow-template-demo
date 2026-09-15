import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";
import { evaluateAndAdvance, fullySatisfyPhase } from "./support/passPhase";

describe("変更要求ワークフロー", () => {
  let db: D1Database;
  let client: ReturnType<typeof makeClient>;
  let projectId: string;

  beforeEach(async () => {
    db = createTestD1();
    client = makeClient(db);
    const created = await client.post("/api/profile", {
      contractType: "請負",
      workType: "新規開発",
      scale: "小",
      requirementCertainty: "確定",
      label: "テスト案件",
    });
    projectId = created.body.projectId;
  });

  it("P03通過前は起票できない", async () => {
    const res = await client.post(`/api/projects/${projectId}/change-requests`, { title: "追加機能の要望" });
    expect(res.status).toBe(409);
  });

  it("P03通過後、請負×金額影響ありの合意で契約変更覚書が必須追加され、影響成果物が要更新になる", async () => {
    let flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    // P01 -> P02 -> P03 まで前進
    for (let i = 0; i < 3; i++) {
      const currentId = flow.project.currentPhaseId as string;
      await fullySatisfyPhase(client, currentId);
      await evaluateAndAdvance(client, currentId);
      flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    }

    const raise = await client.post(`/api/projects/${projectId}/change-requests`, { title: "追加機能の要望" });
    expect(raise.status).toBe(201);
    const crId = raise.body.id as string;

    const p04Id = flow.phases.find((p: { code: string }) => p.code === "P04").id as string;
    const p04Detail = (await client.get(`/api/phases/${p04Id}`)).body;
    const impactDeliverableId = p04Detail.deliverables[0].id as string;

    const impact = await client.patch(`/api/change-requests/${crId}/impact`, {
      affectsEffort: true,
      affectsSchedule: false,
      affectsCost: true,
      impactDeliverableIds: [impactDeliverableId],
    });
    expect(impact.status).toBe(200);

    const agree = await client.post(`/api/change-requests/${crId}/agree`);
    expect(agree.status).toBe(200);
    expect(agree.body.requiresAmendment).toBe(true);

    const p03Id = flow.phases.find((p: { code: string }) => p.code === "P03").id as string;
    const p03Detail = (await client.get(`/api/phases/${p03Id}`)).body;
    expect(p03Detail.deliverables.some((d: { name: string; requirement: string }) => d.name === "契約変更覚書" && d.requirement === "必須")).toBe(true);

    const impactedDeliverable = (await client.get(`/api/phases/${p04Id}`)).body.deliverables.find((d: { id: string }) => d.id === impactDeliverableId);
    expect(impactedDeliverable.state).toBe("要更新");
  });

  it("他案件（同一セッション内）の成果物IDを影響成果物に指定すると拒否される", async () => {
    let flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    for (let i = 0; i < 3; i++) {
      const currentId = flow.project.currentPhaseId as string;
      await fullySatisfyPhase(client, currentId);
      await evaluateAndAdvance(client, currentId);
      flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    }
    const raise = await client.post(`/api/projects/${projectId}/change-requests`, { title: "追加機能の要望" });
    const crId = raise.body.id as string;

    // 同一セッション内に別案件を作成し、その成果物IDを混入させる
    const otherProject = await client.post("/api/profile", {
      contractType: "準委任",
      workType: "調査",
      scale: "小",
      requirementCertainty: "確定",
      label: "別案件",
    });
    const otherFlow = (await client.get(`/api/projects/${otherProject.body.projectId}/flow`)).body;
    const otherPhaseId = otherFlow.phases[0].id as string;
    const otherDetail = (await client.get(`/api/phases/${otherPhaseId}`)).body;
    const otherDeliverableId = otherDetail.deliverables[0].id as string;

    const impact = await client.patch(`/api/change-requests/${crId}/impact`, {
      affectsEffort: false,
      affectsSchedule: false,
      affectsCost: false,
      impactDeliverableIds: [otherDeliverableId],
    });
    expect(impact.status).toBe(400);
  });

  it("却下すると理由が記録され状態が却下になる", async () => {
    let flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    for (let i = 0; i < 3; i++) {
      const currentId = flow.project.currentPhaseId as string;
      await fullySatisfyPhase(client, currentId);
      await evaluateAndAdvance(client, currentId);
      flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    }
    const raise = await client.post(`/api/projects/${projectId}/change-requests`, { title: "スコープ外の要望" });
    const crId = raise.body.id as string;
    await client.patch(`/api/change-requests/${crId}/impact`, { affectsEffort: false, affectsSchedule: false, affectsCost: false, impactDeliverableIds: [] });
    const reject = await client.post(`/api/change-requests/${crId}/reject`, { reason: "契約範囲外のため" });
    expect(reject.status).toBe(200);
    const list = (await client.get(`/api/projects/${projectId}/change-requests`)).body.changeRequests;
    expect(list.find((c: { id: string }) => c.id === crId).state).toBe("却下");
  });
});
