import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import { ProjectRepository } from "../db/repositories/projectRepository";
import { PhaseRepository } from "../db/repositories/phaseRepository";
import { CarryoverRepository } from "../db/repositories/carryoverRepository";
import { ChangeRequestRepository } from "../db/repositories/changeRequestRepository";
import { STRINGS } from "../strings/ja";

export const flowRoutes = new Hono<AppEnv>();

flowRoutes.get("/projects/:id/flow", async (c) => {
  const sessionId = c.get("sessionId");
  const projectId = c.req.param("id");
  const project = await ProjectRepository.findById(c.env.DB, sessionId, projectId);
  if (!project) return c.json({ error: STRINGS.errors.notFound }, 404);

  const [phases, warnings, carryoverOpen, changeRequestUnagreed] = await Promise.all([
    PhaseRepository.listByProject(c.env.DB, sessionId, projectId),
    ProjectRepository.listWarnings(c.env.DB, sessionId, projectId),
    CarryoverRepository.countOpenByProject(c.env.DB, sessionId, projectId),
    ChangeRequestRepository.countUnagreedByProject(c.env.DB, sessionId, projectId),
  ]);

  const phaseIds = phases.map((p) => p.id);
  const deliverables = await PhaseRepository.listDeliverablesByPhaseIds(c.env.DB, sessionId, phaseIds);

  const phaseSummaries = await Promise.all(
    phases.map(async (phase) => {
      const criteria = await PhaseRepository.listCriteria(c.env.DB, sessionId, phase.id);
      const phaseDeliverables = deliverables.filter((d) => d.phase_id === phase.id);
      const requiredDeliverables = phaseDeliverables.filter((d) => d.requirement === "必須");
      const requiredOk = requiredDeliverables.filter((d) => d.state === "承認済" || d.state === "レビュー済").length;
      const criteriaAchieved = criteria.filter((c2) => c2.satisfied === 1).length;
      return {
        id: phase.id,
        seq: phase.seq,
        code: phase.phase_code,
        name: phase.name,
        gateKind: phase.gate_kind,
        contractSegment: phase.contract_segment,
        state: phase.state,
        isCurrent: project.current_phase_id === phase.id,
        requiredDeliverableTotal: requiredDeliverables.length,
        requiredDeliverableSatisfied: requiredOk,
        criterionTotal: criteria.length,
        criterionAchieved: criteriaAchieved,
      };
    }),
  );

  return c.json({
    project: {
      id: project.id,
      label: project.label,
      contractType: project.contract_type,
      workType: project.work_type,
      scale: project.scale,
      requirementCertainty: project.requirement_certainty,
      state: project.state,
      currentPhaseId: project.current_phase_id,
    },
    warnings: warnings.map((w) => ({ ruleCode: w.rule_code, message: w.message, recommendation: w.recommendation })),
    phases: phaseSummaries,
    carryoverOpenCount: carryoverOpen,
    changeRequestUnagreedCount: changeRequestUnagreed,
  });
});
