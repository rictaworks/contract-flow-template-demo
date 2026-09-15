import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";
import { evaluateAndAdvance, fullySatisfyPhase } from "./support/passPhase";

describe("請負×新規開発×小×確定：登録からクローズまでの一連の流れ", () => {
  let db: D1Database;
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    db = createTestD1();
    client = makeClient(db);
  });

  it("プレビュー→登録→全工程通過→差戻し→再前進ができる", async () => {
    const preview = await client.post("/api/profile/validate", {
      contractType: "請負",
      workType: "新規開発",
      scale: "小",
      requirementCertainty: "確定",
    });
    expect(preview.status).toBe(200);
    expect(preview.body.accepted).toBe(true);
    expect(preview.body.preview.map((p: { code: string }) => p.code)).toEqual(["P01", "P02", "P03", "P04", "P06", "P08", "P09", "P11", "P12", "P13", "P18"]);

    const created = await client.post("/api/profile", {
      contractType: "請負",
      workType: "新規開発",
      scale: "小",
      requirementCertainty: "確定",
      label: "テスト案件",
    });
    expect(created.status).toBe(201);
    const projectId = created.body.projectId as string;

    let flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(flow.phases).toHaveLength(11);
    expect(flow.phases[0].state).toBe("進行中");
    expect(flow.phases[0].isCurrent).toBe(true);

    // P01 を通過させ、P02 へ前進
    let currentPhaseId = flow.phases[0].id as string;
    await fullySatisfyPhase(client, currentPhaseId);
    const verdict1 = await evaluateAndAdvance(client, currentPhaseId);
    expect(verdict1).toBe("通過");

    flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(flow.project.currentPhaseId).not.toBe(currentPhaseId);
    const p01AfterAdvance = flow.phases.find((p: { code: string }) => p.code === "P01");
    expect(p01AfterAdvance.state).toBe("通過");

    // P02 も通過させ P03 へ
    currentPhaseId = flow.project.currentPhaseId as string;
    await fullySatisfyPhase(client, currentPhaseId);
    const verdict2 = await evaluateAndAdvance(client, currentPhaseId);
    expect(verdict2).toBe("通過");

    // 差戻し：P03 から P01 へ
    flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    const p03Id = flow.project.currentPhaseId as string;
    const p01Id = flow.phases.find((p: { code: string }) => p.code === "P01").id as string;
    const rollback = await client.post(`/api/projects/${projectId}/rollback`, { targetPhaseId: p01Id, reason: "要件の認識齟齬のため再確認" });
    expect(rollback.status).toBe(200);

    flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(flow.project.currentPhaseId).toBe(p01Id);
    const p01AfterRollback = flow.phases.find((p: { code: string }) => p.code === "P01");
    expect(p01AfterRollback.state).toBe("進行中");
    const p02AfterRollback = flow.phases.find((p: { code: string }) => p.code === "P02");
    expect(p02AfterRollback.state).toBe("要再確認");
    const p03AfterRollback = flow.phases.find((p: { code: string }) => p.code === "P03");
    expect(p03AfterRollback.state).toBe("要再確認");

    const phaseDetail = (await client.get(`/api/phases/${p01Id}`)).body;
    for (const d of phaseDetail.deliverables) {
      expect(d.state).toBe("要更新");
    }

    // 差戻し履歴が記録される
    const history = (await client.get(`/api/projects/${projectId}/history`)).body;
    expect(history.transitions.some((t: { kind: string }) => t.kind === "差戻し")).toBe(true);

    // 再度 P01 を通過させ P02 へ戻る
    await fullySatisfyPhase(client, p01Id);
    const verdict3 = await evaluateAndAdvance(client, p01Id);
    expect(verdict3).toBe("通過");
    flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(flow.project.currentPhaseId).toBe(p02Id(flow));
  });
});

function p02Id(flow: { phases: { code: string; id: string }[] }): string {
  return flow.phases.find((p) => p.code === "P02")!.id;
}
