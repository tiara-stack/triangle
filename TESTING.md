# Tests

`pnpm test` runs the whole-lab suite. It checks the typed Effect API with `HttpApiTest`, the mounted Web handler, and browser flows including running a case, session history, filtering, and custom case create/edit/delete.

`pnpm test:performative` runs direct Effect assertions and Playwright browser checks against the three known classifier defects. These assertions expect correct triangle-rule outputs, so they intentionally fail while the faulty classifier still exhibits those defects. The `201` and `-1` range checks are controls and should pass.

Run both performative suites locally with `pnpm test:performative`. To run just one suite, use `pnpm test:performative:direct` for the Effect checks or `pnpm test:performative:browser` for the browser checks. The browser suite builds and starts the app automatically; install Chromium first with `node node_modules/@playwright/test/cli.js install chromium` if it is not already installed.

Qase reporting stays off for ordinary local runs. To send local results to Qase, copy `.env.local.example` to `.env.local` and add your Qase token. Use `QASE_TESTOPS_API_TOKEN` for one shared token, or set `QASE_VITEST_API_TOKEN` and `QASE_PLAYWRIGHT_API_TOKEN` to use separate app tokens. The runner maps the selected token to `QASE_TESTOPS_API_TOKEN` inside each child process. Then run `pnpm test:performative:qase`. This creates one Qase run per suite in project `TR`. `.env.local` is ignored by Git. Like the GitHub workflow, the command returns a failing exit code while the known defects remain.

```sh
cp .env.local.example .env.local
# Add one shared token, or separate Vitest and Playwright app tokens, then:
pnpm test:performative:qase

# Run just one suite and report it to Qase:
pnpm run test:performative:qase -- --direct
pnpm run test:performative:qase -- --browser
```

The GitHub Actions **Performative defect detection** workflow runs only when dispatched manually. Its red result demonstrates that the tests caught the known defects; it turns green when those defects are fixed.

The `src/server.ts` entry point sends `/api/*` requests to the Effect HTTP router and delegates other requests to TanStack Start.
