import type { CarryoverIssueRow } from "../types";

export const CarryoverRepository = {
  /**
   * 持越し課題を登録する。同一工程・同一文言の未解決な持越し課題が既に存在する場合は、
   * 新規登録せず既存の行をそのまま返す（requirements.md 7.2「持越し課題は、発生元の工程を
   * 保持したまま案件に紐づき」に対し、同一発生元・同一内容の重複行を作らないため。
   * ゲート再評価のたびに無条件で追加すると、同じ課題が何度も積み重なってしまう）。
   */
  async add(db: D1Database, sessionId: string, projectId: string, originPhaseId: string, text: string): Promise<CarryoverIssueRow> {
    const existing = await db
      .prepare(
        `SELECT * FROM carryover_issues
         WHERE session_id = ?1 AND origin_phase_id = ?2 AND text = ?3 AND state = '未解決'`,
      )
      .bind(sessionId, originPhaseId, text)
      .first<CarryoverIssueRow>();
    if (existing) return existing;

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
