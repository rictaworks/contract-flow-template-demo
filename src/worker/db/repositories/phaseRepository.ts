import type { ApprovalRow, CriterionRow, DeliverableRow, GateReviewRow, PhaseRow, PhaseRuleRow } from "../types";
import { nowIso } from "../../lib/time";

export const PhaseRepository = {
  async listByProject(db: D1Database, sessionId: string, projectId: string): Promise<PhaseRow[]> {
    const res = await db
      .prepare("SELECT * FROM phases WHERE project_id = ?1 AND session_id = ?2 ORDER BY seq ASC")
      .bind(projectId, sessionId)
      .all<PhaseRow>();
    return res.results ?? [];
  },

  async findById(db: D1Database, sessionId: string, phaseId: string): Promise<PhaseRow | null> {
    return db.prepare("SELECT * FROM phases WHERE id = ?1 AND session_id = ?2").bind(phaseId, sessionId).first<PhaseRow>();
  },

  async listRules(db: D1Database, sessionId: string, phaseId: string): Promise<PhaseRuleRow[]> {
    const res = await db.prepare("SELECT * FROM phase_rules WHERE phase_id = ?1 AND session_id = ?2").bind(phaseId, sessionId).all<PhaseRuleRow>();
    return res.results ?? [];
  },

  async updateState(db: D1Database, sessionId: string, phaseId: string, state: string): Promise<void> {
    await db.prepare("UPDATE phases SET state = ?1 WHERE id = ?2 AND session_id = ?3").bind(state, phaseId, sessionId).run();
  },

  async listDeliverables(db: D1Database, sessionId: string, phaseId: string): Promise<DeliverableRow[]> {
    const res = await db.prepare("SELECT * FROM deliverables WHERE phase_id = ?1 AND session_id = ?2").bind(phaseId, sessionId).all<DeliverableRow>();
    return res.results ?? [];
  },

  async listDeliverablesByPhaseIds(db: D1Database, sessionId: string, phaseIds: string[]): Promise<DeliverableRow[]> {
    if (phaseIds.length === 0) return [];
    const placeholders = phaseIds.map((_, i) => `?${i + 2}`).join(",");
    const res = await db
      .prepare(`SELECT * FROM deliverables WHERE session_id = ?1 AND phase_id IN (${placeholders})`)
      .bind(sessionId, ...phaseIds)
      .all<DeliverableRow>();
    return res.results ?? [];
  },

  async findDeliverable(db: D1Database, sessionId: string, deliverableId: string): Promise<DeliverableRow | null> {
    return db.prepare("SELECT * FROM deliverables WHERE id = ?1 AND session_id = ?2").bind(deliverableId, sessionId).first<DeliverableRow>();
  },

  async updateDeliverableState(db: D1Database, sessionId: string, deliverableId: string, state: string): Promise<void> {
    await db.prepare("UPDATE deliverables SET state = ?1 WHERE id = ?2 AND session_id = ?3").bind(state, deliverableId, sessionId).run();
  },

  async bulkSetDeliverablesNeedsUpdate(db: D1Database, sessionId: string, phaseIds: string[]): Promise<void> {
    if (phaseIds.length === 0) return;
    const placeholders = phaseIds.map((_, i) => `?${i + 2}`).join(",");
    await db
      .prepare(`UPDATE deliverables SET state = '要更新' WHERE session_id = ?1 AND phase_id IN (${placeholders})`)
      .bind(sessionId, ...phaseIds)
      .run();
  },

  async addDeliverable(
    db: D1Database,
    sessionId: string,
    phaseId: string,
    name: string,
    requirement: string,
    ownerRole: string,
    originRuleCode: string,
  ): Promise<DeliverableRow> {
    const existing = await db
      .prepare("SELECT * FROM deliverables WHERE phase_id = ?1 AND session_id = ?2 AND name = ?3")
      .bind(phaseId, sessionId, name)
      .first<DeliverableRow>();
    if (existing) {
      if (requirement === "必須" && existing.requirement !== "必須") {
        await db.prepare("UPDATE deliverables SET requirement = '必須' WHERE id = ?1 AND session_id = ?2").bind(existing.id, sessionId).run();
      }
      return existing;
    }
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO deliverables (id, session_id, phase_id, name, requirement, recurring, owner_role, state, origin_rule_code)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, '未作成', ?7)`,
      )
      .bind(id, sessionId, phaseId, name, requirement, ownerRole, originRuleCode)
      .run();
    const created = await db.prepare("SELECT * FROM deliverables WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<DeliverableRow>();
    if (!created) throw new Error("failed to add deliverable");
    return created;
  },

  async listCriteria(db: D1Database, sessionId: string, phaseId: string): Promise<CriterionRow[]> {
    const res = await db.prepare("SELECT * FROM criteria WHERE phase_id = ?1 AND session_id = ?2").bind(phaseId, sessionId).all<CriterionRow>();
    return res.results ?? [];
  },

  async findCriterion(db: D1Database, sessionId: string, criterionId: string): Promise<CriterionRow | null> {
    return db.prepare("SELECT * FROM criteria WHERE id = ?1 AND session_id = ?2").bind(criterionId, sessionId).first<CriterionRow>();
  },

  async updateCriterionSatisfied(db: D1Database, sessionId: string, criterionId: string, satisfied: boolean, note: string | null): Promise<void> {
    await db
      .prepare("UPDATE criteria SET satisfied = ?1, note = ?2 WHERE id = ?3 AND session_id = ?4")
      .bind(satisfied ? 1 : 0, note, criterionId, sessionId)
      .run();
  },

  async promoteCriterionRequired(db: D1Database, sessionId: string, phaseId: string, text: string): Promise<void> {
    await db
      .prepare("UPDATE criteria SET level = '必須' WHERE phase_id = ?1 AND session_id = ?2 AND text = ?3")
      .bind(phaseId, sessionId, text)
      .run();
  },

  async listApprovals(db: D1Database, sessionId: string, phaseId: string): Promise<ApprovalRow[]> {
    const res = await db.prepare("SELECT * FROM approvals WHERE phase_id = ?1 AND session_id = ?2").bind(phaseId, sessionId).all<ApprovalRow>();
    return res.results ?? [];
  },

  async addApproval(db: D1Database, sessionId: string, phaseId: string, approverRole: string, approvedOn: string): Promise<ApprovalRow> {
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO approvals (id, session_id, phase_id, approver_role, approved_on) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(id, sessionId, phaseId, approverRole, approvedOn)
      .run();
    const created = await db.prepare("SELECT * FROM approvals WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<ApprovalRow>();
    if (!created) throw new Error("failed to add approval");
    return created;
  },

  async addGateReview(
    db: D1Database,
    sessionId: string,
    phaseId: string,
    verdict: string,
    unmetRequired: string[],
    unmetRecommended: string[],
  ): Promise<GateReviewRow> {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO gate_reviews (id, session_id, phase_id, verdict, unmet_required, unmet_recommended, reviewed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(id, sessionId, phaseId, verdict, JSON.stringify(unmetRequired), JSON.stringify(unmetRecommended), nowIso())
      .run();
    const created = await db.prepare("SELECT * FROM gate_reviews WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<GateReviewRow>();
    if (!created) throw new Error("failed to add gate review");
    return created;
  },

  async listGateReviewsByProject(db: D1Database, sessionId: string, phaseIds: string[]): Promise<GateReviewRow[]> {
    if (phaseIds.length === 0) return [];
    const placeholders = phaseIds.map((_, i) => `?${i + 2}`).join(",");
    const res = await db
      .prepare(`SELECT * FROM gate_reviews WHERE session_id = ?1 AND phase_id IN (${placeholders}) ORDER BY reviewed_at ASC`)
      .bind(sessionId, ...phaseIds)
      .all<GateReviewRow>();
    return res.results ?? [];
  },

  async latestGateReview(db: D1Database, sessionId: string, phaseId: string): Promise<GateReviewRow | null> {
    return db
      .prepare("SELECT * FROM gate_reviews WHERE phase_id = ?1 AND session_id = ?2 ORDER BY reviewed_at DESC LIMIT 1")
      .bind(phaseId, sessionId)
      .first<GateReviewRow>();
  },
};
