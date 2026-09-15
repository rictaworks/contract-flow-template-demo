import type { makeClient } from "./client";
import { AUTO_COMPUTED_CRITERIA_TEXTS } from "../../../src/worker/master/criteria";

const AUTO_COMPUTED: Set<string> = new Set(Object.values(AUTO_COMPUTED_CRITERIA_TEXTS));

interface PhaseDetail {
  phase: { id: string; gateKind: string };
  deliverables: { id: string; requirement: string }[];
  criteria: { id: string; text: string; level: string; autoAttached: boolean }[];
}

/** 工程の必須成果物・必須/推奨判断基準を全て満たし、必要なら承認記録を追加してからゲート評価する。 */
export async function fullySatisfyPhase(client: ReturnType<typeof makeClient>, phaseId: string): Promise<void> {
  const detail = (await client.get(`/api/phases/${phaseId}`)).body as PhaseDetail;
  const targetState = detail.phase.gateKind === "内部レビュー" ? "レビュー済" : "承認済";

  for (const d of detail.deliverables) {
    if (d.requirement !== "必須") continue;
    const res = await client.patch(`/api/deliverables/${d.id}`, { state: targetState });
    if (res.status !== 200) throw new Error(`deliverable update failed: ${JSON.stringify(res.body)}`);
  }
  for (const cr of detail.criteria) {
    if (AUTO_COMPUTED.has(cr.text)) continue;
    const res = await client.patch(`/api/criteria/${cr.id}`, { satisfied: true, note: null });
    if (res.status !== 200) throw new Error(`criterion update failed: ${JSON.stringify(res.body)}`);
  }
  if (detail.phase.gateKind !== "内部レビュー") {
    const res = await client.post(`/api/phases/${phaseId}/approvals`, { approverRole: "発注者決裁者", approvedOn: "2026-09-15" });
    if (res.status !== 201) throw new Error(`approval failed: ${JSON.stringify(res.body)}`);
  }
}

export async function evaluateAndAdvance(client: ReturnType<typeof makeClient>, phaseId: string): Promise<string> {
  const evalRes = await client.post(`/api/phases/${phaseId}/evaluate`);
  const verdict = evalRes.body.verdict.result as string;
  if (verdict === "不通過") return verdict;
  const advanceRes = await client.post(`/api/phases/${phaseId}/advance`);
  if (advanceRes.status !== 200) throw new Error(`advance failed: ${JSON.stringify(advanceRes.body)}`);
  return verdict;
}
