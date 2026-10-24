import { Atom } from "effect/reactivity";
import {
  labCases,
  verifiedCases,
  type CaseId,
  type SideValues,
  type TriangleCase,
  type TriangleRun,
} from "./triangle";

export type CaseStatus = "failed" | "passed" | "not-run" | "modified";

export type RunRecord = {
  id: number;
  caseId: CaseId;
  name: string;
  result: TriangleRun;
};

export type LabState = {
  cases: ReadonlyArray<TriangleCase>;
  caseFilters: ReadonlyArray<string>;
  selectedCaseIds: ReadonlyArray<CaseId>;
  activeCaseId: CaseId;
  values: SideValues;
  valuesByCaseId: Record<CaseId, SideValues>;
  result: TriangleRun | null;
  resultsByCaseId: Record<CaseId, TriangleRun | null>;
  statuses: Record<CaseId, CaseStatus>;
  history: ReadonlyArray<RunRecord>;
  isDirty: boolean;
};

export type CaseFilterOption = {
  value: string;
  label: string;
  group: string;
  count: number;
};

const firstCase = verifiedCases[0];
const valuesByCaseId = Object.fromEntries(
  labCases.map((testCase) => [testCase.id, { ...testCase.values }]),
) as Record<CaseId, SideValues>;
const resultsByCaseId = Object.fromEntries(
  labCases.map((testCase) => [testCase.id, null]),
) as Record<CaseId, TriangleRun | null>;
const statuses = Object.fromEntries(
  labCases.map((testCase) => [testCase.id, "not-run"]),
) as Record<CaseId, CaseStatus>;

export const labStateAtom = Atom.make<LabState>({
  cases: labCases,
  caseFilters: ["example:defect", "example:success"],
  selectedCaseIds: [],
  activeCaseId: firstCase.id,
  values: firstCase.values,
  valuesByCaseId,
  result: null,
  resultsByCaseId,
  statuses,
  history: [],
  isDirty: false,
});

export const sourceCaseFilters = ["example:defect", "example:success", "custom"] as const;

function filterGroupForTag(filter: string): string {
  if (sourceCaseFilters.includes(filter as (typeof sourceCaseFilters)[number])) return "Case source";
  if (filter.startsWith("example:result:")) return "Example result";
  if (filter.startsWith("example:output:expected:")) return "Expected output";
  if (filter.startsWith("example:output:observed:")) return "Observed output";
  if (filter.startsWith("example:defect:")) return "Defect";
  return "Custom tags";
}

function labelForFilter(filter: string): string {
  if (filter === "example:defect") return "Verified defects";
  if (filter === "example:success") return "Valid controls";
  if (filter === "custom") return "Custom cases";
  const capitalize = (value: string) => value.replace(/^\w/, (letter) => letter.toUpperCase());
  if (filter.startsWith("example:output:expected:")) {
    return capitalize(filter.slice("example:output:expected:".length).replace(/-/g, " "));
  }
  if (filter.startsWith("example:output:observed:")) {
    return capitalize(filter.slice("example:output:observed:".length).replace(/-/g, " "));
  }
  if (filter.startsWith("example:result:")) {
    return capitalize(filter.slice("example:result:".length).replace(/-/g, " ")) + " result";
  }
  if (filter.startsWith("example:defect:")) {
    return capitalize(filter.slice("example:defect:".length).replace(/-/g, " "));
  }
  return filter;
}

function caseMatchesFilter(testCase: TriangleCase, filter: string): boolean {
  if (sourceCaseFilters.includes(filter as (typeof sourceCaseFilters)[number])) {
    return testCase.source === filter;
  }
  if (filter.startsWith("example:")) {
    return testCase.source !== "custom" && testCase.tags.includes(filter);
  }
  return testCase.source === "custom" && testCase.tags.includes(filter);
}

export function filterCasesByTags(
  cases: ReadonlyArray<TriangleCase>,
  filters: ReadonlyArray<string>,
): ReadonlyArray<TriangleCase> {
  if (filters.length === 0) return cases;

  const filtersByGroup = new Map<string, Array<string>>();
  for (const filter of filters) {
    const group = filterGroupForTag(filter);
    const groupFilters = filtersByGroup.get(group) ?? [];
    groupFilters.push(filter);
    filtersByGroup.set(group, groupFilters);
  }

  return cases.filter((testCase) =>
    [...filtersByGroup.values()].every((groupFilters) =>
      groupFilters.some((filter) => caseMatchesFilter(testCase, filter)),
    ),
  );
}

export const caseFilterOptionsAtom = Atom.make((get): ReadonlyArray<CaseFilterOption> => {
  const cases = get(labStateAtom).cases;
  const exampleTags = new Set(
    cases
      .filter((testCase) => testCase.source !== "custom")
      .flatMap((testCase) => testCase.tags.filter((tag) => tag.startsWith("example:"))),
  );
  const customTags = new Set(
    cases
      .filter((testCase) => testCase.source === "custom")
      .flatMap((testCase) => testCase.tags.filter((tag) => !tag.startsWith("example:"))),
  );
  const filters = [
    ...sourceCaseFilters,
    ...[...exampleTags].sort(),
    ...[...customTags].sort(),
  ];

  return filters.map((value) => ({
    value,
    label: labelForFilter(value),
    group: filterGroupForTag(value),
    count: filterCasesByTags(cases, [value]).length,
  }));
});

export const visibleCasesAtom = Atom.make((get): ReadonlyArray<TriangleCase> => {
  const { cases, caseFilters } = get(labStateAtom);
  return filterCasesByTags(cases, caseFilters);
});
