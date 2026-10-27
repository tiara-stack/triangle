import { spawnSync } from "node:child_process";

const suites = [
  ["--config", "vitest.node.config.ts", "tests/performative/triangle.test.ts"],
];

let failed = false;

for (const suite of suites) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", ...suite],
    { stdio: "inherit" },
  );

  if (result.error) {
    console.error(result.error);
    failed = true;
  }

  if (result.status !== 0) failed = true;
}

const browserResult = spawnSync(
  process.execPath,
  ["node_modules/playwright/cli.js", "test", "--config", "playwright.config.ts", "tests/e2e/performative.spec.ts"],
  { stdio: "inherit" },
);

if (browserResult.error) {
  console.error(browserResult.error);
  failed = true;
}

if (browserResult.status !== 0) failed = true;

process.exitCode = failed ? 1 : 0;
