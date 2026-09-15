import type { CarryoverIssueRow } from "../types";

export const CarryoverRepository = {
  async add(db: D1Database, sessionId: string, projectId: string, originPhaseId: string, text: string): Promise<CarryoverIssueRow> {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO carryover_issues (id, session_id, project_id, origin_phase_id, text, state, resolved_phase_id)
         VALUES (?1, ?2, ?3, ?4, ?5, '未解決', NULL)`,
      )
      .bind(id, sessionId, projectId, originPhaseId, text)
      .run();
    const created = await db.prepare("SELECT * FROM carryover_issues WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<CarryoverIssueRow>();
    if (!created) throw new Error("failed to add carryover issue");
    return created;
  },

  async listByProject(db: D1Database, sessionId: string, projectId: string): Promise<CarryoverIssueRow[]> {
    const res = await db
      .prepare("SELECT * FROM carryover_issues WHERE project_id = ?1 AND session_id = ?2")
      .bind(projectId, sessionId)
      .all<CarryoverIssueRow>();
    return res.results ?? [];
  },

  async countOpenByProject(db: D1Database, sessionId: string, projectId: string): Promise<number> {
    const row = await db
      .prepare("SELECT COUNT(*) as cnt FROM carryover_issues WHERE project_id = ?1 AND session_id = ?2 AND state = '未解決'")
      .bind(projectId, sessionId)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  },

  async resolve(db: D1Database, sessionId: string, issueId: string, resolvedPhaseId: string): Promise<void> {
    await db
      .prepare("UPDATE carryover_issues SET state = '解決', resolved_phase_id = ?1 WHERE id = ?2 AND session_id = ?3")
      .bind(resolvedPhaseId, issueId, sessionId)
      .run();
  },
};
