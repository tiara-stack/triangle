import { AtomHttpApi } from "effect/reactivity";
import { FetchHttpClient } from "effect/http";
import { TriangleApi } from "./triangleApi";

export class TriangleApiClient extends AtomHttpApi.Service<TriangleApiClient>()(
  "TriangleApiClient",
  {
    api: TriangleApi,
    httpClient: FetchHttpClient.layer,
  },
) {}
