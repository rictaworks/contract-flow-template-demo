import type { TransitionRow } from "../types";
import { nowIso } from "../../lib/time";

export const TransitionRepository = {
  async add(
    db: D1Database,
    sessionId: string,
    projectId: string,
    fromPhaseId: string | null,
    toPhaseId: string | null,
    kind: string,
    reason: string | null,
  ): Promise<TransitionRow> {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO transitions (id, session_id, project_id, from_phase_id, to_phase_id, kind, reason, occurred_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(id, sessionId, projectId, fromPhaseId, toPhaseId, kind, reason, nowIso())
      .run();
    const created = await db.prepare("SELECT * FROM transitions WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<TransitionRow>();
    if (!created) throw new Error("failed to add transition");
    return created;
  },

  async listByProject(db: D1Database, sessionId: string, projectId: string): Promise<TransitionRow[]> {
    const res = await db
      .prepare("SELECT * FROM transitions WHERE project_id = ?1 AND session_id = ?2 ORDER BY occurred_at ASC")
      .bind(projectId, sessionId)
      .all<TransitionRow>();
    return res.results ?? [];
  },
};
