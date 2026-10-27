import { verifiedCases, type SideValues, type TriangleOutput } from "../../lib/triangle";

export function displayTriangleOutput(output: TriangleOutput): string {
  return output === "NotATriangle" ? "Not a triangle" : output;
}

export function sideValue(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function verifiedDefectForValues(values: SideValues) {
  return verifiedCases.find((testCase) =>
    testCase.values.a === values.a &&
    testCase.values.b === values.b &&
    testCase.values.c === values.c,
  );
}
