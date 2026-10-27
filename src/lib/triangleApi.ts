import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/http-api";
import { Schema } from "effect";
import { SideValuesSchema, TriangleRunSchema } from "./triangle";

export class TriangleApiGroup extends HttpApiGroup.make("triangle")
  .add(HttpApiEndpoint.post("run", "/run", {
    payload: SideValuesSchema,
    success: HttpApiSchema.WithHeaders(TriangleRunSchema, {
      "cache-control": Schema.String,
    }),
  }))
  .prefix("/api/triangle") {}

export class TriangleApi extends HttpApi.make("triangle-test-lab")
  .add(TriangleApiGroup) {}
