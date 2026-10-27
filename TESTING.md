# Tests

`pnpm test` runs the whole-lab suite. It checks the API handler and browser flows, including running a case, session history, filtering, and custom case create/edit/delete.

`pnpm test:performative` runs direct Effect assertions and Playwright browser checks against the three known classifier defects. These assertions expect correct triangle-rule outputs, so they intentionally fail while the faulty classifier still exhibits those defects. The `201` and `-1` range checks are controls and should pass.

The GitHub Actions **Performative defect detection** workflow runs only when dispatched manually. Its red result demonstrates that the tests caught the known defects; it turns green when those defects are fixed.
