import { vi } from "vitest";
import { handleTriangleRunRequest } from "../../src/lib/triangleApi";
import type { SideValues } from "../../src/lib/triangle";

export function installClassifierFetch() {
  const requests: Array<SideValues> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const values = await request.clone().json() as SideValues;
    requests.push(values);
    return handleTriangleRunRequest(request);
  });

  vi.stubGlobal("fetch", fetchMock);

  return { fetchMock, requests };
}
