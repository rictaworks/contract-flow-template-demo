import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import { ProjectRepository } from "../db/repositories/projectRepository";
import { PhaseRepository } from "../db/repositories/phaseRepository";
import { ChangeRequestRepository } from "../db/repositories/changeRequestRepository";
import { ChangeRequestService } from "../domain/changeRequestService";
import { assertBoolean, assertNonEmptyString } from "../lib/validation";
import { isHoneypotTriggered } from "../lib/honeypot";
import { STRINGS } from "../strings/ja";

export const changeRequestRoutes = new Hono<AppEnv>();

changeRequestRoutes.get("/projects/:projectId/change-requests", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("projectId");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);
  const list = await ChangeRequestRepository.listByProject(c.env.DB, sessionId, projectId);
  return c.json({
    changeRequests: list.map((cr) => ({
      id: cr.id,
      title: cr.title,
      state: cr.state,
      raisedPhaseId: cr.raised_phase_id,
      affectsEffort: cr.affects_effort === 1,
      affectsSchedule: cr.affects_schedule === 1,
      affectsCost: cr.affects_cost === 1,
      requiresAmendment: cr.requires_amendment === 1,
      reason: cr.reason,
    })),
  });
});

changeRequestRoutes.post("/projects/:projectId/change-requests", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("projectId");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);
  if (project.state === "中止") return c.json({ error: STRINGS.errors.projectAborted }, 409);
  if (!project.current_phase_id) return c.json({ error: STRINGS.errors.badRequest }, 409);

  const body = await c.req.json().catch(() => ({}));
  if (isHoneypotTriggered(body)) return c.json({ error: STRINGS.errors.honeypotTriggered }, 400);

  const phases = await PhaseRepository.listByProject(c.env.DB, sessionId, projectId);
  const contractSigned = phases.some((p) => p.phase_code === "P03" && (p.state === "通過" || p.state === "条件付き通過"));
  if (!contractSigned) return c.json({ error: STRINGS.errors.changeRequestPhaseTooEarly }, 409);

  let title: string;
  try {
    title = assertNonEmptyString((body as Record<string, unknown>).title, "title");
  } catch {
    return c.json({ error: STRINGS.errors.badRequest }, 400);
  }

  const cr = await ChangeRequestRepository.create(c.env.DB, sessionId, projectId, project.current_phase_id, title);
  return c.json({ id: cr.id }, 201);
});

changeRequestRoutes.patch("/change-requests/:id/impact", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const cr = await ChangeRequestRepository.findById(c.env.DB, sessionId, id);
  if (!cr) return c.json({ error: STRINGS.errors.notFound }, 404);
  if (!ChangeRequestService.isUnagreed(cr.state)) return c.json({ error: STRINGS.errors.changeRequestInvalidTransition }, 409);

  const body = await c.req.json().catch(() => ({}));
  let affectsEffort: boolean;
  let affectsSchedule: boolean;
  let affectsCost: boolean;
  try {
    affectsEffort = assertBoolean((body as Record<string, unknown>).affectsEffort, "affectsEffort");
    affectsSchedule = assertBoolean((body as Record<string, unknown>).affectsSchedule, "affectsSchedule");
    affectsCost = assertBoolean((body as Record<string, unknown>).affectsCost, "affectsCost");
  } catch {
    return c.json({ error: STRINGS.errors.badRequest }, 400);
  }
  const impactDeliverableIds = Array.isArray((body as Record<string, unknown>).impactDeliverableIds)
    ? ((body as Record<string, unknown>).impactDeliverableIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  if (impactDeliverableIds.length > 0) {
    const projectPhases = await PhaseRepository.listByProject(c.env.DB, sessionId, cr.project_id);
    const phaseIdsOfProject = new Set(projectPhases.map((p) => p.id));
    for (const deliverableId of impactDeliverableIds) {
      const deliverable = await PhaseRepository.findDeliverable(c.env.DB, sessionId, deliverableId);
      if (!deliverable || !phaseIdsOfProject.has(deliverable.phase_id)) {
        return c.json({ error: STRINGS.errors.badRequest }, 400);
      }
    }
  }

  await ChangeRequestRepository.recordImpactAssessment(c.env.DB, sessionId, id, affectsEffort, affectsSchedule, affectsCost, impactDeliverableIds);
  return c.json({ ok: true });
});

changeRequestRoutes.post("/change-requests/:id/agree", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const cr = await ChangeRequestRepository.findById(c.env.DB, sessionId, id);
  if (!cr) return c.json({ error: STRINGS.errors.notFound }, 404);
  if (cr.state !== "合意待ち") return c.json({ error: STRINGS.errors.changeRequestInvalidTransition }, 409);

  const raisedPhase = await PhaseRepository.findById(c.env.DB, sessionId, cr.raised_phase_id);
  const project = await ProjectRepository.findById(c.env.DB, sessionId, cr.project_id);
  if (!raisedPhase || !project) return c.json({ error: STRINGS.errors.notFound }, 404);

  const effectiveSegment = project.contract_type === "請負" ? "請負" : project.contract_type === "ハイブリッド" ? raisedPhase.contract_segment : "準委任";
  const requiresAmendment = ChangeRequestService.requiresAmendment(
    effectiveSegment as "請負" | "準委任" | null,
    cr.affects_schedule === 1,
    cr.affects_cost === 1,
  );

  if (requiresAmendment) {
    const phases = await PhaseRepository.listByProject(c.env.DB, sessionId, cr.project_id);
    const contractPhases = phases.filter((p) => p.phase_code === "P03");
    const target = contractPhases.find((p) => p.contract_segment === "請負") ?? contractPhases[0];
    if (target) await PhaseRepository.addDeliverable(c.env.DB, sessionId, target.id, "契約変更覚書", "必須", "受注PM", "CR");
  }

  const impacts = await ChangeRequestRepository.listImpacts(c.env.DB, sessionId, id);
  for (const impact of impacts) {
    await PhaseRepository.updateDeliverableState(c.env.DB, sessionId, impact.deliverable_id, "要更新");
  }

  await ChangeRequestRepository.agree(c.env.DB, sessionId, id, requiresAmendment);
  return c.json({ requiresAmendment });
});

changeRequestRoutes.post("/change-requests/:id/reject", async (c) => {
  const sessionId = c.get("sessionId");
  const id = c.req.param("id");
  const cr = await ChangeRequestRepository.findById(c.env.DB, sessionId, id);
  if (!cr) return c.json({ error: STRINGS.errors.notFound }, 404);
  if (cr.state !== "合意待ち") return c.json({ error: STRINGS.errors.changeRequestInvalidTransition }, 409);

  const body = await c.req.json().catch(() => ({}));
  let reason: string;
  try {
    reason = assertNonEmptyString((body as Record<string, unknown>).reason, "reason");
  } catch {
    return c.json({ error: STRINGS.errors.badRequest }, 400);
  }
  await ChangeRequestRepository.reject(c.env.DB, sessionId, id, reason);
  return c.json({ ok: true });
});
