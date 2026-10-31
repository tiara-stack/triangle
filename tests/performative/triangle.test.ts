import { Effect } from "effect";
import { describe, expect, it } from "@effect/vitest";
import { evaluateTriangle, type SideValues, type TriangleOutput } from "../../src/lib/triangle";

const classifierCases: ReadonlyArray<{
  name: string;
  values: SideValues;
  expected: TriangleOutput;
}> = [
  {
    name: "classifies a = c sides as isosceles",
    values: { a: "2", b: "1", c: "2" },
    expected: "Isosceles",
  },
  {
    name: "accepts a valid triangle with side lengths of 200",
    values: { a: "1", b: "200", c: "200" },
    expected: "Isosceles",
  },
  {
    name: "classifies an equilateral control triangle",
    values: { a: "3", b: "3", c: "3" },
    expected: "Equilateral",
  },
  {
    name: "reports 201 as outside the allowed side range",
    values: { a: "201", b: "1", c: "1" },
    expected: "Value is out of range",
  },
];

describe("Unit tests w/ Vitest", () => {
for (const testCase of classifierCases) {
  it.effect(testCase.name, () =>
    Effect.gen(function* () {
      const result = yield* evaluateTriangle(testCase.values);

      expect(result).toStrictEqual({
        values: testCase.values,
        expected: testCase.expected,
        observed: testCase.expected,
        failed: false,
      });
    }),
  );
}
});