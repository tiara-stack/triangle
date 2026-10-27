import { vi } from "vitest";
import { handleTriangleRunRequest } from "../../src/lib/triangleApi";
import type { SideValues } from "../../src/lib/triangle";

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
      return handleTriangleRunRequest(request);
    });
    vi.stubGlobal("fetch", classifierFetchMock);
  }

  return { fetchMock: classifierFetchMock, requests };
}
