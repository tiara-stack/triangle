import { createRouter } from "@tanstack/react-router";
import { setupStartAtomIntegration } from "./lib/startAtom";
import { makeAtomRegistry } from "./lib/atomRegistry";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const atomRegistry = makeAtomRegistry();

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    context: { atomRegistry },
  });

  // Effect Atom uses the separate Start/Atom registry bridge from tiara-stack.
  setupStartAtomIntegration({ router, registry: atomRegistry });

  return router;
}

export type AppRouter = ReturnType<typeof getRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
