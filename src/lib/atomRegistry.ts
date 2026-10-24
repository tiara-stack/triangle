import { scheduleTask } from "@effect/atom-react";
import { AtomRegistry } from "effect/reactivity";

export const makeAtomRegistry = () =>
  AtomRegistry.make({
    scheduleTask,
    defaultIdleTTL: 400,
  });
