import type { ChangeRequestImpactRow, ChangeRequestRow } from "../types";

export const ChangeRequestRepository = {
  async create(db: D1Database, sessionId: string, projectId: string, raisedPhaseId: string, title: string): Promise<ChangeRequestRow> {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO change_requests (id, session_id, project_id, raised_phase_id, title, affects_effort, affects_schedule, affects_cost, requires_amendment, state, reason)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 0, 0, '起票', NULL)`,
      )
      .bind(id, sessionId, projectId, raisedPhaseId, title)
      .run();
    const created = await this.findById(db, sessionId, id);
    if (!created) throw new Error("failed to create change request");
    return created;
  },

  async findById(db: D1Database, sessionId: string, id: string): Promise<ChangeRequestRow | null> {
    return db.prepare("SELECT * FROM change_requests WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<ChangeRequestRow>();
  },

  async listByProject(db: D1Database, sessionId: string, projectId: string): Promise<ChangeRequestRow[]> {
    const res = await db
      .prepare("SELECT * FROM change_requests WHERE project_id = ?1 AND session_id = ?2")
      .bind(projectId, sessionId)
      .all<ChangeRequestRow>();
    return res.results ?? [];
  },

  async countUnagreedByProject(db: D1Database, sessionId: string, projectId: string): Promise<number> {
    const row = await db
      .prepare(
        "SELECT COUNT(*) as cnt FROM change_requests WHERE project_id = ?1 AND session_id = ?2 AND state IN ('起票','影響評価中','合意待ち')",
      )
      .bind(projectId, sessionId)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  },

  async recordImpactAssessment(
    db: D1Database,
    sessionId: string,
    id: string,
    affectsEffort: boolean,
    affectsSchedule: boolean,
    affectsCost: boolean,
    impactDeliverableIds: string[],
  ): Promise<void> {
    await db
      .prepare(
        `UPDATE change_requests SET affects_effort = ?1, affects_schedule = ?2, affects_cost = ?3, state = '合意待ち' WHERE id = ?4 AND session_id = ?5`,
      )
      .bind(affectsEffort ? 1 : 0, affectsSchedule ? 1 : 0, affectsCost ? 1 : 0, id, sessionId)
      .run();
    for (const deliverableId of impactDeliverableIds) {
      await db
        .prepare("INSERT INTO change_request_impacts (id, session_id, change_request_id, deliverable_id) VALUES (?1, ?2, ?3, ?4)")
        .bind(crypto.randomUUID(), sessionId, id, deliverableId)
        .run();
    }
  },

  async listImpacts(db: D1Database, sessionId: string, changeRequestId: string): Promise<ChangeRequestImpactRow[]> {
    const res = await db
      .prepare("SELECT * FROM change_request_impacts WHERE change_request_id = ?1 AND session_id = ?2")
      .bind(changeRequestId, sessionId)
      .all<ChangeRequestImpactRow>();
    return res.results ?? [];
  },

  async agree(db: D1Database, sessionId: string, id: string, requiresAmendment: boolean): Promise<void> {
    await db
      .prepare("UPDATE change_requests SET state = '反映済', requires_amendment = ?1 WHERE id = ?2 AND session_id = ?3")
      .bind(requiresAmendment ? 1 : 0, id, sessionId)
      .run();
  },

  async reject(db: D1Database, sessionId: string, id: string, reason: string): Promise<void> {
    await db.prepare("UPDATE change_requests SET state = '却下', reason = ?1 WHERE id = ?2 AND session_id = ?3").bind(reason, id, sessionId).run();
  },
};
