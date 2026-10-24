import { Atom } from "effect/reactivity";
import { FetchHttpClient } from "effect/http";
import { Effect } from "effect";
import { runTriangleTestRequest } from "./triangle.http";
import type { SideValues } from "./triangle";

const httpRuntime = Atom.runtime(FetchHttpClient.layer);

export const runTriangleAtom = httpRuntime.fn(
  Effect.fnUntraced(function* (values: SideValues) {
    return yield* runTriangleTestRequest(values);
  }),
);
