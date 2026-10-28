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

const wholeNumberMessage = "Enter a whole number.";

export const SideValueInputSchema = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^\s*-?\d+\s*$/, { message: wholeNumberMessage }),
    Schema.makeFilter(
      (value) => Number.isSafeInteger(Number(value.trim())) || wholeNumberMessage,
      { message: wholeNumberMessage },
    ),
  ),
);

export type CaseId = string;
export type CaseSource = "example:defect" | "example:success" | "custom";
export type TriangleOutput =
  | "Equilateral"
  | "Isosceles"
  | "Scalene"
  | "NotATriangle"
  | "Value is out of range";

export type TriangleRun = {
  values: SideValues;
  expected: TriangleOutput;
  observed: TriangleOutput;
  failed: boolean;
};

export const SideValuesInputSchema = Schema.Struct({
  a: Schema.String,
  b: Schema.String,
  c: Schema.String,
});

export const SideValuesSchema = Schema.Struct({
  a: SideValueInputSchema,
  b: SideValueInputSchema,
  c: SideValueInputSchema,
});

const NumericSideValuesSchema = Schema.Struct({
  a: Schema.NumberFromString.pipe(Schema.check(Schema.isInt())),
  b: Schema.NumberFromString.pipe(Schema.check(Schema.isInt())),
  c: Schema.NumberFromString.pipe(Schema.check(Schema.isInt())),
});

type NumericSideValues = Schema.Schema.Type<typeof NumericSideValuesSchema>;

const decodeSideValues = Effect.fnUntraced(function*(values: SideValues) {
  const validatedValues = yield* Schema.decodeUnknownEffect(SideValuesSchema)(values);
  return yield* Schema.decodeUnknownEffect(NumericSideValuesSchema)(validatedValues);
});

const TriangleOutputSchema = Schema.Literals([
  "Equilateral",
  "Isosceles",
  "Scalene",
  "NotATriangle",
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
      "failed",
      "expected isosceles",
      "observed scalene",
      "equal sides",
    ],
    values: { a: "2", b: "1", c: "2" },
  },
  {
    id: "case-03",
    name: "Valid 200 rejected",
    failureExplanation: "Side lengths up to 200 are allowed, so this valid isosceles triangle should be accepted.",
    source: "example:defect",
    tags: [
      "failed",
      "expected isosceles",
      "observed out of range",
      "maximum side",
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
      "passed",
      "expected equilateral",
      "observed equilateral",
    ],
    values: { a: "3", b: "3", c: "3" },
  },
  {
    id: "control-out-of-range",
    name: "Valid out of range",
    source: "example:success",
    tags: [
      "passed",
    ],
    values: { a: "201", b: "1", c: "1" },
  },
];

export const labCases: ReadonlyArray<TriangleCase> = [...verifiedCases, ...validCases];

const classifyExpectedNumbers = Effect.fnUntraced(function*(
  values: NumericSideValues,
): Effect.fn.Return<TriangleOutput> {
  const { a, b, c } = values;
  if ([a, b, c].some((side) => side < 1 || side > 200)) return "Value is out of range";
  if (!(a < b + c && b < a + c && c < a + b)) return "NotATriangle";
  if (a === b && b === c) return "Equilateral";
  if (a === b || a === c || b === c) return "Isosceles";
  return "Scalene";
});

const classifyFaultyNumbers = Effect.fnUntraced(function*(
  values: NumericSideValues,
): Effect.fn.Return<TriangleOutput> {
  const { a, b, c } = values;
  if ([a, b, c].some((side) => side < 1 || side > 200) || b === 200) {
    return "Value is out of range";
  }

  // The teaching implementation accepts equality for b = a + c.
  if (!(a < b + c && b <= a + c && c < a + b)) return "NotATriangle";
  if (a === b && b === c) return "Equilateral";

  // Its isosceles check misses the a = c pair.
  if (a === b || b === c) return "Isosceles";
  return "Scalene";
});

export const evaluateTriangle = Effect.fnUntraced(function*(values: SideValues) {
  const decodedValues = yield* decodeSideValues(values);
  const [expected, observed] = yield* Effect.all([
    classifyExpectedNumbers(decodedValues),
    classifyFaultyNumbers(decodedValues),
  ]);

  return {
    values,
    expected,
    observed,
    failed: expected !== observed,
  };
});
