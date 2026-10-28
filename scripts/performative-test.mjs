import { spawnSync } from "node:child_process";

const suites = [
  {
    args: ["--config", "vitest.node.config.ts", "tests/performative/triangle.test.ts"],
    runTitle: "Triangle Test Lab | Performative | Direct Effect",
  },
];

const suiteEnv = (runTitle) => ({
  ...process.env,
  QASE_TESTOPS_RUN_TITLE: runTitle,
});

let failed = false;

for (const suite of suites) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", ...suite.args],
    { stdio: "inherit", env: suiteEnv(suite.runTitle) },
  );

  if (result.error) {
    console.error(result.error);
    failed = true;
  }

  if (result.status !== 0) failed = true;
}

const browserResult = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.config.ts", "tests/e2e/performative.spec.ts"],
  {
    stdio: "inherit",
    env: suiteEnv("Triangle Test Lab | Performative | Browser UI"),
  },
);

if (browserResult.error) {
  console.error(browserResult.error);
  failed = true;
}

if (browserResult.status !== 0) failed = true;

process.exitCode = failed ? 1 : 0;
