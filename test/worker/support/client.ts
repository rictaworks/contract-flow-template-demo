import { app } from "../../../src/worker/index";
import type { Bindings } from "../../../src/worker/lib/env";

export function makeClient(db: D1Database) {
  const env: Bindings = { DB: db, APP_ENV: "development" };
  let cookie = "";

  async function request(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (cookie) headers["Cookie"] = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await app.fetch(
      new Request(`http://localhost${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }),
      env,
    );
    const setCookie = res.headers.get("Set-Cookie");
    if (setCookie) cookie = setCookie.split(";")[0] ?? "";
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    return { status: res.status, body: json };
  }

  return {
    get: (path: string) => request("GET", path),
    post: (path: string, body?: unknown) => request("POST", path, body ?? {}),
    patch: (path: string, body?: unknown) => request("PATCH", path, body ?? {}),
    setCookie: (value: string) => {
      cookie = value;
    },
    getCookie: () => cookie,
  };
}
