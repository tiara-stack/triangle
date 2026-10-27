import { Effect } from "effect";
import { expect, it } from "@effect/vitest";
import { runTriangleTest, type SideValues, type TriangleOutput } from "../../src/lib/triangle";

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
    name: "rejects equality at the longest-side boundary",
    values: { a: "1", b: "2", c: "1" },
    expected: "NotATriangle",
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
    name: "classifies an isosceles control triangle",
    values: { a: "4", b: "4", c: "5" },
    expected: "Isosceles",
  },
  {
    name: "classifies a scalene control triangle",
    values: { a: "3", b: "4", c: "5" },
    expected: "Scalene",
  },
];

for (const testCase of classifierCases) {
  it.effect(testCase.name, () =>
    Effect.gen(function* () {
      const result = yield* runTriangleTest(testCase.values);

      expect({
        expected: result.expected,
        observed: result.observed,
        failed: result.failed,
      }).toStrictEqual({
        expected: testCase.expected,
        observed: testCase.expected,
        failed: false,
      });
    }),
  );
}

for (const values of [
  { a: "201", b: "1", c: "1" },
  { a: "-1", b: "1", c: "1" },
]) {
  it.effect(`reports ${values.a} as outside the allowed side range`, () =>
    Effect.gen(function* () {
      const result = yield* runTriangleTest(values);

      expect(result.expected).toBe("Value is out of range");
      expect(result.observed).toBe("Value is out of range");
      expect(result.failed).toBe(false);
    }),
  );
}
