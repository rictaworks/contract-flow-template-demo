import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import { ProfileValidator } from "../domain/profileValidator";
import { FlowDeriver } from "../domain/flowDeriver";
import { ProjectRepository } from "../db/repositories/projectRepository";
import { assertNonEmptyString, assertProfile, ValidationError } from "../lib/validation";
import { isHoneypotTriggered } from "../lib/honeypot";
import { STRINGS } from "../strings/ja";

export const profileRoutes = new Hono<AppEnv>();

function flowPreview(flow: ReturnType<typeof FlowDeriver.derive>) {
  return flow.phases.map((p) => ({
    code: p.code,
    name: p.name,
    gateKind: p.gateKind,
    contractSegment: p.contractSegment ?? null,
    appliedRules: p.appliedRules,
    requiredDeliverableCount: p.deliverables.filter((d) => d.requirement === "必須").length,
    criterionCount: p.criteria.length,
  }));
}

profileRoutes.post("/profile/validate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (isHoneypotTriggered(body)) return c.json({ error: STRINGS.errors.honeypotTriggered }, 400);

  let profile;
  try {
    profile = assertProfile(body);
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: STRINGS.errors.invalidProfileField }, 400);
    throw e;
  }

  const result = ProfileValidator.validate(profile);
  if (!result.accepted) {
    return c.json({ accepted: false, rejection: result.rejection }, 200);
  }
  const flow = FlowDeriver.derive(profile, result.warnings);
  return c.json({ accepted: true, warnings: result.warnings, preview: flowPreview(flow) });
});

profileRoutes.post("/profile", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (isHoneypotTriggered(body)) return c.json({ error: STRINGS.errors.honeypotTriggered }, 400);

  let profile;
  let label: string;
  try {
    profile = assertProfile(body);
    label = typeof (body as Record<string, unknown>).label === "string" ? ((body as Record<string, unknown>).label as string) : "";
    assertNonEmptyString(label.length > 0 ? label : "無題の案件", "label");
  } catch (e) {
    if (e instanceof ValidationError) return c.json({ error: STRINGS.errors.invalidProfileField }, 400);
    throw e;
  }

  const result = ProfileValidator.validate(profile);
  if (!result.accepted) {
    return c.json({ error: STRINGS.errors.profileRejected, rejection: result.rejection }, 400);
  }

  const flow = FlowDeriver.derive(profile, result.warnings);
  const sessionId = c.get("sessionId");
  const project = await ProjectRepository.create(c.env.DB, sessionId, label || "無題の案件", flow);
  return c.json({ projectId: project.id }, 201);
});
