import { h, clear } from "../dom";
import { STRINGS } from "../strings/ja";
import { CONTRACT_TYPE_OPTIONS, WORK_TYPE_OPTIONS, SCALE_OPTIONS, CERTAINTY_OPTIONS } from "../masterOptions";
import { api, ApiError } from "../net/client";
import { HONEYPOT_FIELD_NAME } from "../net/honeypot";
import { setCurrentProjectId } from "../state";
import { showNotice } from "../components/dialog";
import type { Router } from "../router";

interface PreviewPhase {
  code: string;
  name: string;
  gateKind: string;
  contractSegment: string | null;
  appliedRules: string[];
  requiredDeliverableCount: number;
  criterionCount: number;
}

interface ProfileWarning {
  ruleCode: string;
  message: string;
  recommendation: string;
}

interface ValidateResponse {
  accepted: boolean;
  rejection?: { ruleCode: string; reason: string };
  warnings: ProfileWarning[];
  preview: PreviewPhase[];
}

function selectField(name: string, labelText: string, options: { value: string; label: string }[]): HTMLElement {
  const select = h("select", { name, id: `field-${name}` });
  for (const opt of options) {
    const optionEl = h("option", { value: opt.value }, [opt.label]);
    select.appendChild(optionEl);
  }
  const label = h("label", { className: "form-field", for: `field-${name}` }, [labelText, select]);
  return label;
}

function currentProfile(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    contractType: String(data.get("contractType")),
    workType: String(data.get("workType")),
    scale: String(data.get("scale")),
    requirementCertainty: String(data.get("requirementCertainty")),
  };
}

export function renderProfileInputPage(outlet: HTMLElement, router: Router): void {
  clear(outlet);

  const heading = h("h2", {}, [STRINGS.profileInput.heading]);

  const labelInput = h("input", { type: "text", name: "label", id: "field-label", placeholder: STRINGS.profileInput.labelPlaceholder });
  const labelField = h("label", { className: "form-field", for: "field-label" }, [
    STRINGS.profileInput.labelFieldLabel,
    labelInput,
    h("p", { className: "field-notice" }, [STRINGS.profileInput.labelFieldNotice]),
  ]);

  const honeypotInput = h("input", {
    type: "text",
    name: HONEYPOT_FIELD_NAME,
    id: `field-${HONEYPOT_FIELD_NAME}`,
    tabindex: "-1",
    autocomplete: "off",
    "aria-hidden": "true",
    className: "honeypot-field",
  });

  const form = h("form", { className: "card profile-form" }, [
    labelField,
    selectField("contractType", STRINGS.profileInput.contractType, CONTRACT_TYPE_OPTIONS),
    selectField("workType", STRINGS.profileInput.workType, WORK_TYPE_OPTIONS),
    selectField("scale", STRINGS.profileInput.scale, SCALE_OPTIONS),
    selectField("requirementCertainty", STRINGS.profileInput.requirementCertainty, CERTAINTY_OPTIONS),
    honeypotInput,
  ]) as HTMLFormElement;

  const previewButton = h("button", { type: "button", className: "button button-secondary" }, [STRINGS.profileInput.previewButton]);
  const registerButton = h("button", { type: "button", className: "button button-primary", disabled: true }, [
    STRINGS.profileInput.registerButton,
  ]) as HTMLButtonElement;
  const actions = h("div", { className: "dialog-actions" }, [previewButton, registerButton]);
  form.appendChild(actions);

  const previewSection = h("section", { className: "card preview-section" }, [
    h("h3", {}, [STRINGS.profileInput.previewHeading]),
    h("p", {}, [STRINGS.profileInput.noPreviewYet]),
  ]);

  outlet.appendChild(heading);
  outlet.appendChild(form);
  outlet.appendChild(previewSection);

  let lastValidation: ValidateResponse | null = null;

  previewButton.addEventListener("click", async () => {
    clear(previewSection);
    previewSection.appendChild(h("h3", {}, [STRINGS.profileInput.previewHeading]));
    previewSection.appendChild(h("p", {}, [STRINGS.common.loading]));
    registerButton.disabled = true;
    try {
      const result = await api.post<ValidateResponse>("/api/profile/validate", {
        ...currentProfile(form),
        [HONEYPOT_FIELD_NAME]: honeypotInput.value,
      });
      lastValidation = result;
      renderPreview(previewSection, result);
      registerButton.disabled = !result.accepted;
    } catch (e) {
      clear(previewSection);
      previewSection.appendChild(h("h3", {}, [STRINGS.profileInput.previewHeading]));
      previewSection.appendChild(h("p", { className: "notice-error" }, [e instanceof ApiError ? e.message : STRINGS.common.error]));
    }
  });

  registerButton.addEventListener("click", async () => {
    if (!lastValidation?.accepted) return;
    try {
      const created = await api.post<{ projectId: string }>("/api/profile", {
        ...currentProfile(form),
        label: labelInput.value,
        [HONEYPOT_FIELD_NAME]: honeypotInput.value,
      });
      setCurrentProjectId(created.projectId);
      router.navigate("/flow");
    } catch (e) {
      showNotice(e instanceof ApiError ? e.message : STRINGS.common.error, "error");
    }
  });
}

function renderPreview(section: HTMLElement, result: ValidateResponse): void {
  clear(section);
  section.appendChild(h("h3", {}, [STRINGS.profileInput.previewHeading]));

  if (!result.accepted) {
    section.appendChild(
      h("div", { className: "banner banner-error" }, [
        h("strong", {}, [STRINGS.profileInput.rejectedHeading]),
        h("p", {}, [result.rejection?.reason ?? ""]),
      ]),
    );
    return;
  }

  for (const warning of result.warnings) {
    section.appendChild(
      h("div", { className: "banner banner-warning" }, [
        h("strong", {}, [STRINGS.profileInput.warningHeading]),
        h("p", {}, [warning.message]),
        h("p", {}, [`${STRINGS.profileInput.recommendationPrefix}${warning.recommendation}`]),
      ]),
    );
  }

  const table = h("table", { className: "preview-table" });
  const thead = h("thead", {}, [
    h("tr", {}, [
      h("th", {}, [STRINGS.profileInput.previewPhaseColumn]),
      h("th", {}, [STRINGS.profileInput.previewGateColumn]),
    ]),
  ]);
  const tbody = h(
    "tbody",
    {},
    result.preview.map((phase) =>
      h("tr", {}, [
        h("td", {}, [phase.name, phase.contractSegment ? h("span", { className: "badge" }, [phase.contractSegment]) : null]),
        h("td", {}, [phase.gateKind]),
      ]),
    ),
  );
  table.appendChild(thead);
  table.appendChild(tbody);
  section.appendChild(table);
}
