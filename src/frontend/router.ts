export interface Route {
  pattern: RegExp;
  paramNames: string[];
  render: (params: Record<string, string>, outlet: HTMLElement) => void | Promise<void>;
}

function compile(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexSource = path
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { pattern: new RegExp(`^${regexSource}$`), paramNames };
}

export class Router {
  private routes: Route[] = [];

  constructor(
    private readonly outlet: HTMLElement,
    private readonly notFound: (outlet: HTMLElement) => void,
  ) {}

  add(path: string, render: Route["render"]): this {
    const { pattern, paramNames } = compile(path);
    this.routes.push({ pattern, paramNames, render });
    return this;
  }

  start(): void {
    window.addEventListener("hashchange", () => this.resolve());
    this.resolve();
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  private resolve(): void {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    for (const route of this.routes) {
      const match = route.pattern.exec(hash);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1] ?? "");
        });
        this.outlet.innerHTML = "";
        void route.render(params, this.outlet);
        return;
      }
    }
    this.notFound(this.outlet);
  }
}
