import { Hono } from "hono";
import type { AppEnv, Bindings } from "./lib/env";
import { buildSessionCookie, newSessionId, parseSessionId } from "./lib/cookie";
import { touchSession } from "./db/sessionGuard";
import { profileRoutes } from "./routes/profile";
import { flowRoutes } from "./routes/flow";
import { phaseRoutes } from "./routes/phase";
import { changeRequestRoutes } from "./routes/changeRequest";
import { historyRoutes } from "./routes/history";

export const app = new Hono<AppEnv>();

app.use("/api/*", async (c, next) => {
  const cookieHeader = c.req.header("Cookie") ?? null;
  let sessionId = parseSessionId(cookieHeader);
  let isNew = false;
  if (!sessionId) {
    sessionId = newSessionId();
    isNew = true;
  }
  await touchSession(c.env.DB, sessionId);
  c.set("sessionId", sessionId);
  await next();
  if (isNew) {
    c.header("Set-Cookie", buildSessionCookie(sessionId, c.env.APP_ENV === "production"));
  }
});

app.route("/api", profileRoutes);
app.route("/api", flowRoutes);
app.route("/api", phaseRoutes);
app.route("/api", changeRequestRoutes);
app.route("/api", historyRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

// マスタ以外の全テーブル（requirements.md 19章）
const RESET_TABLES = [
  "transitions",
  "maintenance_records",
  "maintenance_cycles",
  "change_request_impacts",
  "change_requests",
  "carryover_issues",
  "gate_reviews",
  "approvals",
  "criteria",
  "deliverables",
  "phase_rules",
  "phases",
  "project_warnings",
  "projects",
  "sessions",
];

export async function runDailyReset(db: D1Database): Promise<void> {
  for (const table of RESET_TABLES) {
    await db.prepare(`DELETE FROM ${table}`).run();
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings): Promise<void> {
    await runDailyReset(env.DB);
  },
};
