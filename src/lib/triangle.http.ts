import { Effect } from "effect";
import {
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { SideValuesSchema, TriangleRunSchema, type SideValues } from "./triangle";

export const makeTriangleRunRequest = (
  values: SideValues,
): Effect.Effect<HttpClientRequest.HttpClientRequest, HttpBody.HttpBodyError> =>
  HttpClientRequest.schemaBodyJson(SideValuesSchema)(values)(
    HttpClientRequest.post("/api/triangle/run"),
  );

export const runTriangleTestRequest = (values: SideValues) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const request = yield* makeTriangleRunRequest(values);
    const response = yield* request.pipe(
      httpClient.execute,
      Effect.flatMap(HttpClientResponse.filterStatusOk),
    );
    return yield* HttpClientResponse.schemaBodyJson(TriangleRunSchema)(response);
  });
