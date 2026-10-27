import { Schema } from "effect";
import {
  labCases,
  verifiedCases,
  SideInputErrorSchema,
  SideValuesSchema,
  TriangleCaseSchema,
  TriangleRunSchema,
  type CaseId,
  type SideValues,
  type TriangleCase,
  type TriangleRun,
} from "./triangle";

export type CaseStatus = "failed" | "passed" | "not-run" | "modified";

export type BatchProgress = {
  current: number;
  total: number;
};

export type LastRunMode = "single" | "batch";

export type RunRecord = {
  id: number;
  caseId: CaseId;
  name: string;
  result: TriangleRun;
};

const CaseStatusSchema = Schema.Literals(["failed", "passed", "not-run", "modified"]);

const RunRecordSchema = Schema.Struct({
  id: Schema.Number,
  caseId: Schema.String,
  name: Schema.String,
  result: TriangleRunSchema,
});

const BatchProgressSchema = Schema.Struct({
  current: Schema.Number,
  total: Schema.Number,
});

export const LabStateFields = {
  viewMode: Schema.Literals(["library", "compact"]),
  cases: Schema.Array(TriangleCaseSchema),
  caseFilters: Schema.Array(Schema.String),
  selectedCaseIds: Schema.Array(Schema.String),
  activeCaseId: Schema.String,
  values: SideValuesSchema,
  valuesByCaseId: Schema.Record(Schema.String, SideValuesSchema),
  result: Schema.NullOr(TriangleRunSchema),
  resultsByCaseId: Schema.Record(Schema.String, Schema.NullOr(TriangleRunSchema)),
  statuses: Schema.Record(Schema.String, CaseStatusSchema),
  history: Schema.Array(RunRecordSchema),
  isDirty: Schema.Boolean,
  batchProgress: Schema.NullOr(BatchProgressSchema),
  batchError: Schema.NullOr(Schema.String),
  runError: Schema.NullOr(Schema.String),
  lastRunMode: Schema.NullOr(Schema.Literals(["single", "batch"])),
  inputError: Schema.NullOr(SideInputErrorSchema),
  quickValues: SideValuesSchema,
  customCaseDraft: Schema.Struct({
    name: Schema.String,
    description: Schema.String,
    tags: Schema.String,
    values: SideValuesSchema,
    editingCaseId: Schema.NullOr(Schema.String),
  }),
  customCaseNameError: Schema.NullOr(Schema.String),
  customCaseInputError: Schema.NullOr(SideInputErrorSchema),
  isCustomCaseDialogOpen: Schema.Boolean,
  isMobileCaseLibraryOpen: Schema.Boolean,
  isCaseToolsOpen: Schema.Boolean,
  isHistoryDrawerOpen: Schema.Boolean,
  isDeleteDialogOpen: Schema.Boolean,
} as const;

export const LabStateSchema = Schema.Struct(LabStateFields);

export type LabState = Schema.Schema.Type<typeof LabStateSchema>;

export type CaseFilterOption = {
  value: string;
  label: string;
  group: string;
  count: number;
};

const firstCase = verifiedCases[0];

export function createInitialLabState(): LabState {
  return {
    viewMode: "library",
    cases: labCases,
    caseFilters: ["example:defect", "example:success"],
    selectedCaseIds: [],
    activeCaseId: firstCase.id,
    values: firstCase.values,
    valuesByCaseId: Object.fromEntries(
      labCases.map((testCase) => [testCase.id, { ...testCase.values }]),
    ) as Record<CaseId, SideValues>,
    result: null,
    resultsByCaseId: Object.fromEntries(
      labCases.map((testCase) => [testCase.id, null]),
    ) as Record<CaseId, TriangleRun | null>,
    statuses: Object.fromEntries(
      labCases.map((testCase) => [testCase.id, "not-run"]),
    ) as Record<CaseId, CaseStatus>,
    history: [],
    isDirty: false,
    batchProgress: null,
    batchError: null,
    runError: null,
    lastRunMode: null,
    inputError: null,
    quickValues: { a: "", b: "", c: "" },
    customCaseDraft: {
      name: "",
      description: "",
      tags: "",
      values: { a: "", b: "", c: "" },
      editingCaseId: null,
    },
    customCaseNameError: null,
    customCaseInputError: null,
    isCustomCaseDialogOpen: false,
    isMobileCaseLibraryOpen: false,
    isCaseToolsOpen: false,
    isHistoryDrawerOpen: false,
    isDeleteDialogOpen: false,
  };
}

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
  if (filter === "example:success") return "Passing examples";
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

export function makeCaseFilterOptions(cases: ReadonlyArray<TriangleCase>): ReadonlyArray<CaseFilterOption> {
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
}
