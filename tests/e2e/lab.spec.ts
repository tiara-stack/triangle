import { expect, test } from "@playwright/test";

test("loads both example groups, runs the recommended case, and records a session run", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Classify a triangle" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Defects" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Passing examples" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Test 1: a and c match, recommended first case/ })).toBeVisible();
  await expect(page.getByText("Expected comes from triangle rules; observed comes from the faulty classifier.")).toBeVisible();

  const apiResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/triangle/run" &&
    response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run case" }).click();
  const response = await apiResponse;

  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toStrictEqual({ a: "2", b: "1", c: "2" });
  expect(await response.json()).toStrictEqual({
    values: { a: "2", b: "1", c: "2" },
    expected: "Isosceles",
    observed: "Scalene",
    failed: true,
  });

  await expect(page.getByRole("heading", { name: "Isosceles" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scalene" }).first()).toBeVisible();
  await expect(page.getByText("Run complete · Classifier mismatch")).toBeVisible();

  await page.getByRole("button", { name: /Run history/ }).click();
  await expect(page.getByText("Expected: Isosceles")).toBeVisible();
  await expect(page.getByText("Observed: Scalene")).toBeVisible();
});

test("filters example types and creates, edits, then deletes a custom case", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "Case types" }).click();
  await page.getByRole("option", { name: /Verified defects/ }).click();
  await expect(page.getByRole("heading", { name: "Passing examples" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Valid equilateral/ })).toBeVisible();

  await page.getByRole("button", { name: "Add custom case" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Case name/).fill("Boundary check");
  await dialog.getByLabel(/Description/).fill("A custom regression case");
  await dialog.getByLabel(/Tags/).fill("strict boundary");
  await dialog.getByRole("spinbutton", { name: "Side a" }).fill("3");
  await dialog.getByRole("spinbutton", { name: "Side b" }).fill("4");
  await dialog.getByRole("spinbutton", { name: "Side c" }).fill("5");
  await dialog.getByRole("button", { name: "Save case" }).click();

  await expect(page.getByRole("button", { name: /Boundary check/ })).toBeVisible();
  await expect(page.getByText("A custom regression case").first()).toBeVisible();

  await page.getByRole("button", { name: "Edit case details" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel(/Case name/).fill("Edited boundary check");
  await editDialog.getByLabel(/Description/).fill("Updated case rationale");
  await editDialog.getByRole("button", { name: "Save details" }).click();

  await expect(page.getByRole("button", { name: /Edited boundary check/ })).toBeVisible();
  await expect(page.getByText("Updated case rationale").first()).toBeVisible();

  await page.getByRole("button", { name: "Delete case" }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "Delete case" }).click();
  await expect(page.getByRole("button", { name: /Valid 200 rejected/ })).toBeVisible();
});
