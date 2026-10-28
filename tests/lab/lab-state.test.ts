import { describe, expect, it } from "vitest";
import { filterCasesByTags, makeCaseFilterOptions } from "../../src/lib/labState";
import { labCases } from "../../src/lib/triangle";

describe("lab case tags", () => {
  it("uses simple labels and applies multiple example tags together", () => {
    const options = makeCaseFilterOptions(labCases);
    const failed = options.find((option) => option.group === "Example tags" && option.label === "Failed");
    const equalSides = options.find((option) => option.group === "Example tags" && option.label === "Equal sides");

    expect(failed).toBeDefined();
    expect(equalSides).toBeDefined();
    expect(failed?.value).not.toContain("example:result:");
    expect(filterCasesByTags(labCases, [failed!.value, equalSides!.value]).map(({ id }) => id)).toEqual([
      "case-01",
    ]);
  });

  it("keeps a custom tag separate from the same example tag", () => {
    const customCase = {
      ...labCases[0],
      id: "custom-failed",
      source: "custom" as const,
      tags: ["failed"],
    };
    const cases = [...labCases, customCase];
    const options = makeCaseFilterOptions(cases);
    const exampleFailed = options.find((option) => option.group === "Example tags" && option.label === "Failed");
    const customFailed = options.find((option) => option.group === "Custom tags" && option.label === "failed");

    expect(exampleFailed?.value).not.toBe(customFailed?.value);
    expect(filterCasesByTags(cases, [exampleFailed!.value]).every(({ source }) => source !== "custom")).toBe(true);
    expect(filterCasesByTags(cases, [customFailed!.value]).map(({ id }) => id)).toEqual(["custom-failed"]);
  });
});
