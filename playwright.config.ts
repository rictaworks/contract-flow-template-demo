import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 20_000,
  fullyParallel: false,
  workers: 1,
  // wrangler v4のローカルdevサーバー（ProxyWorker）に既知の未修正の不具合があり、
  // 一時的な接続断を過剰に致命的エラーとして扱い、後続の1リクエストが稀に失敗することがある
  // （アプリ側の不具合ではない。cloudflare/workers-sdk issue #15317・#4562 等を参照）。
  // 本番のCloudflareデプロイはこのローカルdev専用の内部プロキシを経由しないため影響を受けない。
  retries: 2,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev:worker",
      url: "http://127.0.0.1:8787/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run dev:frontend",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
