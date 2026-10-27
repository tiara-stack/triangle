import { Effect } from "effect";
import { HttpApiBuilder, HttpApiSchema } from "effect/http-api";
import { runTriangleTest } from "./triangle";
import { TriangleApi } from "./triangleApi";

export const TriangleApiHandlers = HttpApiBuilder.group(
  TriangleApi,
  "triangle",
  Effect.fn(function* (handlers) {
    return handlers.handle("run", Effect.fn(function* ({ payload }) {
      const body = yield* runTriangleTest(payload).pipe(Effect.orDie);
      return HttpApiSchema.withHeaders({
        body,
        headers: { "cache-control": "no-store" },
      });
    }));
  }),
);
