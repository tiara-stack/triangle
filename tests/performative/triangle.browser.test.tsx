import { afterAll, describe, expect, it, vi } from "vitest";
import { renderLab } from "../helpers/renderLab";
import { installClassifierFetch } from "../helpers/classifierFetch";

afterAll(() => vi.unstubAllGlobals());

const defectExamples = [
  {
    name: "shows the omitted a = c result through the compact UI",
    values: ["2", "1", "2"],
    expected: "Isosceles",
    observed: "Scalene",
  },
  {
    name: "shows the strict triangle boundary result through the compact UI",
    values: ["1", "2", "1"],
    expected: "Not a triangle",
    observed: "Scalene",
  },
  {
    name: "shows the valid side-200 result through the compact UI",
    values: ["1", "200", "200"],
    expected: "Isosceles",
    observed: "Value is out of range",
  },
] as const;

describe("performative defect checks through the user interface", () => {
  it.each(defectExamples)("$name", async ({ values, expected, observed }) => {
    const { requests } = installClassifierFetch();
    const screen = await renderLab();

    await screen.getByRole("button", { name: "Enter sides only" }).click();
    for (const [index, side] of ["a", "b", "c"].entries()) {
      const input = screen.getByRole("spinbutton", { name: `Side ${side}` });
      await input.fill(values[index]);
    }
    await screen.getByRole("button", { name: "Run test" }).click();

    await expect.element(screen.getByText(expected)).toBeVisible();
    await expect.element(screen.getByText(observed)).toBeVisible();
    await expect.element(screen.getByText("Run complete · Classifier mismatch")).toBeVisible();
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

    await expect.element(screen.getByRole("heading", { name: "Value is out of range" }).first()).toBeVisible();
    await expect.element(screen.getByText("Run complete · Matches expected")).toBeVisible();
    expect(requests.at(-1)).toEqual({ a: values[0], b: values[1], c: values[2] });
  });
});
