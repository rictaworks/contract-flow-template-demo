import { h, clear } from "../dom";
import { STRINGS } from "../strings/ja";
import { api, ApiError } from "../net/client";
import { getCurrentProjectId } from "../state";
import { openConfirmDialog, openFormDialog, showNotice } from "../components/dialog";
import { DELIVERABLE_STATE_OPTIONS, ROLE_OPTIONS, MAINTENANCE_STAGE_ORDER } from "../masterOptions";
import type { Router } from "../router";

interface Deliverable {
  id: string;
  name: string;
  requirement: "必須" | "任意";
  recurring: boolean;
  ownerRole: string;
  state: string;
}

interface Criterion {
  id: string;
  text: string;
  level: "必須" | "推奨";
  autoAttached: boolean;
  satisfied: boolean;
  note: string | null;
}

interface Approval {
  id: string;
  approverRole: string;
  approvedOn: string;
}

interface GateReview {
  verdict: "通過" | "条件付き通過" | "不通過";
  unmetRequired: string[];
  unmetRecommended: string[];
  reviewedAt: string;
}

interface MaintenanceCycle {
  id: string;
  cycleNo: number;
  stage: string;
  state: string;
}

interface MaintenanceRecord {
  id: string;
  summary: string;
  state: string;
}

interface PhaseDetailResponse {
  phase: { id: string; code: string; name: string; gateKind: string; contractSegment: string | null; state: string };
  deliverables: Deliverable[];
  criteria: Criterion[];
  approvals: Approval[];
  appliedRules: string[];
  latestGateReview: GateReview | null;
  maintenance: { cycle: MaintenanceCycle | null; records: MaintenanceRecord[] } | null;
}

interface FlowPhaseListItem {
  id: string;
  code: string;
  name: string;
}

export async function renderPhaseDetailPage(outlet: HTMLElement, router: Router, phaseId: string): Promise<void> {
  clear(outlet);
  outlet.appendChild(h("p", {}, [STRINGS.common.loading]));

  const load = async () => {
    try {
      return await api.get<PhaseDetailResponse>(`/api/phases/${phaseId}`);
    } catch (e) {
      clear(outlet);
      outlet.appendChild(h("p", { className: "notice-error" }, [e instanceof ApiError ? e.message : STRINGS.common.error]));
      return null;
    }
  };

  const detail = await load();
  if (!detail) return;
  renderDetail(outlet, router, phaseId, detail, () => renderPhaseDetailPage(outlet, router, phaseId));
}

function renderDetail(
  outlet: HTMLElement,
  router: Router,
  phaseId: string,
  detail: PhaseDetailResponse,
  reload: () => Promise<void>,
): void {
  clear(outlet);
  const { phase } = detail;

  outlet.appendChild(
    h("h2", {}, [
      STRINGS.phaseDetail.heading,
      h("span", { className: "project-label" }, [` — ${phase.code} ${phase.name}`]),
      phase.contractSegment ? h("span", { className: "badge" }, [phase.contractSegment]) : null,
    ]),
  );

  outlet.appendChild(
    h("div", { className: "card" }, [
      h("p", {}, [`${STRINGS.flowOverview.contractSegmentLabel}: ${phase.contractSegment ?? "-"}`]),
      h("p", {}, [`${phase.state}`]),
      h(
        "div",
        { className: "applied-rules" },
        [STRINGS.flowOverview.appliedRulesLabel + ": ", ...detail.appliedRules.map((r) => h("span", { className: "badge" }, [r]))],
      ),
    ]),
  );

  outlet.appendChild(buildDeliverablesSection(phaseId, detail.deliverables, reload));
  outlet.appendChild(buildCriteriaSection(phaseId, detail.criteria, reload));
  outlet.appendChild(buildApprovalsSection(phase, detail.approvals, reload));
  outlet.appendChild(buildGateSection(phaseId, detail.latestGateReview, router, reload));
  outlet.appendChild(buildTransitionSection(router, phaseId, reload));

  if (phase.code === "P15" && detail.maintenance) {
    outlet.appendChild(buildMaintenanceSection(phaseId, detail.maintenance, reload));
  }

  outlet.appendChild(buildCarryoverSection(phaseId));
}

function buildDeliverablesSection(phaseId: string, deliverables: Deliverable[], reload: () => Promise<void>): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.deliverablesHeading])]);
  const table = h("table", {});
  const tbody = h("tbody", {});
  for (const d of deliverables) {
    const select = h("select", {});
    for (const opt of DELIVERABLE_STATE_OPTIONS) {
      const optionEl = h("option", { value: opt.value }, [opt.label]) as HTMLOptionElement;
      if (opt.value === d.state) optionEl.selected = true;
      select.appendChild(optionEl);
    }
    select.addEventListener("change", async () => {
      try {
        await api.patch(`/api/deliverables/${d.id}`, { state: (select as HTMLSelectElement).value });
        await reload();
      } catch (e) {
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    tbody.appendChild(
      h("tr", {}, [
        h("td", {}, [d.name, d.recurring ? h("span", { className: "badge" }, [STRINGS.phaseDetail.recurringBadge]) : null]),
        h("td", {}, [d.requirement === "必須" ? STRINGS.phaseDetail.requirementRequired : STRINGS.phaseDetail.requirementOptional]),
        h("td", {}, [d.ownerRole]),
        h("td", {}, [select]),
      ]),
    );
  }
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

function buildCriteriaSection(phaseId: string, criteria: Criterion[], reload: () => Promise<void>): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.criteriaHeading])]);
  const list = h("ul", { className: "criteria-list" });
  for (const c of criteria) {
    const checkbox = h("input", { type: "checkbox", id: `criterion-${c.id}` }) as HTMLInputElement;
    checkbox.checked = c.satisfied;
    checkbox.disabled = c.autoAttached;
    checkbox.addEventListener("change", async () => {
      try {
        await api.patch(`/api/criteria/${c.id}`, { satisfied: checkbox.checked });
        await reload();
      } catch (e) {
        checkbox.checked = !checkbox.checked;
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    list.appendChild(
      h("li", { className: "criteria-item" }, [
        checkbox,
        h("label", { for: `criterion-${c.id}` }, [c.text]),
        h("span", { className: "badge" }, [c.level === "必須" ? STRINGS.phaseDetail.levelRequired : STRINGS.phaseDetail.levelRecommended]),
        c.autoAttached ? h("span", { className: "badge badge-auto" }, [STRINGS.phaseDetail.autoAttachedBadge]) : null,
      ]),
    );
  }
  section.appendChild(list);
  return section;
}

function buildApprovalsSection(
  phase: PhaseDetailResponse["phase"],
  approvals: Approval[],
  reload: () => Promise<void>,
): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.approvalsHeading])]);
  if (phase.gateKind === "内部レビュー") {
    section.appendChild(h("p", {}, ["-"]));
    return section;
  }
  const list = h(
    "ul",
    {},
    approvals.map((a) => h("li", {}, [`${a.approverRole} / ${a.approvedOn}`])),
  );
  section.appendChild(list);

  const addButton = h("button", { type: "button", className: "button button-secondary" }, [STRINGS.phaseDetail.addApprovalButton]);
  addButton.addEventListener("click", async () => {
    const result = await openFormDialog({
      title: STRINGS.phaseDetail.addApprovalButton,
      submitLabel: STRINGS.common.save,
      fields: [
        { name: "approverRole", label: STRINGS.phaseDetail.approverRoleLabel, type: "select", options: ROLE_OPTIONS, required: true },
        { name: "approvedOn", label: STRINGS.phaseDetail.approvedOnLabel, type: "text", required: false },
      ],
    });
    if (!result) return;
    try {
      const body: Record<string, string> = { approverRole: result.approverRole ?? "" };
      if (result.approvedOn) body.approvedOn = result.approvedOn;
      await api.post(`/api/phases/${phase.id}/approvals`, body);
      await reload();
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });
  section.appendChild(addButton);
  return section;
}

function verdictLabel(verdict: string): string {
  if (verdict === "通過") return STRINGS.phaseDetail.verdictPass;
  if (verdict === "条件付き通過") return STRINGS.phaseDetail.verdictConditional;
  return STRINGS.phaseDetail.verdictFail;
}

function buildGateSection(
  phaseId: string,
  latestGateReview: GateReview | null,
  router: Router,
  reload: () => Promise<void>,
): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.gateHeading])]);

  const resultArea = h("div", { className: "gate-result" });
  if (latestGateReview) renderGateResult(resultArea, latestGateReview);
  section.appendChild(resultArea);

  const evaluateButton = h("button", { type: "button", className: "button button-primary" }, [STRINGS.phaseDetail.evaluateButton]);
  evaluateButton.addEventListener("click", async () => {
    try {
      const res = await api.post<{ verdict: GateReview }>(`/api/phases/${phaseId}/evaluate`);
      clear(resultArea);
      renderGateResult(resultArea, res.verdict);
      await reload();
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });
  section.appendChild(evaluateButton);
  return section;
}

function renderGateResult(container: HTMLElement, review: GateReview): void {
  const verdictClass =
    review.verdict === "通過" ? "verdict-pass" : review.verdict === "条件付き通過" ? "verdict-conditional" : "verdict-fail";
  container.appendChild(h("div", { className: `verdict-badge ${verdictClass}` }, [verdictLabel(review.verdict)]));
  if (review.unmetRequired.length > 0) {
    container.appendChild(
      h("div", {}, [
        h("strong", {}, [STRINGS.phaseDetail.unmetRequiredHeading]),
        h(
          "ul",
          {},
          review.unmetRequired.map((t) => h("li", {}, [t])),
        ),
      ]),
    );
  }
  if (review.unmetRecommended.length > 0) {
    container.appendChild(
      h("div", {}, [
        h("strong", {}, [STRINGS.phaseDetail.unmetRecommendedHeading]),
        h(
          "ul",
          {},
          review.unmetRecommended.map((t) => h("li", {}, [t])),
        ),
      ]),
    );
  }
}

function buildTransitionSection(router: Router, phaseId: string, reload: () => Promise<void>): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.transitionHeading])]);

  const advanceButton = h("button", { type: "button", className: "button button-primary" }, [STRINGS.phaseDetail.advanceButton]);
  advanceButton.addEventListener("click", async () => {
    try {
      const res = await api.post<{ nextPhaseId: string | null }>(`/api/phases/${phaseId}/advance`);
      if (res.nextPhaseId) router.navigate(`/phases/${res.nextPhaseId}`);
      else router.navigate("/flow");
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });

  const rollbackButton = h("button", { type: "button", className: "button button-secondary" }, [STRINGS.phaseDetail.rollbackButton]);
  rollbackButton.addEventListener("click", async () => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;
    let targetOptions: { value: string; label: string }[] = [];
    try {
      const flow = await api.get<{ phases: FlowPhaseListItem[] }>(`/api/projects/${projectId}/flow`);
      targetOptions = flow.phases.filter((p) => p.id !== phaseId).map((p) => ({ value: p.id, label: `${p.code} ${p.name}` }));
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      return;
    }
    const result = await openFormDialog({
      title: STRINGS.phaseDetail.rollbackDialogTitle,
      submitLabel: STRINGS.phaseDetail.rollbackButton,
      fields: [
        { name: "targetPhaseId", label: STRINGS.phaseDetail.rollbackTargetLabel, type: "select", options: targetOptions, required: true },
        { name: "reason", label: STRINGS.phaseDetail.rollbackReasonLabel, type: "textarea", required: true },
      ],
    });
    if (!result) return;
    try {
      await api.post(`/api/projects/${projectId}/rollback`, { targetPhaseId: result.targetPhaseId, reason: result.reason });
      router.navigate(`/phases/${result.targetPhaseId}`);
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });

  const abortButton = h("button", { type: "button", className: "button button-danger" }, [STRINGS.phaseDetail.abortButton]);
  abortButton.addEventListener("click", async () => {
    const projectId = getCurrentProjectId();
    if (!projectId) return;
    const confirmed = await openConfirmDialog({
      title: STRINGS.phaseDetail.abortDialogTitle,
      message: STRINGS.phaseDetail.abortDialogTitle,
      confirmLabel: STRINGS.phaseDetail.abortButton,
    });
    if (!confirmed) return;
    const result = await openFormDialog({
      title: STRINGS.phaseDetail.abortDialogTitle,
      submitLabel: STRINGS.phaseDetail.abortButton,
      fields: [{ name: "reason", label: STRINGS.phaseDetail.abortReasonLabel, type: "textarea", required: true }],
    });
    if (!result) return;
    try {
      await api.post(`/api/projects/${projectId}/abort`, { reason: result.reason });
      router.navigate("/flow");
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });

  section.appendChild(advanceButton);
  section.appendChild(rollbackButton);
  section.appendChild(abortButton);
  return section;
}

function buildMaintenanceSection(
  phaseId: string,
  maintenance: { cycle: MaintenanceCycle | null; records: MaintenanceRecord[] },
  reload: () => Promise<void>,
): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.maintenanceHeading])]);

  if (!maintenance.cycle) {
    section.appendChild(h("p", {}, [STRINGS.phaseDetail.noMaintenanceCycle]));
    const startButton = h("button", { type: "button", className: "button button-primary" }, [STRINGS.phaseDetail.maintenanceStartButton]);
    startButton.addEventListener("click", async () => {
      try {
        await api.post(`/api/phases/${phaseId}/maintenance/start`);
        await reload();
      } catch (e) {
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    section.appendChild(startButton);
    return section;
  }

  const cycle = maintenance.cycle;
  section.appendChild(h("p", {}, [`${STRINGS.phaseDetail.maintenanceStageLabel}: ${cycle.stage}（周期${cycle.cycleNo}）`]));

  const currentIndex = MAINTENANCE_STAGE_ORDER.indexOf(cycle.stage);
  const nextStage = MAINTENANCE_STAGE_ORDER[currentIndex + 1];
  if (nextStage) {
    const advanceStageButton = h("button", { type: "button", className: "button button-secondary" }, [
      STRINGS.phaseDetail.maintenanceAdvanceStageButton,
    ]);
    advanceStageButton.addEventListener("click", async () => {
      try {
        await api.post(`/api/maintenance-cycles/${cycle.id}/advance-stage`, { stage: nextStage });
        await reload();
      } catch (e) {
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    section.appendChild(advanceStageButton);
  }

  const recordInput = h("input", { type: "text", placeholder: STRINGS.phaseDetail.maintenanceRecordSummaryLabel }) as HTMLInputElement;
  const addRecordButton = h("button", { type: "button", className: "button button-secondary" }, [
    STRINGS.phaseDetail.maintenanceRecordAddButton,
  ]);
  addRecordButton.addEventListener("click", async () => {
    if (!recordInput.value.trim()) return;
    try {
      await api.post(`/api/maintenance-cycles/${cycle.id}/records`, { summary: recordInput.value });
      recordInput.value = "";
      await reload();
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });
  section.appendChild(h("div", { className: "form-field" }, [recordInput, addRecordButton]));

  const recordsList = h("ul", {}, [
    h("h4", {}, [STRINGS.phaseDetail.maintenanceRecordsHeading]),
    ...maintenance.records.map((r) => h("li", {}, [`${r.summary} — ${r.state}`])),
  ]);
  section.appendChild(recordsList);

  const completeButton = h("button", { type: "button", className: "button button-primary" }, [
    STRINGS.phaseDetail.maintenanceCompleteCycleButton,
  ]);
  completeButton.addEventListener("click", async () => {
    try {
      await api.post(`/api/phases/${phaseId}/maintenance/complete-cycle`);
      await reload();
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });
  section.appendChild(completeButton);

  return section;
}

function buildCarryoverSection(phaseId: string): HTMLElement {
  const section = h("section", { className: "card" }, [h("h3", {}, [STRINGS.phaseDetail.carryoverHeading])]);
  const projectId = getCurrentProjectId();
  const list = h("ul", {});
  section.appendChild(list);
  if (!projectId) return section;

  void api
    .get<{ issues: { id: string; text: string; state: string }[] }>(`/api/projects/${projectId}/carryover-issues`)
    .then((res) => {
      clear(list);
      for (const issue of res.issues.filter((i) => i.state === "未解決")) {
        const resolveButton = h("button", { type: "button", className: "button button-secondary" }, [
          STRINGS.phaseDetail.carryoverResolveButton,
        ]);
        resolveButton.addEventListener("click", async () => {
          try {
            await api.post(`/api/carryover-issues/${issue.id}/resolve`, { resolvedPhaseId: phaseId });
            resolveButton.disabled = true;
          } catch (e) {
            showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
          }
        });
        list.appendChild(h("li", {}, [issue.text, resolveButton]));
      }
    })
    .catch(() => {
      /* 表示のみのため失敗しても致命的ではない */
    });

  return section;
}
