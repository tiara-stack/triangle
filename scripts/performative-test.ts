import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Config, ConfigProvider, Console, Effect, FileSystem, Result } from "effect";
import { CliError, Command, Flag } from "effect/cli";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const qaseSettings = Config.all({
  mode: Config.String("QASE_MODE").pipe(Config.withDefault("off")),
  project: Config.String("QASE_TESTOPS_PROJECT").pipe(Config.withDefault("")),
  sharedToken: Config.String("QASE_TESTOPS_API_TOKEN").pipe(Config.withDefault("")),
  vitestToken: Config.String("QASE_VITEST_API_TOKEN").pipe(Config.withDefault("")),
  playwrightToken: Config.String("QASE_PLAYWRIGHT_API_TOKEN").pipe(Config.withDefault("")),
});

const loadSettings = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const localEnvProvider = (yield* fileSystem.exists(".env.local"))
    ? yield* ConfigProvider.fromDotEnv({ path: ".env.local" })
    : ConfigProvider.fromUnknown({});
  const provider = ConfigProvider.orElse(
    ConfigProvider.fromEnv(),
    localEnvProvider,
  );

  return yield* qaseSettings.parse(provider);
});

const makeSuiteEnvironment = (
  settings: Config.Config.Success<typeof qaseSettings>,
  runTitle: string,
  token: string,
  qaseEnabled: boolean,
): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  delete env.QASE_VITEST_API_TOKEN;
  delete env.QASE_PLAYWRIGHT_API_TOKEN;

  return {
    ...env,
    QASE_MODE: qaseEnabled ? "testops" : "off",
    QASE_TESTOPS_PROJECT: settings.project,
    QASE_TESTOPS_API_TOKEN: token,
    QASE_TESTOPS_RUN_TITLE: runTitle,
  };
};

const runSuite = (
  name: string,
  args: ReadonlyArray<string>,
  settings: Config.Config.Success<typeof qaseSettings>,
  runTitle: string,
  token: string,
  qaseEnabled: boolean,
) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const result = yield* Effect.result(
      spawner.exitCode(
        ChildProcess.make(process.execPath, args, {
          cwd: process.cwd(),
          env: makeSuiteEnvironment(settings, runTitle, token, qaseEnabled),
          extendEnv: false,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        }),
      ),
    );

    if (Result.isFailure(result)) {
      yield* Console.error(`${name} runner failed to start: ${result.failure}`);
      return false;
    }

    return result.success === 0;
  });

const performativeCommand = Command.make(
  "performative",
  {
    direct: Flag.Boolean("direct").pipe(Flag.withDefault(false)),
    browser: Flag.Boolean("browser").pipe(Flag.withDefault(false)),
    qase: Flag.Boolean("qase").pipe(Flag.withDefault(false)),
  },
  ({ direct, browser, qase }) =>
    Effect.gen(function* () {
      if (direct && browser) {
        return yield* new CliError.ValidationError({
          message: "Choose either --direct or --browser when selecting one suite.",
        });
      }

      const runDirect = !browser;
      const runBrowser = !direct;
      const settings = yield* loadSettings;
      const qaseEnabled = qase || settings.mode === "testops";
      const vitestToken = settings.vitestToken || settings.sharedToken;
      const playwrightToken = settings.playwrightToken || settings.sharedToken;

      if (qaseEnabled) {
        const missing = [
          ...(!settings.project ? ["QASE_TESTOPS_PROJECT"] : []),
          ...(runDirect && !vitestToken
            ? ["QASE_VITEST_API_TOKEN or QASE_TESTOPS_API_TOKEN"]
            : []),
          ...(runBrowser && !playwrightToken
            ? ["QASE_PLAYWRIGHT_API_TOKEN or QASE_TESTOPS_API_TOKEN"]
            : []),
        ];

        if (missing.length > 0) {
          return yield* new CliError.ValidationError({
            message: `Qase reporting requires ${missing.join(" and ")}. Add the values to .env.local.`,
          });
        }

        yield* Console.log("Qase reporting is enabled for this local performative run.");
      }

      let passed = true;

      if (runDirect) {
        const directPassed = yield* runSuite(
          "Vitest",
          [
            "node_modules/vitest/vitest.mjs",
            "run",
            "--config",
            "vitest.node.config.ts",
            "tests/performative/triangle.test.ts",
          ],
          settings,
          "Triangle Test Lab | Performative | Direct Effect",
          vitestToken,
          qaseEnabled,
        );
        passed = passed && directPassed;
      }

      if (runBrowser) {
        const browserPassed = yield* runSuite(
          "Playwright",
          [
            "node_modules/@playwright/test/cli.js",
            "test",
            "--config",
            "playwright.config.ts",
            "tests/e2e/performative.spec.ts",
          ],
          settings,
          "Triangle Test Lab | Performative | Browser UI",
          playwrightToken,
          qaseEnabled,
        );
        passed = passed && browserPassed;
      }

      if (!passed) {
        yield* Effect.sync(() => {
          process.exitCode = 1;
        });
      }
    }),
).pipe(Command.withDescription("Run the direct and browser defect-detection suites."));

const program = Command.run(performativeCommand, { version: "development" }).pipe(
  Effect.provide(NodeServices.layer),
);

NodeRuntime.runMain(program);
