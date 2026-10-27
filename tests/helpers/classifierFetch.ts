import { vi } from "vitest";
import type { SideValues } from "../../src/lib/triangle";
import { handleTriangleApiRequest, triangleApiWebHandler } from "../../src/lib/triangleApiServer";

let activeRequests: Array<SideValues> = [];
let classifierFetchMock: ReturnType<typeof vi.fn> | undefined;

export function installClassifierFetch() {
  const requests: Array<SideValues> = [];
  activeRequests = requests;

  if (!classifierFetchMock) {
    classifierFetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const values = await request.clone().json() as SideValues;
      activeRequests.push(values);
      return handleTriangleApiRequest(request);
    });
    vi.stubGlobal("fetch", classifierFetchMock);
  }

  return { fetchMock: classifierFetchMock, requests };
}

export const disposeClassifierFetch = () => triangleApiWebHandler.dispose();
