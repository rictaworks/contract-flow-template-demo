import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "./support/testDb";
import { makeClient } from "./support/client";
import { evaluateAndAdvance, fullySatisfyPhase } from "./support/passPhase";

describe("保守運用サイクル（P15）", () => {
  let db: D1Database;
  let client: ReturnType<typeof makeClient>;
  let projectId: string;
  let p15Id: string;

  beforeEach(async () => {
    db = createTestD1();
    client = makeClient(db);
    const created = await client.post("/api/profile", {
      contractType: "準委任",
      workType: "保守運用",
      scale: "中",
      requirementCertainty: "確定",
      label: "保守案件",
    });
    projectId = created.body.projectId;

    // P01 -> P02 -> P03 -> P04(保守要件定義) を通過させP15まで前進
    let flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    expect(flow.phases.map((p: { code: string }) => p.code)).toEqual(["P01", "P02", "P03", "P04", "P15", "P14", "P18"]);
    for (let i = 0; i < 4; i++) {
      const currentId = flow.project.currentPhaseId as string;
      await fullySatisfyPhase(client, currentId);
      await evaluateAndAdvance(client, currentId);
      flow = (await client.get(`/api/projects/${projectId}/flow`)).body;
    }
    p15Id = flow.project.currentPhaseId as string;
    expect(flow.phases.find((p: { id: string }) => p.id === p15Id).code).toBe("P15");
  });

  it("周期を開始し、4段階を進め、月次報告書承認で周期完了・次周期開始できる", async () => {
    const start = await client.post(`/api/phases/${p15Id}/maintenance/start`);
    expect(start.status).toBe(201);
    const cycleId = start.body.cycleId as string;
    expect(start.body.cycleNo).toBe(1);

    await client.post(`/api/maintenance-cycles/${cycleId}/records`, { summary: "問い合わせ対応" });

    for (const stage of ["切り分け", "対応", "報告"]) {
      const res = await client.post(`/api/maintenance-cycles/${cycleId}/advance-stage`, { stage });
      expect(res.status).toBe(200);
    }

    const detail = (await client.get(`/api/phases/${p15Id}`)).body;
    expect(detail.maintenance.cycle.stage).toBe("報告");
    expect(detail.maintenance.records).toHaveLength(1);

    const monthlyReport = detail.deliverables.find((d: { name: string }) => d.name === "月次報告書");
    // 承認前は周期完了できない
    const tooEarly = await client.post(`/api/phases/${p15Id}/maintenance/complete-cycle`);
    expect(tooEarly.status).toBe(409);

    await client.patch(`/api/deliverables/${monthlyReport.id}`, { state: "承認済" });
    const complete = await client.post(`/api/phases/${p15Id}/maintenance/complete-cycle`);
    expect(complete.status).toBe(200);
    expect(complete.body.completedCycleId).toBe(cycleId);

    const afterDetail = (await client.get(`/api/phases/${p15Id}`)).body;
    expect(afterDetail.maintenance.cycle.cycleNo).toBe(2);
    const monthlyReportAfter = afterDetail.deliverables.find((d: { name: string }) => d.name === "月次報告書");
    expect(monthlyReportAfter.state).toBe("未作成");
  });
});
