import { Effect } from "effect";
import { expect, it } from "@effect/vitest";
import { handleTriangleRunRequest } from "../../src/lib/triangleApi";
import type { TriangleRun } from "../../src/lib/triangle";

it.effect("serves the classifier result for a run request", () =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() =>
      handleTriangleRunRequest(new Request("http://triangle.test/api/triangle/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ a: "2", b: "1", c: "2" }),
      })),
    );
    const result = yield* Effect.promise(() => response.json() as Promise<TriangleRun>);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(result).toStrictEqual({
      values: { a: "2", b: "1", c: "2" },
      expected: "Isosceles",
      observed: "Scalene",
      failed: true,
    });
  }),
);

it.effect("rejects malformed side value payloads", () =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() =>
      handleTriangleRunRequest(new Request("http://triangle.test/api/triangle/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ a: 2, b: "1", c: "2" }),
      })),
    );

    expect(response.status).toBe(400);
    expect(yield* Effect.promise(() => response.json())).toStrictEqual({
      error: "Enter three side lengths before running the test.",
    });
  }),
);
