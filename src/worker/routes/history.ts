import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import { ProjectRepository } from "../db/repositories/projectRepository";
import { PhaseRepository } from "../db/repositories/phaseRepository";
import { TransitionRepository } from "../db/repositories/transitionRepository";
import { ChangeRequestRepository } from "../db/repositories/changeRequestRepository";
import { STRINGS } from "../strings/ja";

export const historyRoutes = new Hono<AppEnv>();

historyRoutes.get("/projects/:projectId/history", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("projectId");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);

  const [transitions, phases, changeRequests] = await Promise.all([
    TransitionRepository.listByProject(c.env.DB, sessionId, projectId),
    PhaseRepository.listByProject(c.env.DB, sessionId, projectId),
    ChangeRequestRepository.listByProject(c.env.DB, sessionId, projectId),
  ]);
  const phaseIds = phases.map((p) => p.id);
  const gateReviews = await PhaseRepository.listGateReviewsByProject(c.env.DB, sessionId, phaseIds);
  const phaseNameById = new Map(phases.map((p) => [p.id, p.name]));

  return c.json({
    transitions: transitions.map((t) => ({
      id: t.id,
      kind: t.kind,
      fromPhaseName: t.from_phase_id ? (phaseNameById.get(t.from_phase_id) ?? null) : null,
      toPhaseName: t.to_phase_id ? (phaseNameById.get(t.to_phase_id) ?? null) : null,
      reason: t.reason,
      occurredAt: t.occurred_at,
    })),
    gateReviews: gateReviews.map((g) => ({
      id: g.id,
      phaseName: phaseNameById.get(g.phase_id) ?? null,
      verdict: g.verdict,
      unmetRequired: JSON.parse(g.unmet_required) as string[],
      unmetRecommended: JSON.parse(g.unmet_recommended) as string[],
      reviewedAt: g.reviewed_at,
    })),
    changeRequests: changeRequests.map((cr) => ({ id: cr.id, title: cr.title, state: cr.state })),
  });
});
