import { Effect, Filter, Predicate, Result, Schema } from "effect";

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
    id: "case-02",
    name: "Short sides sum to long",
    failureExplanation: "Triangle sides must satisfy a strict inequality; here the shorter sides sum exactly to the longest side.",
    source: "example:defect",
    tags: [
      "failed",
      "expected not a triangle",
      "observed scalene",
      "triangle boundary",
    ],
    values: { a: "1", b: "2", c: "1" },
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
    id: "control-isosceles",
    name: "Valid isosceles",
    source: "example:success",
    tags: [
      "passed",
      "expected isosceles",
      "observed isosceles",
    ],
    values: { a: "4", b: "4", c: "5" },
  },
  {
    id: "control-scalene",
    name: "Valid scalene",
    source: "example:success",
    tags: [
      "passed",
      "expected scalene",
      "observed scalene",
    ],
    values: { a: "3", b: "4", c: "5" },
  },
];

export const labCases: ReadonlyArray<TriangleCase> = [...verifiedCases, ...validCases];

type ClassificationRule = {
  (values: NumericSideValues): Result.Result<TriangleOutput, NumericSideValues>;
};

const sideIsOutOfRange: Predicate.Predicate<number> = Predicate.or(
  (side: number) => side < 1,
  (side: number) => side > 200,
);

const hasOutOfRangeSide: Predicate.Predicate<NumericSideValues> = ({ a, b, c }) =>
  [a, b, c].some(sideIsOutOfRange);

const classificationRule = (
  matches: Predicate.Predicate<NumericSideValues>,
  result: TriangleOutput,
): ClassificationRule =>
  Filter.andRight(
    Filter.fromPredicate(matches),
    Filter.make(() => Result.succeed(result)),
  );

const expectedClassificationFilter = Filter.or(
  classificationRule(hasOutOfRangeSide, "Value is out of range"),
  Filter.or(
    classificationRule(({ a, b, c }) => !(a < b + c && b < a + c && c < a + b), "NotATriangle"),
    Filter.or(
      classificationRule(({ a, b, c }) => a === b && b === c, "Equilateral"),
      classificationRule(({ a, b, c }) => a === b || a === c || b === c, "Isosceles"),
    ),
  ),
);

const faultyClassificationFilter = Filter.or(
  classificationRule(Predicate.or(hasOutOfRangeSide, ({ b }) => b === 200), "Value is out of range"),
  Filter.or(
    // The teaching implementation accepts equality for b = a + c.
    classificationRule(({ a, b, c }) => !(a < b + c && b <= a + c && c < a + b), "NotATriangle"),
    Filter.or(
      classificationRule(({ a, b, c }) => a === b && b === c, "Equilateral"),
      // Its isosceles check misses the a = c pair.
      classificationRule(({ a, b, c }) => a === b || b === c, "Isosceles"),
    ),
  ),
);

const classifyNumbers = (values: NumericSideValues, rules: ClassificationRule) =>
  Effect.orElseSucceed(
    Effect.fromResult(rules(values)),
    () => "Scalene" as const,
  );

const classifyExpectedNumbers = (values: NumericSideValues) =>
  classifyNumbers(values, expectedClassificationFilter);

const classifyFaultyNumbers = (values: NumericSideValues) =>
  classifyNumbers(values, faultyClassificationFilter);

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
