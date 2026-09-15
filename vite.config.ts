import { defineConfig } from "vite";

// フロントエンド（Cloudflare Pages）はVite、アプリケーション（Cloudflare Workers）は wrangler dev で
// それぞれローカル起動する。本番はWorker Routeで /api/* を同一ゾーンのWorkerへ振り向ける想定のため、
// フロントエンドのコードは常に相対パス /api/... を叩けばよい。ローカル開発ではViteのproxyで模する。
export default defineConfig({
  root: "src/frontend",
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
