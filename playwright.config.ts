import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4176",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "pnpm build && NITRO_HOST=127.0.0.1 NITRO_PORT=4176 pnpm start",
    url: "http://127.0.0.1:4176/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
