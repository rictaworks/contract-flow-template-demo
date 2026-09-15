import type { MaintenanceCycleRow, MaintenanceRecordRow } from "../types";

export const MaintenanceRepository = {
  async currentCycle(db: D1Database, sessionId: string, phaseId: string): Promise<MaintenanceCycleRow | null> {
    return db
      .prepare("SELECT * FROM maintenance_cycles WHERE phase_id = ?1 AND session_id = ?2 AND state = '進行中' ORDER BY cycle_no DESC LIMIT 1")
      .bind(phaseId, sessionId)
      .first<MaintenanceCycleRow>();
  },

  async listByPhase(db: D1Database, sessionId: string, phaseId: string): Promise<MaintenanceCycleRow[]> {
    const res = await db
      .prepare("SELECT * FROM maintenance_cycles WHERE phase_id = ?1 AND session_id = ?2 ORDER BY cycle_no ASC")
      .bind(phaseId, sessionId)
      .all<MaintenanceCycleRow>();
    return res.results ?? [];
  },

  async startCycle(db: D1Database, sessionId: string, phaseId: string, cycleNo: number): Promise<MaintenanceCycleRow> {
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO maintenance_cycles (id, session_id, phase_id, cycle_no, stage, state) VALUES (?1, ?2, ?3, ?4, '受付', '進行中')")
      .bind(id, sessionId, phaseId, cycleNo)
      .run();
    const created = await db.prepare("SELECT * FROM maintenance_cycles WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<MaintenanceCycleRow>();
    if (!created) throw new Error("failed to start cycle");
    return created;
  },

  async advanceStage(db: D1Database, sessionId: string, cycleId: string, stage: string): Promise<void> {
    await db.prepare("UPDATE maintenance_cycles SET stage = ?1 WHERE id = ?2 AND session_id = ?3").bind(stage, cycleId, sessionId).run();
  },

  async completeCycle(db: D1Database, sessionId: string, cycleId: string): Promise<void> {
    await db.prepare("UPDATE maintenance_cycles SET state = '完了' WHERE id = ?1 AND session_id = ?2").bind(cycleId, sessionId).run();
  },

  async addRecord(db: D1Database, sessionId: string, cycleId: string, summary: string): Promise<MaintenanceRecordRow> {
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO maintenance_records (id, session_id, cycle_id, summary, state) VALUES (?1, ?2, ?3, ?4, '受付')")
      .bind(id, sessionId, cycleId, summary)
      .run();
    const created = await db.prepare("SELECT * FROM maintenance_records WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<MaintenanceRecordRow>();
    if (!created) throw new Error("failed to add record");
    return created;
  },

  async listRecords(db: D1Database, sessionId: string, cycleId: string): Promise<MaintenanceRecordRow[]> {
    const res = await db.prepare("SELECT * FROM maintenance_records WHERE cycle_id = ?1 AND session_id = ?2").bind(cycleId, sessionId).all<MaintenanceRecordRow>();
    return res.results ?? [];
  },

  async updateRecordState(db: D1Database, sessionId: string, recordId: string, state: string): Promise<void> {
    await db.prepare("UPDATE maintenance_records SET state = ?1 WHERE id = ?2 AND session_id = ?3").bind(state, recordId, sessionId).run();
  },
};
