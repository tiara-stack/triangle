import { Context, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { TriangleApi } from "./triangleApi";
import { TriangleApiHandlers } from "./triangleApiHandlers";

const TriangleApiLayer = HttpApiBuilder.layer(TriangleApi).pipe(
  Layer.provide(TriangleApiHandlers),
  Layer.provide(HttpServer.layerServices),
);

export const triangleApiWebHandler = HttpRouter.toWebHandler(TriangleApiLayer, {
  disableLogger: true,
});

export const handleTriangleApiRequest = (request: Request): Promise<Response> =>
  triangleApiWebHandler.handler(request, Context.empty());
