import { Effect } from "effect";
import { expect, it } from "@effect/vitest";
import { runTriangleTest, type SideValues } from "../../src/lib/triangle";

const performativeCases: ReadonlyArray<{
  name: string;
  values: SideValues;
  expected: string;
  observed: string;
  failed: boolean;
}> = [
  {
    name: "directly demonstrates the omitted a = c comparison",
    values: { a: "2", b: "1", c: "2" },
    expected: "Isosceles",
    observed: "Scalene",
    failed: true,
  },
  {
    name: "directly demonstrates equality at the triangle boundary",
    values: { a: "1", b: "2", c: "1" },
    expected: "NotATriangle",
    observed: "Scalene",
    failed: true,
  },
  {
    name: "directly demonstrates rejection of a valid triangle with a side of 200",
    values: { a: "1", b: "200", c: "200" },
    expected: "Isosceles",
    observed: "Value is out of range",
    failed: true,
  },
];

for (const testCase of performativeCases) {
  it.effect(testCase.name, () =>
    Effect.gen(function* () {
      const result = yield* runTriangleTest(testCase.values);

      expect(result.expected).toBe(testCase.expected);
      expect(result.observed).toBe(testCase.observed);
      expect(result.failed).toBe(testCase.failed);
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
