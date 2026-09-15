import type { ProjectRow, ProjectWarningRow } from "../types";
import { nowIso } from "../../lib/time";
import type { FlowInstance } from "../../domain/types";

export const ProjectRepository = {
  async create(db: D1Database, sessionId: string, label: string, flow: FlowInstance): Promise<ProjectRow> {
    const id = crypto.randomUUID();
    const createdAt = nowIso();
    const firstPhaseId = flow.phases[0] ? deterministicPhaseId(id, flow.phases[0].key) : null;

    const statements: D1PreparedStatement[] = [];

    statements.push(
      db
        .prepare(
          `INSERT INTO projects (id, session_id, label, contract_type, work_type, scale, requirement_certainty, state, current_phase_id, aborted_reason, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, '進行中', ?8, NULL, ?9)`,
        )
        .bind(id, sessionId, label, flow.profile.contractType, flow.profile.workType, flow.profile.scale, flow.profile.requirementCertainty, firstPhaseId, createdAt),
    );

    for (const w of flow.warnings) {
      statements.push(
        db
          .prepare(`INSERT INTO project_warnings (id, session_id, project_id, rule_code, message, recommendation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`)
          .bind(crypto.randomUUID(), sessionId, id, w.ruleCode, w.message, w.recommendation),
      );
    }

    for (const phase of flow.phases) {
      const phaseId = deterministicPhaseId(id, phase.key);
      const state = phase.key === flow.phases[0]?.key ? "進行中" : "未着手";
      statements.push(
        db
          .prepare(
            `INSERT INTO phases (id, session_id, project_id, seq, phase_code, name, gate_kind, contract_segment, state)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
          )
          .bind(phaseId, sessionId, id, phase.orderKey, phase.code, phase.name, phase.gateKind, phase.contractSegment ?? null, state),
      );

      for (const ruleCode of phase.appliedRules) {
        statements.push(
          db
            .prepare(`INSERT INTO phase_rules (id, session_id, phase_id, rule_code, effect) VALUES (?1, ?2, ?3, ?4, ?5)`)
            .bind(crypto.randomUUID(), sessionId, phaseId, ruleCode, `${ruleCode} を適用`),
        );
      }

      for (const d of phase.deliverables) {
        statements.push(
          db
            .prepare(
              `INSERT INTO deliverables (id, session_id, phase_id, name, requirement, recurring, owner_role, state, origin_rule_code)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, '未作成', ?8)`,
            )
            .bind(crypto.randomUUID(), sessionId, phaseId, d.name, d.requirement, d.recurring ? 1 : 0, d.ownerRole, d.originRuleCode),
        );
      }

      for (const c of phase.criteria) {
        statements.push(
          db
            .prepare(
              `INSERT INTO criteria (id, session_id, phase_id, text, level, auto_attached, satisfied, note)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, NULL)`,
            )
            .bind(crypto.randomUUID(), sessionId, phaseId, c.text, c.level, c.autoAttached ? 1 : 0),
        );
      }
    }

    // D1 の batch は1回のラウンドトリップで全ステートメントを直列・原子的に実行するため、
    // 工程数×成果物・基準数ぶんの逐次 await によるレイテンシ増大を避けられる。
    await db.batch(statements);

    const created = await db.prepare("SELECT * FROM projects WHERE id = ?1 AND session_id = ?2").bind(id, sessionId).first<ProjectRow>();
    if (!created) throw new Error("failed to create project");
    return created;
  },

  async findById(db: D1Database, sessionId: string, projectId: string): Promise<ProjectRow | null> {
    return db.prepare("SELECT * FROM projects WHERE id = ?1 AND session_id = ?2").bind(projectId, sessionId).first<ProjectRow>();
  },

  async listWarnings(db: D1Database, sessionId: string, projectId: string): Promise<ProjectWarningRow[]> {
    const res = await db
      .prepare("SELECT * FROM project_warnings WHERE project_id = ?1 AND session_id = ?2")
      .bind(projectId, sessionId)
      .all<ProjectWarningRow>();
    return res.results ?? [];
  },

  async updateCurrentPhase(db: D1Database, sessionId: string, projectId: string, phaseId: string | null): Promise<void> {
    await db
      .prepare("UPDATE projects SET current_phase_id = ?1 WHERE id = ?2 AND session_id = ?3")
      .bind(phaseId, projectId, sessionId)
      .run();
  },

  async updateState(db: D1Database, sessionId: string, projectId: string, state: string, abortedReason: string | null = null): Promise<void> {
    await db
      .prepare("UPDATE projects SET state = ?1, aborted_reason = COALESCE(?2, aborted_reason) WHERE id = ?3 AND session_id = ?4")
      .bind(state, abortedReason, projectId, sessionId)
      .run();
  },
};

/** 案件内で決定的な工程IDを作る（案件ID＋工程キーのハッシュ）。 */
function deterministicPhaseId(projectId: string, phaseKey: string): string {
  return `${projectId}:${phaseKey}`;
}
