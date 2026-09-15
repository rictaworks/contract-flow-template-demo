import { STRINGS } from "../strings/ja";

export interface AppShell {
  outlet: HTMLElement;
}

const NAV_ITEMS: { path: string; icon: string; label: string }[] = [
  { path: "#/", icon: "fa-file-pen", label: STRINGS.nav.profileInput },
  { path: "#/flow", icon: "fa-diagram-project", label: STRINGS.nav.flowOverview },
  { path: "#/change-requests", icon: "fa-file-circle-exclamation", label: STRINGS.nav.changeRequest },
  { path: "#/history", icon: "fa-clock-rotate-left", label: STRINGS.nav.history },
];

export function buildAppShell(root: HTMLElement): AppShell {
  root.innerHTML = "";

  const header = document.createElement("header");
  header.className = "app-header";

  const titleRow = document.createElement("div");
  titleRow.className = "app-title-row";
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-diagram-project";
  icon.setAttribute("aria-hidden", "true");
  const title = document.createElement("h1");
  title.textContent = STRINGS.app.title;
  titleRow.appendChild(icon);
  titleRow.appendChild(title);

  const nav = document.createElement("nav");
  nav.className = "app-nav";
  for (const item of NAV_ITEMS) {
    const link = document.createElement("a");
    link.href = item.path;
    const linkIcon = document.createElement("i");
    linkIcon.className = `fa-solid ${item.icon}`;
    linkIcon.setAttribute("aria-hidden", "true");
    link.appendChild(linkIcon);
    link.appendChild(document.createTextNode(item.label));
    nav.appendChild(link);
  }

  header.appendChild(titleRow);
  header.appendChild(nav);

  const lifetimeBanner = document.createElement("div");
  lifetimeBanner.className = "data-lifetime-banner";
  const bannerIcon = document.createElement("i");
  bannerIcon.className = "fa-solid fa-circle-info";
  bannerIcon.setAttribute("aria-hidden", "true");
  lifetimeBanner.appendChild(bannerIcon);
  lifetimeBanner.appendChild(document.createTextNode(STRINGS.app.dataLifetimeNotice));

  const main = document.createElement("main");
  main.className = "app-outlet";
  main.id = "app-outlet";

  root.appendChild(header);
  root.appendChild(lifetimeBanner);
  root.appendChild(main);

  return { outlet: main };
}
