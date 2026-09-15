import { nowIso } from "../lib/time";

/** セッションが存在しなければ作成し、last_seen_at を更新する（オーナーキーの発行元）。 */
export async function touchSession(db: D1Database, sessionId: string): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO sessions (session_id, created_at, last_seen_at) VALUES (?1, ?2, ?2)
       ON CONFLICT(session_id) DO UPDATE SET last_seen_at = ?2`,
    )
    .bind(sessionId, now)
    .run();
}

/** 指定した project_id が、このセッションの所有であることを確認する（セッションをまたいだ到達を防止）。 */
export async function verifyProjectOwnership(db: D1Database, sessionId: string, projectId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM projects WHERE id = ?1 AND session_id = ?2")
    .bind(projectId, sessionId)
    .first();
  return row !== null;
}

/** 指定した phase_id が、このセッションの所有であることを確認する。 */
export async function verifyPhaseOwnership(db: D1Database, sessionId: string, phaseId: string): Promise<boolean> {
  const row = await db.prepare("SELECT id FROM phases WHERE id = ?1 AND session_id = ?2").bind(phaseId, sessionId).first();
  return row !== null;
}
