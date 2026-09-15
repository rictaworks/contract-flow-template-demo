import { buildAppShell } from "./components/layout";
import { Router } from "./router";
import { h } from "./dom";
import { renderProfileInputPage } from "./pages/profileInputPage";
import { renderFlowOverviewPage } from "./pages/flowOverviewPage";
import { renderPhaseDetailPage } from "./pages/phaseDetailPage";
import { renderChangeRequestPage } from "./pages/changeRequestPage";
import { renderHistoryPage } from "./pages/historyPage";

const root = document.getElementById("app");
if (!root) throw new Error("app root element not found");

const { outlet } = buildAppShell(root);
const router = new Router(outlet, (target) => {
  target.appendChild(h("p", {}, ["404"]));
});

router
  .add("/", (_params, target) => renderProfileInputPage(target, router))
  .add("/flow", (_params, target) => renderFlowOverviewPage(target, router))
  .add("/phases/:id", (params, target) => renderPhaseDetailPage(target, router, params.id ?? ""))
  .add("/change-requests", (_params, target) => renderChangeRequestPage(target, router))
  .add("/history", (_params, target) => renderHistoryPage(target, router))
  .start();
