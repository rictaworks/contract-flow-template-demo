import { STRINGS } from "../strings/ja";

// alert()/confirm()/prompt() は使用禁止（CLAUDE.md）。<dialog>要素で代替する。

export interface DialogField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface FormDialogOptions {
  title: string;
  fields: DialogField[];
  submitLabel?: string;
}

function buildFieldElement(field: DialogField): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "dialog-field";
  const span = document.createElement("span");
  span.textContent = field.label;
  wrapper.appendChild(span);

  let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
  } else if (field.type === "select") {
    const select = document.createElement("select");
    for (const opt of field.options ?? []) {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      select.appendChild(optionEl);
    }
    input = select;
  } else {
    input = document.createElement("input");
    input.type = "text";
  }
  input.name = field.name;
  if (field.required) input.required = true;
  wrapper.appendChild(input);
  return wrapper;
}

export function openFormDialog(options: FormDialogOptions): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-dialog";

    const form = document.createElement("form");
    form.method = "dialog";

    const heading = document.createElement("h2");
    heading.textContent = options.title;
    form.appendChild(heading);

    for (const field of options.fields) {
      form.appendChild(buildFieldElement(field));
    }

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "button button-secondary";
    cancelButton.textContent = STRINGS.dialog.cancelLabel;
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "button button-primary";
    submitButton.textContent = options.submitLabel ?? STRINGS.dialog.confirmLabel;
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    form.appendChild(actions);

    dialog.appendChild(form);
    document.body.appendChild(dialog);

    let settled = false;
    const finish = (value: Record<string, string> | null) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      resolve(value);
    };

    cancelButton.addEventListener("click", () => finish(null));
    dialog.addEventListener("cancel", () => finish(null));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const result: Record<string, string> = {};
      for (const field of options.fields) {
        result[field.name] = String(data.get(field.name) ?? "");
      }
      finish(result);
    });

    dialog.showModal();
  });
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

export function openConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-dialog";

    const heading = document.createElement("h2");
    heading.textContent = options.title;
    const message = document.createElement("p");
    message.textContent = options.message;

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "button button-secondary";
    cancelButton.textContent = STRINGS.dialog.cancelLabel;
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "button button-primary";
    confirmButton.textContent = options.confirmLabel ?? STRINGS.dialog.confirmLabel;
    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);

    dialog.appendChild(heading);
    dialog.appendChild(message);
    dialog.appendChild(actions);
    document.body.appendChild(dialog);

    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      resolve(value);
    };

    cancelButton.addEventListener("click", () => finish(false));
    dialog.addEventListener("cancel", () => finish(false));
    confirmButton.addEventListener("click", () => finish(true));

    dialog.showModal();
  });
}

export function showNotice(message: string, kind: "info" | "error" = "info"): void {
  const container = document.getElementById("notice-region");
  if (!container) return;
  const notice = document.createElement("div");
  notice.className = `notice notice-${kind}`;
  notice.textContent = message;
  container.appendChild(notice);
  window.setTimeout(() => notice.remove(), 5000);
}
