import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import { PhaseRepository } from "../db/repositories/phaseRepository";
import { ProjectRepository } from "../db/repositories/projectRepository";
import { CarryoverRepository } from "../db/repositories/carryoverRepository";
import { ChangeRequestRepository } from "../db/repositories/changeRequestRepository";
import { TransitionRepository } from "../db/repositories/transitionRepository";
import { MaintenanceRepository } from "../db/repositories/maintenanceRepository";
import { GateEvaluator } from "../domain/gateEvaluator";
import { TransitionService } from "../domain/transitionService";
import { MaintenanceCycleService } from "../domain/maintenanceCycleService";
import {
  assertDeliverableState,
  assertMaintenanceRecordState,
  assertMaintenanceStage,
  assertNonEmptyString,
  assertRole,
  ValidationError,
} from "../lib/validation";
import { toJstDateString } from "../lib/time";
import { STRINGS } from "../strings/ja";
import { AUTO_COMPUTED_CRITERIA_TEXTS } from "../master/criteria";

export const phaseRoutes = new Hono<AppEnv>();

async function loadPhaseWithProject(db: D1Database, sessionId: string, phaseId: string) {
  const phase = await PhaseRepository.findById(db, sessionId, phaseId);
  if (!phase) return null;
  const project = await ProjectRepository.findById(db, sessionId, phase.project_id);
  if (!project) return null;
  return { phase, project };
}

phaseRoutes.get("/phases/:phaseId", async (c) => {
  const sessionId = c.get("sessionId");
  const phaseId = c.req.param("phaseId");
  const loaded = await loadPhaseWithProject(c.env.DB, sessionId, phaseId);
  if (!loaded) return c.json({ error: STRINGS.errors.notFound }, 404);
  const { phase } = loaded;

  const [deliverables, criteria, approvals, rules, latestReview] = await Promise.all([
    PhaseRepository.listDeliverables(c.env.DB, sessionId, phaseId),
    PhaseRepository.listCriteria(c.env.DB, sessionId, phaseId),
    PhaseRepository.listApprovals(c.env.DB, sessionId, phaseId),
    PhaseRepository.listRules(c.env.DB, sessionId, phaseId),
    PhaseRepository.latestGateReview(c.env.DB, sessionId, phaseId),
  ]);

  let maintenance = null;
  if (phase.phase_code === "P15") {
    const cycle = await MaintenanceRepository.currentCycle(c.env.DB, sessionId, phaseId);
    const records = cycle ? await MaintenanceRepository.listRecords(c.env.DB, sessionId, cycle.id) : [];
    maintenance = {
      cycle: cycle ? { id: cycle.id, cycleNo: cycle.cycle_no, stage: cycle.stage, state: cycle.state } : null,
      records: records.map((r) => ({ id: r.id, summary: r.summary, state: r.state })),
    };
  }

  return c.json({
    phase: {
      id: phase.id,
      code: phase.phase_code,
      name: phase.name,
      gateKind: phase.gate_kind,
      contractSegment: phase.contract_segment,
      state: phase.state,
    },
    deliverables: deliverables.map((d) => ({ id: d.id, name: d.name, requirement: d.requirement, recurring: d.recurring === 1, ownerRole: d.owner_role, state: d.state })),
    criteria: criteria.map((cr) => ({ id: cr.id, text: cr.text, level: cr.level, autoAttached: cr.auto_attached === 1, satisfied: cr.satisfied === 1, note: cr.note })),
    approvals: approvals.map((a) => ({ id: a.id, approverRole: a.approver_role, approvedOn: a.approved_on })),
    appliedRules: rules.map((r) => r.rule_code),
    latestGateReview: latestReview
      ? {
          verdict: latestReview.verdict,
          unmetRequired: JSON.parse(latestReview.unmet_required) as string[],
          unmetRecommended: JSON.parse(latestReview.unmet_recommended) as string[],
          reviewedAt: latestReview.reviewed_at,
        }
      : null,
    maintenance,
  });
});

phaseRoutes.patch("/deliverables/:id", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const deliverable = await PhaseRepository.findDeliverable(c.env.DB, sessionId, id);
  if (!deliverable) return c.json({ error: STRINGS.errors.notFound }, 404);
  const owningPhase = await PhaseRepository.findById(c.env.DB, sessionId, deliverable.phase_id);
  if (!owningPhase || owningPhase.state === "凍結") return c.json({ error: STRINGS.errors.phaseFrozen }, 409);
  const body = await c.req.json().catch(() => ({}));
  let state;
  try {
    state = assertDeliverableState((body as Record<string, unknown>).state);
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: STRINGS.errors.badRequest }, 400);
    throw e;
  }
  await PhaseRepository.updateDeliverableState(c.env.DB, sessionId, id, state);
  return c.json({ ok: true });
});

const AUTO_COMPUTED_CRITERIA: Set<string> = new Set(Object.values(AUTO_COMPUTED_CRITERIA_TEXTS));

phaseRoutes.patch("/criteria/:id", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const criterion = await PhaseRepository.findCriterion(c.env.DB, sessionId, id);
  if (!criterion) return c.json({ error: STRINGS.errors.notFound }, 404);
  const owningPhase = await PhaseRepository.findById(c.env.DB, sessionId, criterion.phase_id);
  if (!owningPhase || owningPhase.state === "凍結") return c.json({ error: STRINGS.errors.phaseFrozen }, 409);
  if (criterion.auto_attached === 1 && AUTO_COMPUTED_CRITERIA.has(criterion.text)) {
    return c.json({ error: STRINGS.errors.badRequest }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const satisfied = (body as Record<string, unknown>).satisfied;
  if (typeof satisfied !== "boolean") return c.json({ error: STRINGS.errors.badRequest }, 400);
  const note = typeof (body as Record<string, unknown>).note === "string" ? ((body as Record<string, unknown>).note as string) : null;
  await PhaseRepository.updateCriterionSatisfied(c.env.DB, sessionId, id, satisfied, note);
  return c.json({ ok: true });
});

phaseRoutes.post("/phases/:phaseId/approvals", async (c) => {
  const sessionId = c.get("sessionId");
  const phaseId = c.req.param("phaseId");
  const loaded = await loadPhaseWithProject(c.env.DB, sessionId, phaseId);
  if (!loaded) return c.json({ error: STRINGS.errors.notFound }, 404);
  const body = await c.req.json().catch(() => ({}));
  let approverRole;
  try {
    approverRole = assertRole((body as Record<string, unknown>).approverRole);
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: STRINGS.errors.badRequest }, 400);
    throw e;
  }
  const approvedOn =
    typeof (body as Record<string, unknown>).approvedOn === "string" ? ((body as Record<string, unknown>).approvedOn as string) : toJstDateString(new Date());
  const approval = await PhaseRepository.addApproval(c.env.DB, sessionId, phaseId, approverRole, approvedOn);
  return c.json({ id: approval.id }, 201);
});

phaseRoutes.post("/phases/:phaseId/evaluate", async (c) => {
  const sessionId = c.get("sessionId");
  const phaseId = c.req.param("phaseId");
  const loaded = await loadPhaseWithProject(c.env.DB, sessionId, phaseId);
  if (!loaded) return c.json({ error: STRINGS.errors.notFound }, 404);
  const { phase, project } = loaded;

  if (phase.state !== "進行中" && phase.state !== "ゲート評価待ち") {
    return c.json({ error: STRINGS.errors.gateNotEvaluable }, 409);
  }

  const [deliverables, criteria, approvals, openCarryover, unagreedCr] = await Promise.all([
    PhaseRepository.listDeliverables(c.env.DB, sessionId, phaseId),
    PhaseRepository.listCriteria(c.env.DB, sessionId, phaseId),
    PhaseRepository.listApprovals(c.env.DB, sessionId, phaseId),
    CarryoverRepository.countOpenByProject(c.env.DB, sessionId, project.id),
    ChangeRequestRepository.countUnagreedByProject(c.env.DB, sessionId, project.id),
  ]);

  const verdict = GateEvaluator.evaluate({
    phase,
    deliverables,
    criteria,
    approvals,
    openCarryoverIssueCount: openCarryover,
    unagreedChangeRequestCount: unagreedCr,
  });

  await PhaseRepository.addGateReview(c.env.DB, sessionId, phaseId, verdict.result, verdict.unmetRequired, verdict.unmetRecommended);

  if (verdict.result === "不通過") {
    await PhaseRepository.updateState(c.env.DB, sessionId, phaseId, "進行中");
  } else {
    await PhaseRepository.updateState(c.env.DB, sessionId, phaseId, "ゲート評価待ち");
    if (verdict.result === "条件付き通過") {
      for (const text of verdict.unmetRecommended) {
        await CarryoverRepository.add(c.env.DB, sessionId, project.id, phaseId, text);
      }
    }
  }

  return c.json({ verdict });
});

phaseRoutes.post("/phases/:phaseId/advance", async (c) => {
  const sessionId = c.get("sessionId");
  const phaseId = c.req.param("phaseId");
  const loaded = await loadPhaseWithProject(c.env.DB, sessionId, phaseId);
  if (!loaded) return c.json({ error: STRINGS.errors.notFound }, 404);
  const { phase, project } = loaded;
  // 中止後はP18（クローズ）のみが進行可能（requirements.md 8.3・状態遷移図15.1）。
  // P18自身の前進は例外として許可する。
  if (project.state === "中止" && phase.phase_code !== "P18") return c.json({ error: STRINGS.errors.projectAborted }, 409);

  const latestReview = await PhaseRepository.latestGateReview(c.env.DB, sessionId, phaseId);
  if (!latestReview || !TransitionService.canAdvance(latestReview.verdict as "通過" | "条件付き通過" | "不通過")) {
    return c.json({ error: STRINGS.errors.advanceNotAllowed }, 409);
  }

  const wasAborted = project.state === "中止";
  const orderedPhases = await PhaseRepository.listByProject(c.env.DB, sessionId, project.id);
  await PhaseRepository.updateState(c.env.DB, sessionId, phaseId, latestReview.verdict === "通過" ? "通過" : "条件付き通過");

  const next = TransitionService.nextPhase(orderedPhases, phaseId);
  if (next) {
    await PhaseRepository.updateState(c.env.DB, sessionId, next.id, "進行中");
    await ProjectRepository.updateCurrentPhase(c.env.DB, sessionId, project.id, next.id);
  } else {
    // 中止経由でP18を通過した場合は「クローズ」、通常経路の終端では「完了」（状態遷移図15.1）。
    await ProjectRepository.updateState(c.env.DB, sessionId, project.id, wasAborted ? "クローズ" : "完了");
  }
  await TransitionRepository.add(c.env.DB, sessionId, project.id, phaseId, next?.id ?? null, "前進", null);

  return c.json({ nextPhaseId: next?.id ?? null });
});

phaseRoutes.post("/projects/:projectId/rollback", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("projectId");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);
  if (project.state === "中止") return c.json({ error: STRINGS.errors.projectAborted }, 409);
  if (!project.current_phase_id) return c.json({ error: STRINGS.errors.badRequest }, 409);

  const body = await c.req.json().catch(() => ({}));
  const targetPhaseId = (body as Record<string, unknown>).targetPhaseId;
  let reason: string;
  try {
    reason = assertNonEmptyString((body as Record<string, unknown>).reason, "reason");
  } catch {
    return c.json({ error: STRINGS.errors.rollbackReasonRequired }, 400);
  }
  if (typeof targetPhaseId !== "string") return c.json({ error: STRINGS.errors.badRequest }, 400);

  const orderedPhases = await PhaseRepository.listByProject(c.env.DB, sessionId, projectId);
  const range = TransitionService.rollbackRange(orderedPhases, project.current_phase_id, targetPhaseId);
  if (range.length === 0) return c.json({ error: STRINGS.errors.badRequest }, 400);

  for (const p of range) {
    await PhaseRepository.updateState(c.env.DB, sessionId, p.id, "要再確認");
  }
  const rangeIds = range.map((p) => p.id);
  await PhaseRepository.bulkSetDeliverablesNeedsUpdate(c.env.DB, sessionId, rangeIds);

  await PhaseRepository.updateState(c.env.DB, sessionId, targetPhaseId, "進行中");
  await ProjectRepository.updateCurrentPhase(c.env.DB, sessionId, projectId, targetPhaseId);
  await TransitionRepository.add(c.env.DB, sessionId, projectId, project.current_phase_id, targetPhaseId, "差戻し", reason);

  return c.json({ targetPhaseId });
});

phaseRoutes.post("/projects/:projectId/abort", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("projectId");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);

  const body = await c.req.json().catch(() => ({}));
  let reason: string;
  try {
    reason = assertNonEmptyString((body as Record<string, unknown>).reason, "reason");
  } catch {
    return c.json({ error: STRINGS.errors.abortReasonRequired }, 400);
  }

  const orderedPhases = await PhaseRepository.listByProject(c.env.DB, sessionId, projectId);
  const p18 = orderedPhases.find((p) => p.phase_code === "P18");

  for (const p of orderedPhases) {
    if (p18 && p.id === p18.id) continue;
    if (p.state === "未着手" || p.state === "進行中" || p.state === "ゲート評価待ち" || p.state === "要再確認") {
      await PhaseRepository.updateState(c.env.DB, sessionId, p.id, "凍結");
    }
  }
  if (p18) {
    await PhaseRepository.updateState(c.env.DB, sessionId, p18.id, "進行中");
    await PhaseRepository.promoteCriterionRequired(c.env.DB, sessionId, p18.id, "精算（工数・費用）が完了している");
    await ProjectRepository.updateCurrentPhase(c.env.DB, sessionId, projectId, p18.id);
  }
  await ProjectRepository.updateState(c.env.DB, sessionId, projectId, "中止", reason);
  await TransitionRepository.add(c.env.DB, sessionId, projectId, project.current_phase_id, p18?.id ?? null, "中止", reason);

  return c.json({ ok: true });
});

// --- 保守運用サイクル（P15） ---

phaseRoutes.post("/phases/:phaseId/maintenance/start", async (c) => {
  const sessionId = c.get("sessionId");
  const phaseId = c.req.param("phaseId");
  const loaded = await loadPhaseWithProject(c.env.DB, sessionId, phaseId);
  if (!loaded || loaded.phase.phase_code !== "P15") return c.json({ error: STRINGS.errors.notFound }, 404);
  const existing = await MaintenanceRepository.listByPhase(c.env.DB, sessionId, phaseId);
  if (existing.some((cyc) => cyc.state === "進行中")) return c.json({ error: STRINGS.errors.badRequest }, 409);
  const cycle = await MaintenanceRepository.startCycle(c.env.DB, sessionId, phaseId, existing.length + 1);
  return c.json({ cycleId: cycle.id, cycleNo: cycle.cycle_no }, 201);
});

phaseRoutes.post("/maintenance-cycles/:cycleId/advance-stage", async (c) => {
  const sessionId = c.get("sessionId");
  const cycleId = c.req.param("cycleId");
  const body = await c.req.json().catch(() => ({}));
  let stage;
  try {
    stage = assertMaintenanceStage((body as Record<string, unknown>).stage);
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: STRINGS.errors.badRequest }, 400);
    throw e;
  }
  await MaintenanceRepository.advanceStage(c.env.DB, sessionId, cycleId, stage);
  return c.json({ ok: true });
});

phaseRoutes.post("/maintenance-cycles/:cycleId/records", async (c) => {
  const sessionId = c.get("sessionId");
  const cycleId = c.req.param("cycleId");
  const body = await c.req.json().catch(() => ({}));
  let summary: string;
  try {
    summary = assertNonEmptyString((body as Record<string, unknown>).summary, "summary");
  } catch {
    return c.json({ error: STRINGS.errors.badRequest }, 400);
  }
  const record = await MaintenanceRepository.addRecord(c.env.DB, sessionId, cycleId, summary);
  return c.json({ id: record.id }, 201);
});

phaseRoutes.patch("/maintenance-records/:id", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  let state;
  try {
    state = assertMaintenanceRecordState((body as Record<string, unknown>).state);
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: STRINGS.errors.badRequest }, 400);
    throw e;
  }
  await MaintenanceRepository.updateRecordState(c.env.DB, sessionId, id, state);
  return c.json({ ok: true });
});

phaseRoutes.post("/phases/:phaseId/maintenance/complete-cycle", async (c) => {
  const sessionId = c.get("sessionId");
  const phaseId = c.req.param("phaseId");
  const loaded = await loadPhaseWithProject(c.env.DB, sessionId, phaseId);
  if (!loaded || loaded.phase.phase_code !== "P15") return c.json({ error: STRINGS.errors.notFound }, 404);
  const cycle = await MaintenanceRepository.currentCycle(c.env.DB, sessionId, phaseId);
  if (!cycle) return c.json({ error: STRINGS.errors.badRequest }, 409);

  const deliverables = await PhaseRepository.listDeliverables(c.env.DB, sessionId, phaseId);
  const monthlyReport = deliverables.find((d) => d.name === "月次報告書");
  if (!monthlyReport || !MaintenanceCycleService.isCycleComplete(monthlyReport.state)) {
    return c.json({ error: STRINGS.errors.badRequest }, 409);
  }

  await MaintenanceRepository.completeCycle(c.env.DB, sessionId, cycle.id);
  for (const d of deliverables.filter((x) => x.recurring === 1)) {
    await PhaseRepository.updateDeliverableState(c.env.DB, sessionId, d.id, "未作成");
  }
  const next = await MaintenanceRepository.startCycle(c.env.DB, sessionId, phaseId, cycle.cycle_no + 1);
  return c.json({ completedCycleId: cycle.id, nextCycleId: next.id });
});

// --- 持越し課題 ---

phaseRoutes.get("/projects/:projectId/carryover-issues", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("projectId");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);
  const issues = await CarryoverRepository.listByProject(c.env.DB, sessionId, projectId);
  return c.json({
    issues: issues.map((i) => ({ id: i.id, text: i.text, state: i.state, originPhaseId: i.origin_phase_id, resolvedPhaseId: i.resolved_phase_id })),
  });
});

phaseRoutes.post("/carryover-issues/:id/resolve", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const resolvedPhaseId = (body as Record<string, unknown>).resolvedPhaseId;
  if (typeof resolvedPhaseId !== "string") return c.json({ error: STRINGS.errors.badRequest }, 400);
  await CarryoverRepository.resolve(c.env.DB, sessionId, id, resolvedPhaseId);
  return c.json({ ok: true });
});
