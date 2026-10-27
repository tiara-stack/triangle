import { expect, test } from "playwright/test";

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

for (const example of defectExamples) {
  test(example.name, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter sides only" }).click();
    for (const [index, side] of ["a", "b", "c"].entries()) {
      await page.getByRole("spinbutton", { name: `Side ${side}` }).fill(example.values[index]);
    }

    const apiResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/triangle/run" &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Run test" }).click();
    const response = await apiResponse;
    expect(response.status()).toBe(200);

    const matchingOutputs = page.getByRole("heading", { name: example.expected });
    await expect(matchingOutputs.first()).toBeVisible();
    await expect(matchingOutputs.nth(1)).toBeVisible();
    await expect(page.getByText("Run complete · Matches expected")).toBeVisible();
  });
}

for (const example of [
  { values: ["201", "1", "1"], label: "above the allowed range" },
  { values: ["-1", "1", "1"], label: "below the allowed range" },
] as const) {
  test(`accepts a raw input ${example.label} and reports it in the result`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter sides only" }).click();
    for (const [index, side] of ["a", "b", "c"].entries()) {
      await page.getByRole("spinbutton", { name: `Side ${side}` }).fill(example.values[index]);
    }

    const apiResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/triangle/run" &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Run test" }).click();
    const response = await apiResponse;
    expect(response.status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Value is out of range" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Value is out of range" }).nth(1)).toBeVisible();
    await expect(page.getByText("Run complete · Matches expected")).toBeVisible();
  });
}
