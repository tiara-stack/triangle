import { http, HttpResponse } from "msw";
import type { SideValues, TriangleOutput } from "../../src/lib/triangle";

export const requests: Array<SideValues> = [];

const knownResults: Record<string, { expected: TriangleOutput; observed: TriangleOutput; failed: boolean }> = {
  "2,1,2": { expected: "Isosceles", observed: "Scalene", failed: true },
  "1,2,1": { expected: "NotATriangle", observed: "Scalene", failed: true },
  "1,200,200": { expected: "Isosceles", observed: "Value is out of range", failed: true },
  "201,1,1": { expected: "Value is out of range", observed: "Value is out of range", failed: false },
  "-1,1,1": { expected: "Value is out of range", observed: "Value is out of range", failed: false },
};

export const handlers = [
  http.post("/api/triangle/run", async ({ request }) => {
    const values = await request.json() as SideValues;
    requests.push(values);

    const result = knownResults[`${values.a},${values.b},${values.c}`] ?? {
      expected: "Scalene" as const,
      observed: "Scalene" as const,
      failed: false,
    };

    return HttpResponse.json({ values, ...result });
  }),
];
