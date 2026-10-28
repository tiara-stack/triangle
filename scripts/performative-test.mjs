import { spawnSync } from "node:child_process";

const options = new Set(process.argv.slice(2));
const allowedOptions = new Set(["--direct", "--browser", "--qase"]);
const unknownOptions = [...options].filter((option) => !allowedOptions.has(option));

if (unknownOptions.length > 0) {
  console.error(`Unknown option: ${unknownOptions.join(", ")}`);
  process.exit(2);
}

if (options.has("--direct") && options.has("--browser")) {
  console.error("Choose either --direct or --browser when selecting one suite.");
  process.exit(2);
}

const runDirect = !options.has("--browser");
const runBrowser = !options.has("--direct");
const qaseEnabled = options.has("--qase");
const qaseTokenFor = (reporter) =>
  process.env[`QASE_${reporter.toUpperCase()}_API_TOKEN`] ||
  process.env.QASE_TESTOPS_API_TOKEN;

if (qaseEnabled) {
  const missingQaseVariables = [];

  if (!process.env.QASE_TESTOPS_PROJECT) {
    missingQaseVariables.push("QASE_TESTOPS_PROJECT");
  }
  if (runDirect && !qaseTokenFor("vitest")) {
    missingQaseVariables.push("QASE_VITEST_API_TOKEN or QASE_TESTOPS_API_TOKEN");
  }
  if (runBrowser && !qaseTokenFor("playwright")) {
    missingQaseVariables.push("QASE_PLAYWRIGHT_API_TOKEN or QASE_TESTOPS_API_TOKEN");
  }

  if (missingQaseVariables.length > 0) {
    console.error(
      `Local Qase reporting requires ${missingQaseVariables.join(" and ")}. Copy .env.local.example to .env.local and add the token or tokens.`,
    );
    process.exit(2);
  }

  process.env.QASE_MODE = "testops";
  console.log("Qase reporting is enabled for this local performative run.");
}

const suites = [
  {
    args: ["--config", "vitest.node.config.ts", "tests/performative/triangle.test.ts"],
    runTitle: "Triangle Test Lab | Performative | Direct Effect",
  },
];

const suiteEnv = (runTitle, reporter) => {
  const childEnv = { ...process.env };
  delete childEnv.QASE_VITEST_API_TOKEN;
  delete childEnv.QASE_PLAYWRIGHT_API_TOKEN;

  return {
    ...childEnv,
    QASE_TESTOPS_API_TOKEN: qaseTokenFor(reporter) ?? "",
    QASE_TESTOPS_RUN_TITLE: runTitle,
  };
};

let failed = false;

if (runDirect) {
  for (const suite of suites) {
    const result = spawnSync(
      process.execPath,
      ["node_modules/vitest/vitest.mjs", "run", ...suite.args],
      { stdio: "inherit", env: suiteEnv(suite.runTitle, "vitest") },
    );

    if (result.error) {
      console.error(result.error);
      failed = true;
    }

    if (result.status !== 0) failed = true;
  }
}

if (runBrowser) {
  const browserResult = spawnSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.config.ts", "tests/e2e/performative.spec.ts"],
    {
      stdio: "inherit",
      env: suiteEnv("Triangle Test Lab | Performative | Browser UI", "playwright"),
    },
  );

  if (browserResult.error) {
    console.error(browserResult.error);
    failed = true;
  }

  if (browserResult.status !== 0) failed = true;
}

process.exitCode = failed ? 1 : 0;
