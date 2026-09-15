import { h, clear } from "../dom";
import { STRINGS } from "../strings/ja";
import { api, ApiError } from "../net/client";
import { getCurrentProjectId } from "../state";
import type { Router } from "../router";

interface PhaseSummary {
  id: string;
  seq: number;
  code: string;
  name: string;
  gateKind: string;
  contractSegment: string | null;
  state: string;
  isCurrent: boolean;
  requiredDeliverableTotal: number;
  requiredDeliverableSatisfied: number;
  criterionTotal: number;
  criterionAchieved: number;
}

interface FlowResponse {
  project: {
    id: string;
    label: string;
    contractType: string;
    workType: string;
    scale: string;
    requirementCertainty: string;
    state: string;
    currentPhaseId: string | null;
  };
  warnings: { ruleCode: string; message: string; recommendation: string }[];
  phases: PhaseSummary[];
  carryoverOpenCount: number;
  changeRequestUnagreedCount: number;
}

export async function renderFlowOverviewPage(outlet: HTMLElement, router: Router): Promise<void> {
  clear(outlet);
  const projectId = getCurrentProjectId();
  if (!projectId) {
    outlet.appendChild(h("p", {}, [STRINGS.flowOverview.noProjectSelected]));
    return;
  }

  outlet.appendChild(h("p", {}, [STRINGS.common.loading]));

  let flow: FlowResponse;
  try {
    flow = await api.get<FlowResponse>(`/api/projects/${projectId}/flow`);
  } catch (e) {
    clear(outlet);
    outlet.appendChild(h("p", { className: "notice-error" }, [e instanceof ApiError ? e.message : STRINGS.common.error]));
    return;
  }

  clear(outlet);
  outlet.appendChild(h("h2", {}, [STRINGS.flowOverview.heading, h("span", { className: "project-label" }, [` — ${flow.project.label}`])]));

  const summaryBar = h("div", { className: "summary-bar" }, [
    h("div", { className: "summary-item" }, [STRINGS.flowOverview.carryoverCountLabel, h("strong", {}, [String(flow.carryoverOpenCount)])]),
    h("div", { className: "summary-item" }, [
      STRINGS.flowOverview.changeRequestCountLabel,
      h("strong", {}, [String(flow.changeRequestUnagreedCount)]),
    ]),
  ]);
  outlet.appendChild(summaryBar);

  if (flow.warnings.length > 0) {
    const warningsSection = h("section", { className: "card" }, [h("h3", {}, [STRINGS.flowOverview.warningsHeading])]);
    for (const warning of flow.warnings) {
      warningsSection.appendChild(h("div", { className: "banner banner-warning" }, [h("p", {}, [warning.message])]));
    }
    outlet.appendChild(warningsSection);
  }

  const flowGrid = h("div", { className: "flow-grid" });
  for (const phase of flow.phases) {
    const card = h(
      "button",
      { type: "button", className: `phase-card${phase.isCurrent ? " phase-card-current" : ""}` },
      [
        h("div", { className: "phase-card-code" }, [phase.code]),
        h("div", { className: "phase-card-name" }, [phase.name]),
        phase.contractSegment ? h("span", { className: "badge" }, [phase.contractSegment]) : null,
        h("div", { className: "phase-card-gate" }, [phase.gateKind]),
        h("div", { className: `phase-card-state phase-state-${phase.state}` }, [phase.state]),
        h("div", { className: "phase-card-progress" }, [
          `${STRINGS.flowOverview.deliverableProgressLabel} ${phase.requiredDeliverableSatisfied}/${phase.requiredDeliverableTotal}`,
        ]),
        h("div", { className: "phase-card-progress" }, [
          `${STRINGS.flowOverview.criterionProgressLabel} ${phase.criterionAchieved}/${phase.criterionTotal}`,
        ]),
        phase.isCurrent ? h("span", { className: "badge badge-current" }, [STRINGS.flowOverview.currentPhaseLabel]) : null,
      ],
    );
    card.addEventListener("click", () => router.navigate(`/phases/${phase.id}`));
    flowGrid.appendChild(card);
  }
  outlet.appendChild(flowGrid);
}
