import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";

describe("ゲート判定：不通過・条件付き通過", () => {
  let db: D1Database;
  let client: ReturnType<typeof makeClient>;
  let projectId: string;
  let phaseId: string;

  beforeEach(async () => {
    db = createTestD1();
    client = makeClient(db);
    const created = await client.post("/api/profile", {
      contractType: "準委任",
      workType: "新規開発",
      scale: "中",
      requirementCertainty: "確定",
      label: "テスト案件",
    });
    projectId = created.body.projectId;
    const flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    phaseId = flow.project.currentPhaseId;
  });

  it("何もしないと不通過になり、未達必須基準が列挙される", async () => {
    const res = await client.post(`/api/phases/${phaseId}/evaluate`);
    expect(res.status).toBe(200);
    expect(res.body.verdict.result).toBe("不通過");
    expect(res.body.verdict.unmetRequired.length).toBeGreaterThan(0);

    const flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    const p01 = flow.phases.find((p: { code: string }) => p.code === "P01");
    expect(p01.state).toBe("進行中");
  });

  it("不通過の状態からは前進できない", async () => {
    await client.post(`/api/phases/${phaseId}/evaluate`);
    const advance = await client.post(`/api/phases/${phaseId}/advance`);
    expect(advance.status).toBe(409);
  });

  it("必須のみ満たし推奨が未達なら条件付き通過し、持越し課題が登録される", async () => {
    const detail = (await client.get(`/api/phases/${phaseId}`)).body;
    for (const d of detail.deliverables.filter((x: { requirement: string }) => x.requirement === "必須")) {
      await client.patch(`/api/deliverables/${d.id}`, { state: "レビュー済" });
    }
    for (const c of detail.criteria.filter((x: { level: string }) => x.level === "必須")) {
      await client.patch(`/api/criteria/${c.id}`, { satisfied: true, note: null });
    }
    const res = await client.post(`/api/phases/${phaseId}/evaluate`);
    expect(res.body.verdict.result).toBe("条件付き通過");
    expect(res.body.verdict.unmetRecommended.length).toBeGreaterThan(0);

    const issues = (await client.get(`/api/projects/${projectId}/carryover-issues`)).body.issues;
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].state).toBe("未解決");

    // 条件付き通過なので前進できる
    const advance = await client.post(`/api/phases/${phaseId}/advance`);
    expect(advance.status).toBe(200);
  });

  it("同一工程を状態を変えずに複数回評価しても、同一の持越し課題は重複登録されない（issue #9 回帰）", async () => {
    const detail = (await client.get(`/api/phases/${phaseId}`)).body;
    for (const d of detail.deliverables.filter((x: { requirement: string }) => x.requirement === "必須")) {
      await client.patch(`/api/deliverables/${d.id}`, { state: "レビュー済" });
    }
    for (const c of detail.criteria.filter((x: { level: string }) => x.level === "必須")) {
      await client.patch(`/api/criteria/${c.id}`, { satisfied: true, note: null });
    }

    await client.post(`/api/phases/${phaseId}/evaluate`);
    const afterFirst = (await client.get(`/api/projects/${projectId}/carryover-issues`)).body.issues;
    expect(afterFirst.length).toBeGreaterThan(0);

    // 状態を変えずに同じ工程を再評価する（条件付き通過→ゲート評価待ちのままなので再評価できる）
    await client.post(`/api/phases/${phaseId}/evaluate`);
    await client.post(`/api/phases/${phaseId}/evaluate`);
    const afterRepeat = (await client.get(`/api/projects/${projectId}/carryover-issues`)).body.issues;
    expect(afterRepeat.length).toBe(afterFirst.length);
  });

  it("顧客承認ゲートは承認記録が無いと他の基準を満たしても不通過", async () => {
    // P01(内部レビュー)を通過させてP02(顧客承認)へ
    const detail = (await client.get(`/api/phases/${phaseId}`)).body;
    for (const d of detail.deliverables.filter((x: { requirement: string }) => x.requirement === "必須")) {
      await client.patch(`/api/deliverables/${d.id}`, { state: "レビュー済" });
    }
    for (const c of detail.criteria) {
      await client.patch(`/api/criteria/${c.id}`, { satisfied: true, note: null });
    }
    await client.post(`/api/phases/${phaseId}/evaluate`);
    await client.post(`/api/phases/${phaseId}/advance`);

    const flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    const p02Id = flow.project.currentPhaseId as string;
    const p02Detail = (await client.get(`/api/phases/${p02Id}`)).body;
    for (const d of p02Detail.deliverables.filter((x: { requirement: string }) => x.requirement === "必須")) {
      await client.patch(`/api/deliverables/${d.id}`, { state: "承認済" });
    }
    for (const c of p02Detail.criteria) {
      await client.patch(`/api/criteria/${c.id}`, { satisfied: true, note: null });
    }
    // 承認記録を追加しない
    const res = await client.post(`/api/phases/${p02Id}/evaluate`);
    expect(res.body.verdict.result).toBe("不通過");
    expect(res.body.verdict.unmetRequired).toContain("承認記録が存在する");
  });
});
