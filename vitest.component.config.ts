import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  publicDir: "tests/browser-public",
  test: {
    include: ["tests/**/*.component.test.tsx"],
    setupFiles: ["tests/setup.component.ts"],
    browser: {
      enabled: true,
      headless: true,
      viewport: { width: 1280, height: 800 },
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
