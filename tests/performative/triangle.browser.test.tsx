import { afterAll, describe, expect, it, vi } from "vitest";
import { renderLab } from "../helpers/renderLab";
import { installClassifierFetch } from "../helpers/classifierFetch";

afterAll(() => vi.unstubAllGlobals());

const defectExamples = [
  {
    name: "classifies a = c sides as isosceles through the compact UI",
    values: ["2", "1", "2"],
    expected: "Isosceles",
  },
  {
    name: "rejects equality at the longest-side boundary through the compact UI",
    values: ["1", "2", "1"],
    expected: "Not a triangle",
  },
  {
    name: "accepts a valid triangle with side lengths of 200 through the compact UI",
    values: ["1", "200", "200"],
    expected: "Isosceles",
  },
] as const;

describe("performative defect checks through the user interface", () => {
  it.each(defectExamples)("$name", async ({ values, expected }) => {
    const { requests } = installClassifierFetch();
    const screen = await renderLab();

    await screen.getByRole("button", { name: "Enter sides only" }).click();
    for (const [index, side] of ["a", "b", "c"].entries()) {
      const input = screen.getByRole("spinbutton", { name: `Side ${side}` });
      await input.fill(values[index]);
    }
    await screen.getByRole("button", { name: "Run test" }).click();

    const matchingOutputs = screen.getByRole("heading", { name: expected });
    await expect.element(matchingOutputs.first()).toBeVisible();
    await expect.element(matchingOutputs.nth(1)).toBeVisible();
    await expect.element(screen.getByText("Run complete · Matches expected")).toBeVisible();
    expect(requests.at(-1)).toEqual({ a: values[0], b: values[1], c: values[2] });
  });

  it.each([
    { values: ["201", "1", "1"], label: "above the allowed range" },
    { values: ["-1", "1", "1"], label: "below the allowed range" },
  ] as const)("accepts a raw input $label and reports it in the result", async ({ values }) => {
    const { requests } = installClassifierFetch();
    const screen = await renderLab();

    await screen.getByRole("button", { name: "Enter sides only" }).click();
    for (const [index, side] of ["a", "b", "c"].entries()) {
      const input = screen.getByRole("spinbutton", { name: `Side ${side}` });
      await input.fill(values[index]);
    }
    await screen.getByRole("button", { name: "Run test" }).click();

    const rangeOutputs = screen.getByRole("heading", { name: "Value is out of range" });
    await expect.element(rangeOutputs.first()).toBeVisible();
    await expect.element(rangeOutputs.nth(1)).toBeVisible();
    await expect.element(screen.getByText("Run complete · Matches expected")).toBeVisible();
    expect(requests.at(-1)).toEqual({ a: values[0], b: values[1], c: values[2] });
  });
});
