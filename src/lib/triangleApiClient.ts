import { Context, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { TriangleApi } from "./triangleApi";

export class TriangleApiClient extends Context.Service<
  TriangleApiClient,
  HttpApiClient.ForApi<typeof TriangleApi>
>()("TriangleApiClient") {
  static readonly layer = Layer.effect(
    TriangleApiClient,
    HttpApiClient.make(TriangleApi),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
