import { Schema } from "effect";
import {
  labCases,
  verifiedCases,
  SideInputErrorSchema,
  SideValuesInputSchema,
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
  values: SideValuesInputSchema,
  valuesByCaseId: Schema.Record(Schema.String, SideValuesInputSchema),
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
  quickValues: SideValuesInputSchema,
  customCaseDraft: Schema.Struct({
    name: Schema.String,
    description: Schema.String,
    tags: Schema.String,
    values: SideValuesInputSchema,
    editingCaseId: Schema.NullOr(Schema.String),
  }),
  customCaseNameError: Schema.NullOr(Schema.String),
  customCaseInputError: Schema.NullOr(SideInputErrorSchema),
  isCustomCaseDialogOpen: Schema.Boolean,
  isMobileCaseLibraryOpen: Schema.Boolean,
  isCaseToolsOpen: Schema.Boolean,
  isAdvancedFiltersOpen: Schema.Boolean,
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
    isAdvancedFiltersOpen: false,
    isHistoryDrawerOpen: false,
    isDeleteDialogOpen: false,
  };
}

export const sourceCaseFilters = ["example:defect", "example:success", "custom"] as const;

type TagFilterSource = "example" | "custom";

type TagFilter = {
  source: TagFilterSource;
  tag: string;
};

function tagFilterValue(source: TagFilterSource, tag: string): string {
  return `${source}-tag:${tag}`;
}

function parseTagFilter(filter: string): TagFilter | null {
  if (filter.startsWith("example-tag:")) {
    return { source: "example", tag: filter.slice("example-tag:".length) };
  }
  if (filter.startsWith("custom-tag:")) {
    return { source: "custom", tag: filter.slice("custom-tag:".length) };
  }
  return null;
}

function filterGroupForTag(filter: string): string {
  if (sourceCaseFilters.includes(filter as (typeof sourceCaseFilters)[number])) return "Case source";
  if (parseTagFilter(filter)?.source === "example") return "Example tags";
  return "Custom tags";
}

function labelForFilter(filter: string): string {
  if (filter === "example:defect") return "Verified defects";
  if (filter === "example:success") return "Passing examples";
  if (filter === "custom") return "Custom cases";
  const tagFilter = parseTagFilter(filter);
  if (!tagFilter) return filter;
  return tagFilter.source === "example"
    ? tagFilter.tag.replace(/^\w/, (letter) => letter.toUpperCase())
    : tagFilter.tag;
}

export function filterCasesByTags(
  cases: ReadonlyArray<TriangleCase>,
  filters: ReadonlyArray<string>,
): ReadonlyArray<TriangleCase> {
  if (filters.length === 0) return cases;

  const caseTypeFilters = filters.filter((filter) =>
    sourceCaseFilters.includes(filter as (typeof sourceCaseFilters)[number]),
  );
  const tagFilters = filters.flatMap((filter) => {
    const tagFilter = parseTagFilter(filter);
    return tagFilter ? [tagFilter] : [];
  });

  if (caseTypeFilters.length + tagFilters.length !== filters.length) return [];

  return cases.filter((testCase) => {
    const matchesCaseType = caseTypeFilters.length === 0 ||
      caseTypeFilters.includes(testCase.source as (typeof sourceCaseFilters)[number]);
    if (!matchesCaseType) return false;

    const source: TagFilterSource = testCase.source === "custom" ? "custom" : "example";
    if (tagFilters.some((tagFilter) => tagFilter.source !== source)) return false;
    return tagFilters.every((tagFilter) => testCase.tags.includes(tagFilter.tag));
  });
}

export function makeCaseFilterOptions(cases: ReadonlyArray<TriangleCase>): ReadonlyArray<CaseFilterOption> {
  const exampleTags = new Set(
    cases
      .filter((testCase) => testCase.source !== "custom")
      .flatMap((testCase) => testCase.tags),
  );
  const customTags = new Set(
    cases
      .filter((testCase) => testCase.source === "custom")
      .flatMap((testCase) => testCase.tags),
  );
  const filters = [
    ...sourceCaseFilters,
    ...[...exampleTags].sort().map((tag) => tagFilterValue("example", tag)),
    ...[...customTags].sort().map((tag) => tagFilterValue("custom", tag)),
  ];

  return filters.map((value) => ({
    value,
    label: labelForFilter(value),
    group: filterGroupForTag(value),
    count: filterCasesByTags(cases, [value]).length,
  }));
}
