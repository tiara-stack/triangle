import { Effect, Schema } from "effect";
import {
  HttpBody,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import {
  SideValuesSchema,
  TriangleRunSchema,
  runTriangleTest,
  type SideValues,
} from "./triangle";

type SideValuesDecodeError = "invalid-json" | "invalid-side-values";

const decodeSideValues = (
  request: HttpServerRequest.HttpServerRequest,
): Effect.Effect<SideValues, SideValuesDecodeError> =>
  request.json.pipe(
    Effect.mapError(() => "invalid-json" as const),
    Effect.flatMap((input) =>
      Schema.decodeUnknownEffect(SideValuesSchema)(input).pipe(
        Effect.mapError(() => "invalid-side-values" as const),
      ),
    ),
  );

const handleRunRequest = (
  request: HttpServerRequest.HttpServerRequest,
): Effect.Effect<HttpServerResponse.HttpServerResponse, HttpBody.HttpBodyError> =>
  Effect.matchEffect(decodeSideValues(request), {
    onFailure: (error) =>
      HttpServerResponse.json(
        {
          error:
            error === "invalid-json"
              ? "Invalid JSON request."
              : "Enter three side lengths before running the test.",
        },
        { status: 400 },
      ),
    onSuccess: (values) =>
      Effect.gen(function* () {
        const result = yield* runTriangleTest(values);
        const response = yield* HttpServerResponse.schemaJson(TriangleRunSchema)(result);
        return HttpServerResponse.setHeader("cache-control", "no-store")(response);
      }),
  });

export const handleTriangleRunRequest = (request: Request): Promise<Response> =>
  Effect.runPromise(
    handleRunRequest(HttpServerRequest.fromWeb(request)).pipe(
      Effect.map(HttpServerResponse.toWeb),
    ),
  );
