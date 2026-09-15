import { h, clear } from "../dom";
import { STRINGS } from "../strings/ja";
import { api, ApiError } from "../net/client";
import { getCurrentProjectId } from "../state";
import { openFormDialog, showNotice } from "../components/dialog";
import { HONEYPOT_FIELD_NAME } from "../net/honeypot";
import type { Router } from "../router";

interface ChangeRequestItem {
  id: string;
  title: string;
  state: string;
  raisedPhaseId: string;
  affectsEffort: boolean;
  affectsSchedule: boolean;
  affectsCost: boolean;
  requiresAmendment: boolean;
  reason: string | null;
}

const STATE_LABELS: Record<string, string> = {
  起票: STRINGS.changeRequest.state起票,
  影響評価中: STRINGS.changeRequest.state影響評価中,
  合意待ち: STRINGS.changeRequest.state合意待ち,
  反映済: STRINGS.changeRequest.state反映済,
  却下: STRINGS.changeRequest.state却下,
};

async function fetchAllDeliverables(projectId: string): Promise<{ value: string; label: string }[]> {
  const flow = await api.get<{ phases: { id: string; code: string; name: string }[] }>(`/api/projects/${projectId}/flow`);
  const results: { value: string; label: string }[] = [];
  for (const phase of flow.phases) {
    const detail = await api.get<{ deliverables: { id: string; name: string }[] }>(`/api/phases/${phase.id}`);
    for (const d of detail.deliverables) {
      results.push({ value: d.id, label: `${phase.code} ${d.name}` });
    }
  }
  return results;
}

export async function renderChangeRequestPage(outlet: HTMLElement, router: Router): Promise<void> {
  clear(outlet);
  const projectId = getCurrentProjectId();
  if (!projectId) {
    outlet.appendChild(h("p", {}, [STRINGS.changeRequest.noProjectSelected]));
    return;
  }

  outlet.appendChild(h("h2", {}, [STRINGS.changeRequest.heading]));

  const listSection = h("section", { className: "card" }, [h("h3", {}, [STRINGS.changeRequest.listHeading]), h("p", {}, [STRINGS.common.loading])]);
  outlet.appendChild(listSection);

  const raiseSection = h("section", { className: "card" }, [h("h3", {}, [STRINGS.changeRequest.raiseHeading])]);
  const titleInput = h("input", { type: "text" }) as HTMLInputElement;
  const honeypotInput = h("input", {
    type: "text",
    name: HONEYPOT_FIELD_NAME,
    tabindex: "-1",
    autocomplete: "off",
    "aria-hidden": "true",
    className: "honeypot-field",
  }) as HTMLInputElement;
  const raiseButton = h("button", { type: "button", className: "button button-primary" }, [STRINGS.changeRequest.raiseButton]);
  raiseSection.appendChild(h("label", { className: "form-field" }, [STRINGS.changeRequest.titleLabel, titleInput]));
  raiseSection.appendChild(honeypotInput);
  raiseSection.appendChild(raiseButton);
  outlet.appendChild(raiseSection);

  const reload = async () => {
    let items: ChangeRequestItem[] = [];
    try {
      const res = await api.get<{ changeRequests: ChangeRequestItem[] }>(`/api/projects/${projectId}/change-requests`);
      items = res.changeRequests;
    } catch (e) {
      clear(listSection);
      listSection.appendChild(h("h3", {}, [STRINGS.changeRequest.listHeading]));
      listSection.appendChild(h("p", { className: "notice-error" }, [e instanceof ApiError ? e.message : STRINGS.common.error]));
      return;
    }
    clear(listSection);
    listSection.appendChild(h("h3", {}, [STRINGS.changeRequest.listHeading]));
    for (const item of items) {
      listSection.appendChild(buildChangeRequestCard(projectId, item, reload));
    }
  };

  raiseButton.addEventListener("click", async () => {
    if (!titleInput.value.trim()) return;
    try {
      await api.post(`/api/projects/${projectId}/change-requests`, {
        title: titleInput.value,
        [HONEYPOT_FIELD_NAME]: honeypotInput.value,
      });
      titleInput.value = "";
      await reload();
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });

  await reload();
}

function buildChangeRequestCard(projectId: string, item: ChangeRequestItem, reload: () => Promise<void>): HTMLElement {
  const card = h("div", { className: "banner" }, [
    h("strong", {}, [item.title]),
    h("span", { className: "badge" }, [STATE_LABELS[item.state] ?? item.state]),
  ]);

  if (item.state === "起票" || item.state === "影響評価中") {
    const impactSection = h("div", { className: "impact-section" }, [h("h4", {}, [STRINGS.changeRequest.impactHeading])]);
    const effortCheckbox = h("input", { type: "checkbox", id: `effort-${item.id}` }) as HTMLInputElement;
    const scheduleCheckbox = h("input", { type: "checkbox", id: `schedule-${item.id}` }) as HTMLInputElement;
    const costCheckbox = h("input", { type: "checkbox", id: `cost-${item.id}` }) as HTMLInputElement;
    effortCheckbox.checked = item.affectsEffort;
    scheduleCheckbox.checked = item.affectsSchedule;
    costCheckbox.checked = item.affectsCost;

    const deliverableSelect = h("select", { multiple: "true" }) as HTMLSelectElement;
    void fetchAllDeliverables(projectId).then((options) => {
      for (const opt of options) {
        deliverableSelect.appendChild(h("option", { value: opt.value }, [opt.label]));
      }
    });

    impactSection.appendChild(
      h("label", {}, [effortCheckbox, STRINGS.changeRequest.affectsEffortLabel]),
    );
    impactSection.appendChild(
      h("label", {}, [scheduleCheckbox, STRINGS.changeRequest.affectsScheduleLabel]),
    );
    impactSection.appendChild(h("label", {}, [costCheckbox, STRINGS.changeRequest.affectsCostLabel]));
    impactSection.appendChild(h("label", { className: "form-field" }, [STRINGS.changeRequest.impactDeliverablesLabel, deliverableSelect]));

    const saveButton = h("button", { type: "button", className: "button button-secondary" }, [STRINGS.changeRequest.saveImpactButton]);
    saveButton.addEventListener("click", async () => {
      const impactDeliverableIds = Array.from(deliverableSelect.selectedOptions).map((o) => o.value);
      try {
        await api.patch(`/api/change-requests/${item.id}/impact`, {
          affectsEffort: effortCheckbox.checked,
          affectsSchedule: scheduleCheckbox.checked,
          affectsCost: costCheckbox.checked,
          impactDeliverableIds,
        });
        await reload();
      } catch (e) {
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    impactSection.appendChild(saveButton);
    card.appendChild(impactSection);
  }

  if (item.state === "合意待ち") {
    const agreementSection = h("div", { className: "impact-section" }, [h("h4", {}, [STRINGS.changeRequest.agreementHeading])]);
    if (item.affectsSchedule || item.affectsCost) {
      agreementSection.appendChild(h("p", { className: "field-notice" }, [STRINGS.changeRequest.amendmentNotice]));
    }
    const agreeButton = h("button", { type: "button", className: "button button-primary" }, [STRINGS.changeRequest.agreeButton]);
    agreeButton.addEventListener("click", async () => {
      try {
        await api.post(`/api/change-requests/${item.id}/agree`);
        await reload();
      } catch (e) {
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    const rejectButton = h("button", { type: "button", className: "button button-danger" }, [STRINGS.changeRequest.rejectButton]);
    rejectButton.addEventListener("click", async () => {
      const result = await openFormDialog({
        title: STRINGS.changeRequest.rejectButton,
        submitLabel: STRINGS.changeRequest.rejectButton,
        fields: [{ name: "reason", label: STRINGS.changeRequest.rejectReasonLabel, type: "textarea", required: true }],
      });
      if (!result) return;
      try {
        await api.post(`/api/change-requests/${item.id}/reject`, { reason: result.reason });
        await reload();
      } catch (e) {
        showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
      }
    });
    agreementSection.appendChild(agreeButton);
    agreementSection.appendChild(rejectButton);
    card.appendChild(agreementSection);
  }

  return card;
}
