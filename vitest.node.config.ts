import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    reporters:
      process.env.QASE_MODE === "testops"
        ? ["default", "vitest-qase-reporter"]
        : undefined,
  },
});
