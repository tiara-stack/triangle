import { afterAll, describe, expect, it, vi } from "vitest";
import { renderLab } from "../helpers/renderLab";
import { disposeClassifierFetch, installClassifierFetch } from "../helpers/classifierFetch";

afterAll(async () => {
  vi.unstubAllGlobals();
  await disposeClassifierFetch();
});

describe("Triangle Test Lab", () => {
  it("loads both example groups, runs the recommended case, and records a session run", async () => {
    const { fetchMock, requests } = installClassifierFetch();
    const screen = await renderLab();

    await expect.element(screen.getByRole("heading", { name: "Classify a triangle" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "Defects" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "Passing examples" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /Test 1: a and c match, recommended first case/ })).toBeVisible();
    await expect.element(screen.getByText("Expected comes from triangle rules; observed comes from the faulty classifier.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();

    await screen.getByRole("button", { name: "Run case" }).click();

    await expect.element(screen.getByText("Isosceles")).toBeVisible();
    await expect.element(screen.getByText("Scalene")).toBeVisible();
    await expect.element(screen.getByText("Run complete · Classifier mismatch")).toBeVisible();
    expect(requests).toEqual([{ a: "2", b: "1", c: "2" }]);

    await screen.getByRole("button", { name: /Run history/ }).click();
    await expect.element(screen.getByText("Expected: Isosceles")).toBeVisible();
    await expect.element(screen.getByText("Observed: Scalene")).toBeVisible();
  });

  it("filters example types and creates, edits, then deletes a custom case", async () => {
    installClassifierFetch();
    const screen = await renderLab();

    await screen.getByRole("combobox", { name: "Case types" }).click();
    await screen.getByRole("option", { name: /Verified defects/ }).click();
    await expect.element(screen.getByRole("heading", { name: "Passing examples" })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /Valid equilateral/ })).toBeVisible();

    await screen.getByRole("button", { name: "Add custom case" }).click();
    const dialog = screen.getByRole("dialog");
    await dialog.getByLabelText(/Case name/).fill("Boundary check");
    await dialog.getByLabelText(/Description/).fill("A custom regression case");
    await dialog.getByLabelText(/Tags/).fill("strict boundary");
    await dialog.getByRole("spinbutton", { name: "Side a" }).fill("3");
    await dialog.getByRole("spinbutton", { name: "Side b" }).fill("4");
    await dialog.getByRole("spinbutton", { name: "Side c" }).fill("5");
    await dialog.getByRole("button", { name: "Save case" }).click();

    await expect.element(screen.getByRole("button", { name: /Boundary check/ })).toBeVisible();
    await expect.element(screen.getByText("A custom regression case").first()).toBeVisible();

    await screen.getByRole("button", { name: "Edit case details" }).click();
    const editDialog = screen.getByRole("dialog");
    await editDialog.getByLabelText(/Case name/).fill("Edited boundary check");
    await editDialog.getByLabelText(/Description/).fill("Updated case rationale");
    await editDialog.getByRole("button", { name: "Save details" }).click();

    await expect.element(screen.getByRole("button", { name: /Edited boundary check/ })).toBeVisible();
    await expect.element(screen.getByText("Updated case rationale").first()).toBeVisible();

    await screen.getByRole("button", { name: "Delete case" }).click();
    const confirmation = screen.getByRole("alertdialog");
    await confirmation.getByRole("button", { name: "Delete case" }).click();
    await expect.element(screen.getByRole("button", { name: /Valid 200 rejected/ })).toBeVisible();
  });
});
