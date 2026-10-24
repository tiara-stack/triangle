import { Effect, Schema } from "effect";

export type SideValues = {
  a: string;
  b: string;
  c: string;
};

export type SideInputError = {
  side: keyof SideValues;
  message: string;
};

export const SideInputErrorSchema = Schema.Struct({
  side: Schema.Literals(["a", "b", "c"]),
  message: Schema.String,
});

export function validateSideValues(values: SideValues): SideInputError | null {
  for (const side of ["a", "b", "c"] as const) {
    const value = values[side].trim();
    if (!/^\d+$/.test(value)) {
      return { side, message: `Side ${side} must be a whole number from 1 to 200.` };
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 200) {
      return { side, message: `Side ${side} must be a whole number from 1 to 200.` };
    }
  }

  return null;
}

export type CaseId = string;
export type CaseSource = "example:defect" | "example:success" | "custom";
export type TriangleOutput =
  | "Equilateral"
  | "Isosceles"
  | "Scalene"
  | "NotATriangle"
  | "Value is not an integer"
  | "Value is out of range";

export type TriangleRun = {
  values: SideValues;
  expected: TriangleOutput;
  observed: TriangleOutput;
  failed: boolean;
};

export const SideValuesSchema = Schema.Struct({
  a: Schema.String,
  b: Schema.String,
  c: Schema.String,
});

const TriangleOutputSchema = Schema.Literals([
  "Equilateral",
  "Isosceles",
  "Scalene",
  "NotATriangle",
  "Value is not an integer",
  "Value is out of range",
]);

export const TriangleRunSchema = Schema.Struct({
  values: SideValuesSchema,
  expected: TriangleOutputSchema,
  observed: TriangleOutputSchema,
  failed: Schema.Boolean,
});

export type TriangleCase = {
  id: CaseId;
  name: string;
  description?: string;
  failureExplanation?: string;
  source: CaseSource;
  tags: ReadonlyArray<string>;
  values: SideValues;
};

export const CaseSourceSchema = Schema.Literals([
  "example:defect",
  "example:success",
  "custom",
]);

export const TriangleCaseSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.optionalKey(Schema.String),
  failureExplanation: Schema.optionalKey(Schema.String),
  source: CaseSourceSchema,
  tags: Schema.Array(Schema.String),
  values: SideValuesSchema,
});

export type VerifiedCase = TriangleCase & { source: "example:defect" };

export type ValidCase = TriangleCase & { source: "example:success" };

export const verifiedCases: ReadonlyArray<VerifiedCase> = [
  {
    id: "case-01",
    name: "a and c match",
    failureExplanation: "The classifier misses the a = c pair, so it calls this valid triangle Scalene.",
    source: "example:defect",
    tags: [
      "example:result:failed",
      "example:output:expected:isosceles",
      "example:output:observed:scalene",
      "example:defect:equality",
    ],
    values: { a: "2", b: "1", c: "2" },
  },
  {
    id: "case-02",
    name: "Short sides sum to long",
    failureExplanation: "Triangle sides must satisfy a strict inequality; here the shorter sides sum exactly to the longest side.",
    source: "example:defect",
    tags: [
      "example:result:failed",
      "example:output:expected:not-a-triangle",
      "example:output:observed:scalene",
      "example:defect:triangle-boundary",
    ],
    values: { a: "1", b: "2", c: "1" },
  },
  {
    id: "case-03",
    name: "Valid 200 rejected",
    failureExplanation: "Side lengths up to 200 are allowed, so this valid isosceles triangle should be accepted.",
    source: "example:defect",
    tags: [
      "example:result:failed",
      "example:output:expected:isosceles",
      "example:output:observed:value-out-of-range",
      "example:defect:upper-bound",
    ],
    values: { a: "1", b: "200", c: "200" },
  },
];

export const validCases: ReadonlyArray<ValidCase> = [
  {
    id: "control-equilateral",
    name: "Valid equilateral",
    source: "example:success",
    tags: [
      "example:result:passed",
      "example:output:expected:equilateral",
      "example:output:observed:equilateral",
    ],
    values: { a: "3", b: "3", c: "3" },
  },
  {
    id: "control-isosceles",
    name: "Valid isosceles",
    source: "example:success",
    tags: [
      "example:result:passed",
      "example:output:expected:isosceles",
      "example:output:observed:isosceles",
    ],
    values: { a: "4", b: "4", c: "5" },
  },
  {
    id: "control-scalene",
    name: "Valid scalene",
    source: "example:success",
    tags: [
      "example:result:passed",
      "example:output:expected:scalene",
      "example:output:observed:scalene",
    ],
    values: { a: "3", b: "4", c: "5" },
  },
];

export const labCases: ReadonlyArray<TriangleCase> = [...verifiedCases, ...validCases];

function parseSide(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function classifyExpected(values: SideValues): TriangleOutput {
  const a = parseSide(values.a);
  const b = parseSide(values.b);
  const c = parseSide(values.c);

  if (a === null || b === null || c === null) return "Value is not an integer";
  if ([a, b, c].some((side) => side < 1 || side > 200)) return "Value is out of range";
  if (!(a < b + c && b < a + c && c < a + b)) return "NotATriangle";
  if (a === b && b === c) return "Equilateral";
  if (a === b || a === c || b === c) return "Isosceles";
  return "Scalene";
}

function classifyFaulty(values: SideValues): TriangleOutput {
  const a = parseSide(values.a);
  const b = parseSide(values.b);
  const c = parseSide(values.c);

  if (a === null || b === null || c === null) return "Value is not an integer";
  if ([a, b, c].some((side) => side < 1 || side > 200) || b === 200) {
    return "Value is out of range";
  }

  // The teaching implementation accepts equality for b = a + c.
  if (!(a < b + c && b <= a + c && c < a + b)) return "NotATriangle";
  if (a === b && b === c) return "Equilateral";

  // Its isosceles check misses the a = c pair.
  if (a === b || b === c) return "Isosceles";
  return "Scalene";
}

export function evaluateTriangle(values: SideValues): TriangleRun {
  const expected = classifyExpected(values);
  const observed = classifyFaulty(values);

  return {
    values,
    expected,
    observed,
    failed: expected !== observed,
  };
}

export const runTriangleTest = (values: SideValues): Effect.Effect<TriangleRun> =>
  Effect.sync(() => evaluateTriangle(values));
