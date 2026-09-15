import { h, clear } from "../dom";
import { STRINGS } from "../strings/ja";
import { api, ApiError } from "../net/client";
import { getCurrentProjectId } from "../state";
import type { Router } from "../router";

interface HistoryResponse {
  transitions: { id: string; kind: string; fromPhaseName: string | null; toPhaseName: string | null; reason: string | null; occurredAt: string }[];
  gateReviews: { id: string; phaseName: string | null; verdict: string; unmetRequired: string[]; unmetRecommended: string[]; reviewedAt: string }[];
  changeRequests: { id: string; title: string; state: string }[];
}

export async function renderHistoryPage(outlet: HTMLElement, _router: Router): Promise<void> {
  clear(outlet);
  const projectId = getCurrentProjectId();
  if (!projectId) {
    outlet.appendChild(h("p", {}, [STRINGS.history.noProjectSelected]));
    return;
  }

  outlet.appendChild(h("h2", {}, [STRINGS.history.heading]));
  outlet.appendChild(h("p", {}, [STRINGS.common.loading]));

  let data: HistoryResponse;
  try {
    data = await api.get<HistoryResponse>(`/api/projects/${projectId}/history`);
  } catch (e) {
    clear(outlet);
    outlet.appendChild(h("h2", {}, [STRINGS.history.heading]));
    outlet.appendChild(h("p", { className: "notice-error" }, [e instanceof ApiError ? e.message : STRINGS.common.error]));
    return;
  }

  clear(outlet);
  outlet.appendChild(h("h2", {}, [STRINGS.history.heading]));

  outlet.appendChild(
    h("section", { className: "card" }, [
      h("h3", {}, [STRINGS.history.transitionsHeading]),
      h(
        "ul",
        {},
        data.transitions.map((t) =>
          h("li", {}, [`${t.occurredAt} — ${t.kind}: ${t.fromPhaseName ?? "-"} → ${t.toPhaseName ?? "-"}${t.reason ? `（${t.reason}）` : ""}`]),
        ),
      ),
    ]),
  );

  outlet.appendChild(
    h("section", { className: "card" }, [
      h("h3", {}, [STRINGS.history.gateReviewsHeading]),
      h(
        "ul",
        {},
        data.gateReviews.map((g) => h("li", {}, [`${g.reviewedAt} — ${g.phaseName ?? "-"}: ${g.verdict}`])),
      ),
    ]),
  );

  outlet.appendChild(
    h("section", { className: "card" }, [
      h("h3", {}, [STRINGS.history.changeRequestsHeading]),
      h(
        "ul",
        {},
        data.changeRequests.map((cr) => h("li", {}, [`${cr.title} — ${cr.state}`])),
      ),
    ]),
  );
}
