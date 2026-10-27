import { Effect, Layer } from "effect";
import { expect, it } from "@effect/vitest";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { TriangleApi } from "../../src/lib/triangleApi";
import { TriangleApiHandlers } from "../../src/lib/triangleApiHandlers";
import { handleTriangleApiRequest, triangleApiWebHandler } from "../../src/lib/triangleApiServer";

const makeTriangleClient = HttpApiTest.groups(TriangleApi, ["triangle"]);
const triangleApiTestLayer = Layer.mergeAll(
  TriangleApiHandlers,
  HttpServer.layerServices,
);

it.effect("serves the classifier through the typed HttpApi client", () =>
  Effect.gen(function* () {
    const client = yield* makeTriangleClient;
    const result = yield* client.triangle.run({ payload: { a: "2", b: "1", c: "2" } });

    expect(result.body).toStrictEqual({
      values: { a: "2", b: "1", c: "2" },
      expected: "Isosceles",
      observed: "Scalene",
      failed: true,
    });
    expect(result.headers["cache-control"]).toBe("no-store");
  }).pipe(Effect.provide(triangleApiTestLayer)),
);

it.effect("mounts the typed API at /api/triangle/run", () =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() =>
      handleTriangleApiRequest(new Request("http://triangle.test/api/triangle/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ a: "2", b: "1", c: "2" }),
      })),
    );
    const result = yield* Effect.promise(() => response.json());

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

it.effect("rejects invalid request payloads at the HTTP boundary", () =>
  Effect.gen(function* () {
    const response = yield* Effect.promise(() =>
      handleTriangleApiRequest(new Request("http://triangle.test/api/triangle/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ a: 2, b: "1", c: "2" }),
      })),
    );

    expect(response.status).toBe(400);
  }),
);
