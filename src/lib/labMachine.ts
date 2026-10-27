import { Effect, Option, Schema, Stream } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { FetchHttpClient, HttpClient } from "effect/http";
import { Machine } from "@typeonce/effect-machine";
import { AtomMachine } from "@typeonce/effect-machine/reactivity";
import { produce, type Draft } from "immer";
import {
  type CaseFilterOption,
  type LabState,
  LabStateFields,
  LabStateSchema,
  createInitialLabState,
  filterCasesByTags,
  makeCaseFilterOptions,
} from "./labState";
import {
  SideInputErrorSchema,
  SideValuesSchema,
  TriangleCaseSchema,
  validateSideValues,
  type SideValues,
  type CaseId,
  type TriangleCase,
  type TriangleRun,
} from "./triangle";
import { runTriangleTestRequest } from "./triangle.http";

const BatchCaseSchema = Schema.Struct({
  caseId: Schema.String,
  name: Schema.String,
  values: SideValuesSchema,
  current: Schema.Number,
  total: Schema.Number,
});

type BatchCase = Schema.Schema.Type<typeof BatchCaseSchema>;

const RunCaseStateSchema = Schema.TaggedStruct("RunningCase", {
  caseId: Schema.String,
  name: Schema.String,
  values: SideValuesSchema,
});

const RunBatchStateSchema = Schema.TaggedStruct("RunningBatch", {
  cases: Schema.Array(BatchCaseSchema),
});

const RunQuickTestStateSchema = Schema.TaggedStruct("RunningQuickTest", {
  values: SideValuesSchema,
});

const LabStates = Machine.state({
  fields: LabStateFields,
  states: {
    Ready: {},
    RunningCase: RunCaseStateSchema,
    RunningBatch: RunBatchStateSchema,
    RunningQuickTest: RunQuickTestStateSchema,
    RunFailed: {},
  },
});

export const LabEvents = Machine.eventsFromSchemas(
  Schema.TaggedUnion({
    ViewModeChanged: { mode: Schema.Literals(["library", "compact"]) },
    SelectCase: { caseId: Schema.String },
    UpdateCaseFilters: { filters: Schema.Array(Schema.String) },
    SaveCustomCase: { testCase: TriangleCaseSchema },
    DeleteCustomCase: { caseId: Schema.String },
    OpenNewCustomCaseDialog: {},
    OpenEditCustomCaseDialog: { caseId: Schema.String },
    CloseCustomCaseDialog: {},
    CustomCaseNameChanged: { name: Schema.String },
    CustomCaseNameRejected: { message: Schema.String },
    CustomCaseDescriptionChanged: { description: Schema.String },
    CustomCaseTagsChanged: { tags: Schema.String },
    CustomCaseSideChanged: {
      side: Schema.Literals(["a", "b", "c"]),
      value: Schema.String,
    },
    CustomCaseInputRejected: { error: SideInputErrorSchema },
    SideInputRejected: { error: SideInputErrorSchema },
    MobileCaseLibraryVisibilityChanged: { isOpen: Schema.Boolean },
    CaseToolsVisibilityChanged: { isOpen: Schema.Boolean },
    HistoryDrawerVisibilityChanged: { isOpen: Schema.Boolean },
    OpenDeleteConfirmation: {},
    CloseDeleteConfirmation: {},
    ToggleCaseForBatch: { caseId: Schema.String },
    UpdateSide: {
      side: Schema.Literals(["a", "b", "c"]),
      value: Schema.String,
    },
    QuickSideChanged: {
      side: Schema.Literals(["a", "b", "c"]),
      value: Schema.String,
    },
    ResetCase: {},
    RunCase: {},
    RunQuickTest: {},
    RunSelectedCases: {},
  }),
);

class BatchRunError extends Schema.TaggedError<BatchRunError>()(
  "BatchRunError",
  {
    caseId: Schema.String,
    caseName: Schema.String,
    completed: Schema.Number,
    total: Schema.Number,
    reason: Schema.String,
  },
) {}

type BatchStreamEvent =
  | { _tag: "Started"; batchCase: BatchCase }
  | { _tag: "Completed"; batchCase: BatchCase; result: TriangleRun };

function batchStream(
  cases: ReadonlyArray<BatchCase>,
): Stream.Stream<BatchStreamEvent, BatchRunError, HttpClient.HttpClient> {
  return cases.reduce<Stream.Stream<BatchStreamEvent, BatchRunError, HttpClient.HttpClient>>(
    (stream, batchCase) => {
      const started = Stream.succeed<BatchStreamEvent>({ _tag: "Started", batchCase });
      const completed = Stream.fromEffect(
        runTriangleTestRequest(batchCase.values).pipe(
          Effect.map((result) => ({ _tag: "Completed" as const, batchCase, result })),
          Effect.mapError((error) => new BatchRunError({
            caseId: batchCase.caseId,
            caseName: batchCase.name,
            completed: batchCase.current - 1,
            total: batchCase.total,
            reason: String(error),
          })),
        ),
      );
      return Stream.concat(stream, Stream.concat(started, completed));
    },
    Stream.empty as Stream.Stream<BatchStreamEvent, BatchRunError, HttpClient.HttpClient>,
  );
}

function clearRunState(draft: Draft<LabState>): void {
  draft.batchProgress = null;
  draft.batchError = null;
  draft.runError = null;
  draft.lastRunMode = null;
}

function selectCase(lab: LabState, caseId: CaseId): LabState {
  const testCase = lab.cases.find((candidate) => candidate.id === caseId);
  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.inputError = null;
    if (!testCase) return;

    draft.activeCaseId = testCase.id;
    draft.values = { ...lab.valuesByCaseId[testCase.id] };
    draft.result = lab.resultsByCaseId[testCase.id];
    draft.isDirty = lab.statuses[testCase.id] === "modified";
  });
}

function updateFilters(lab: LabState, filters: ReadonlyArray<string>): LabState {
  const matchingCases = filterCasesByTags(lab.cases, filters);
  const visibleCaseIds = new Set(matchingCases.map((testCase) => testCase.id));
  const selectedCaseIds = lab.selectedCaseIds.filter((caseId) => visibleCaseIds.has(caseId));
  const activeCaseIsVisible = matchingCases.some((testCase) => testCase.id === lab.activeCaseId);
  const nextCase = activeCaseIsVisible ? undefined : matchingCases[0];
  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.inputError = null;
    draft.caseFilters = [...filters];
    draft.selectedCaseIds = selectedCaseIds;
    if (!nextCase) return;

    draft.activeCaseId = nextCase.id;
    draft.values = { ...lab.valuesByCaseId[nextCase.id] };
    draft.result = lab.resultsByCaseId[nextCase.id];
    draft.isDirty = lab.statuses[nextCase.id] === "modified";
  });
}

function saveCustomCase(lab: LabState, testCase: TriangleCase): LabState {
  const draftCase = { ...testCase, tags: [...testCase.tags] };
  const existingCase = lab.cases.find((candidate) => candidate.id === testCase.id);
  if (existingCase?.source === "custom") {
    const previousValues = lab.valuesByCaseId[testCase.id];
    const valuesChanged =
      testCase.values.a !== previousValues.a ||
      testCase.values.b !== previousValues.b ||
      testCase.values.c !== previousValues.c;
    const result = valuesChanged ? null : lab.resultsByCaseId[testCase.id];

    return produce(lab, (draft) => {
      clearRunState(draft);
      draft.cases = draft.cases.map((candidate) => candidate.id === testCase.id ? draftCase : candidate);
      draft.caseFilters = ["custom"];
      draft.activeCaseId = testCase.id;
      draft.values = { ...testCase.values };
      draft.valuesByCaseId[testCase.id] = { ...testCase.values };
      draft.result = result;
      draft.resultsByCaseId[testCase.id] = result;
      draft.statuses[testCase.id] = result ? (result.failed ? "failed" : "passed") : "not-run";
      draft.isDirty = false;
      draft.inputError = null;
      draft.isCustomCaseDialogOpen = false;
      draft.customCaseNameError = null;
      draft.customCaseInputError = null;
    });
  }

  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.cases.push(draftCase);
    draft.caseFilters = ["custom"];
    draft.selectedCaseIds = [];
    draft.activeCaseId = testCase.id;
    draft.values = { ...testCase.values };
    draft.valuesByCaseId[testCase.id] = { ...testCase.values };
    draft.result = null;
    draft.resultsByCaseId[testCase.id] = null;
    draft.statuses[testCase.id] = "not-run";
    draft.isDirty = false;
    draft.inputError = null;
    draft.isCustomCaseDialogOpen = false;
    draft.customCaseNameError = null;
    draft.customCaseInputError = null;
  });
}

function deleteCustomCase(lab: LabState, caseId: CaseId): LabState {
  const activeCase = lab.cases.find((testCase) => testCase.id === caseId);
  if (activeCase?.source !== "custom") {
    return produce(lab, (draft) => {
      clearRunState(draft);
      draft.isDeleteDialogOpen = false;
    });
  }

  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.cases = draft.cases.filter((testCase) => testCase.id !== caseId);
    delete draft.valuesByCaseId[caseId];
    delete draft.resultsByCaseId[caseId];
    delete draft.statuses[caseId];
    const nextCase = draft.cases.find((testCase) => testCase.source !== "custom")!;
    draft.caseFilters = [];
    draft.selectedCaseIds = draft.selectedCaseIds.filter((selectedId) => selectedId !== caseId);
    draft.activeCaseId = nextCase.id;
    draft.values = { ...draft.valuesByCaseId[nextCase.id] };
    draft.result = draft.resultsByCaseId[nextCase.id];
    draft.isDirty = draft.statuses[nextCase.id] === "modified";
    draft.inputError = null;
    draft.isDeleteDialogOpen = false;
  });
}

function openNewCustomCaseDialog(lab: LabState): LabState {
  const customCount = lab.cases.filter((testCase) => testCase.source === "custom").length;
  const values = { ...lab.values };
  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.inputError = null;
    draft.customCaseDraft = {
      name: `Custom case ${customCount + 1}`,
      description: "",
      tags: "",
      values,
      editingCaseId: null,
    };
    draft.customCaseNameError = null;
    draft.customCaseInputError = validateSideValues(values);
    draft.isCustomCaseDialogOpen = true;
  });
}

function openEditCustomCaseDialog(lab: LabState, caseId: CaseId): LabState {
  const testCase = lab.cases.find((candidate) => candidate.id === caseId);
  if (testCase?.source !== "custom") return lab;
  const values = { ...lab.valuesByCaseId[caseId] };
  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.inputError = null;
    draft.customCaseDraft = {
      name: testCase.name,
      description: testCase.description ?? "",
      tags: testCase.tags.join(", "),
      values,
      editingCaseId: caseId,
    };
    draft.customCaseNameError = null;
    draft.customCaseInputError = validateSideValues(values);
    draft.isCustomCaseDialogOpen = true;
  });
}

function changeCustomCaseSide(
  lab: LabState,
  side: keyof SideValues,
  value: string,
): LabState {
  return produce(lab, (draft) => {
    draft.customCaseDraft.values[side] = value;
    draft.customCaseInputError = validateSideValues(draft.customCaseDraft.values);
  });
}

function toggleCaseForBatch(lab: LabState, caseId: CaseId): LabState {
  return produce(lab, (draft) => {
    clearRunState(draft);
    const index = draft.selectedCaseIds.indexOf(caseId);
    if (index >= 0) draft.selectedCaseIds.splice(index, 1);
    else draft.selectedCaseIds.push(caseId);
  });
}

function updateSide(lab: LabState, side: keyof SideValues, value: string): LabState {
  const activeCase = lab.cases.find((testCase) => testCase.id === lab.activeCaseId);
  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.inputError = null;
    if (activeCase?.source !== "custom") return;

    draft.values[side] = value;
    draft.valuesByCaseId[lab.activeCaseId] = { ...draft.values };
    draft.result = null;
    draft.resultsByCaseId[lab.activeCaseId] = null;
    draft.statuses[lab.activeCaseId] = "modified";
    draft.isDirty = true;
  });
}

function updateQuickSide(lab: LabState, side: keyof SideValues, value: string): LabState {
  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.quickValues[side] = value;
    draft.result = null;
    draft.inputError = null;
  });
}

function resetCase(lab: LabState): LabState {
  const testCase = lab.cases.find((candidate) => candidate.id === lab.activeCaseId)!;
  const priorRun = [...lab.history].reverse().find((run) =>
    run.caseId === testCase.id &&
    run.result.values.a === testCase.values.a &&
    run.result.values.b === testCase.values.b &&
    run.result.values.c === testCase.values.c,
  );
  const result = priorRun?.result ?? null;

  return produce(lab, (draft) => {
    clearRunState(draft);
    draft.values = { ...testCase.values };
    draft.valuesByCaseId[testCase.id] = { ...testCase.values };
    draft.result = result;
    draft.resultsByCaseId[testCase.id] = result;
    draft.statuses[testCase.id] = priorRun ? (priorRun.result.failed ? "failed" : "passed") : "not-run";
    draft.isDirty = false;
    draft.inputError = null;
  });
}

function selectedBatchCases(lab: LabState): ReadonlyArray<BatchCase> {
  const selected = lab.cases.filter((testCase) => lab.selectedCaseIds.includes(testCase.id));
  return selected.map((testCase, index) => ({
    caseId: testCase.id,
    name: testCase.name,
    values: { ...lab.valuesByCaseId[testCase.id] },
    current: index + 1,
    total: selected.length,
  }));
}

function recordRun(
  draft: Draft<LabState>,
  caseId: CaseId,
  name: string,
  result: TriangleRun,
  mode: "single" | "batch",
): void {
  draft.result = result;
  draft.resultsByCaseId[caseId] = result;
  draft.statuses[caseId] = result.failed ? "failed" : "passed";
  draft.history.push({ id: draft.history.length + 1, caseId, name, result });
  draft.isDirty = false;
  draft.runError = null;
  draft.lastRunMode = mode;
}

function recordQuickRun(draft: Draft<LabState>, result: TriangleRun): void {
  draft.result = result;
  draft.history.push({
    id: draft.history.length + 1,
    caseId: "manual-input",
    name: "Manual input",
    result,
  });
  draft.runError = null;
  draft.lastRunMode = "single";
}

type RootContext = { readonly root: LabState };
type RootEventContext<Event> = RootContext & { readonly event: Event };

const presentationTransitions = {
  ViewModeChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly mode: "library" | "compact" }>) => {
      if (root.viewMode === event.mode) return root;

      return produce(root, (draft) => {
        clearRunState(draft);
        draft.viewMode = event.mode;
        draft.inputError = null;
        if (event.mode === "library") {
          draft.values = { ...root.valuesByCaseId[root.activeCaseId] };
          draft.result = root.resultsByCaseId[root.activeCaseId];
          draft.isDirty = root.statuses[root.activeCaseId] === "modified";
        } else {
          draft.result = null;
          draft.isDirty = false;
        }
      });
    },
  },
  OpenNewCustomCaseDialog: {
    update: "root" as const,
    data: ({ root }: RootContext) => openNewCustomCaseDialog(root),
  },
  OpenEditCustomCaseDialog: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly caseId: CaseId }>) =>
      openEditCustomCaseDialog(root, event.caseId),
  },
  CloseCustomCaseDialog: {
    update: "root" as const,
    data: ({ root }: RootContext) => produce(root, (draft) => {
      draft.isCustomCaseDialogOpen = false;
    }),
  },
  CustomCaseNameChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly name: string }>) => produce(root, (draft) => {
      draft.customCaseDraft.name = event.name;
      if (event.name.trim()) draft.customCaseNameError = null;
    }),
  },
  CustomCaseNameRejected: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly message: string }>) => produce(root, (draft) => {
      draft.customCaseNameError = event.message;
    }),
  },
  CustomCaseDescriptionChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly description: string }>) => produce(root, (draft) => {
      draft.customCaseDraft.description = event.description;
    }),
  },
  CustomCaseTagsChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly tags: string }>) => produce(root, (draft) => {
      draft.customCaseDraft.tags = event.tags;
    }),
  },
  CustomCaseSideChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly side: keyof SideValues; readonly value: string }>) =>
      changeCustomCaseSide(root, event.side, event.value),
  },
  CustomCaseInputRejected: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly error: NonNullable<LabState["customCaseInputError"]> }>) =>
      produce(root, (draft) => {
        draft.customCaseInputError = event.error;
      }),
  },
  SideInputRejected: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly error: NonNullable<LabState["inputError"]> }>) =>
      produce(root, (draft) => {
        draft.inputError = event.error;
      }),
  },
  MobileCaseLibraryVisibilityChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly isOpen: boolean }>) => produce(root, (draft) => {
      draft.isMobileCaseLibraryOpen = event.isOpen;
    }),
  },
  CaseToolsVisibilityChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly isOpen: boolean }>) => produce(root, (draft) => {
      draft.isCaseToolsOpen = event.isOpen;
    }),
  },
  HistoryDrawerVisibilityChanged: {
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly isOpen: boolean }>) => produce(root, (draft) => {
      draft.isHistoryDrawerOpen = event.isOpen;
    }),
  },
  OpenDeleteConfirmation: {
    update: "root" as const,
    data: ({ root }: RootContext) => produce(root, (draft) => {
      draft.isDeleteDialogOpen = true;
    }),
  },
  CloseDeleteConfirmation: {
    update: "root" as const,
    data: ({ root }: RootContext) => produce(root, (draft) => {
      draft.isDeleteDialogOpen = false;
    }),
  },
};

const syncTransitions = {
  SelectCase: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly caseId: CaseId }>) => ({
      target: undefined,
      update: selectCase(root, event.caseId),
    }),
  },
  UpdateCaseFilters: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly filters: ReadonlyArray<string> }>) => ({
      target: undefined,
      update: updateFilters(root, event.filters),
    }),
  },
  SaveCustomCase: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly testCase: TriangleCase }>) => ({
      target: undefined,
      update: saveCustomCase(root, event.testCase),
    }),
  },
  DeleteCustomCase: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly caseId: CaseId }>) => ({
      target: undefined,
      update: deleteCustomCase(root, event.caseId),
    }),
  },
  ToggleCaseForBatch: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly caseId: CaseId }>) => ({
      target: undefined,
      update: toggleCaseForBatch(root, event.caseId),
    }),
  },
  UpdateSide: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly side: keyof SideValues; readonly value: string }>) => ({
      target: undefined,
      update: updateSide(root, event.side, event.value),
    }),
  },
  QuickSideChanged: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root, event }: RootEventContext<{ readonly side: keyof SideValues; readonly value: string }>) => ({
      target: undefined,
      update: updateQuickSide(root, event.side, event.value),
    }),
  },
  ResetCase: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root }: RootContext) => ({
      target: undefined,
      update: resetCase(root),
    }),
  },
};

const runTransitions = {
  RunCase: {
    target: "RunningCase" as const,
    update: "root" as const,
    data: ({ root }: RootContext) => {
      const activeCase = root.cases.find((testCase) => testCase.id === root.activeCaseId)!;
      const update = produce(root, (draft) => {
        clearRunState(draft);
        draft.inputError = null;
        draft.result = null;
        draft.resultsByCaseId[activeCase.id] = null;
        draft.statuses[activeCase.id] = "not-run";
        draft.lastRunMode = "single";
      });
      return {
        target: {
          caseId: activeCase.id,
          name: activeCase.name,
          values: { ...root.values },
        },
        update,
      };
    },
  },
  RunQuickTest: {
    target: "RunningQuickTest" as const,
    update: "root" as const,
    data: ({ root }: RootContext) => {
      const values = { ...root.quickValues };
      const update = produce(root, (draft) => {
        clearRunState(draft);
        draft.inputError = null;
        draft.result = null;
      });
      return { target: { values }, update };
    },
  },
  RunSelectedCases: {
    target: "RunningBatch" as const,
    update: "root" as const,
    guard: ({ root }: RootContext) => selectedBatchCases(root).length > 0,
    data: ({ root }: RootContext) => {
      const cases = selectedBatchCases(root);
      const firstCase = cases[0];
      const update = produce(root, (draft) => {
        clearRunState(draft);
        draft.inputError = null;
        draft.activeCaseId = firstCase.caseId;
        draft.values = { ...firstCase.values };
        draft.result = null;
        draft.resultsByCaseId[firstCase.caseId] = null;
        draft.statuses[firstCase.caseId] = "not-run";
        draft.batchProgress = { current: 1, total: cases.length };
        draft.lastRunMode = "batch";
      });
      return {
        target: { cases },
        update,
      };
    },
  },
};

const startRunEvent = {
  ...syncTransitions,
  ...presentationTransitions,
  ...runTransitions,
};

export const LabMachine = Machine.make({
  id: "TriangleTestLab",
  root: LabStates,
  events: LabEvents,
  effects: {
    runTriangle: (values: SideValues) => runTriangleTestRequest(values),
  },
  streams: {
    runBatch: batchStream,
  },
}).handle({
  root: createInitialLabState,
  initial: { target: "Ready" },
  states: {
    Ready: { on: startRunEvent },
    RunningCase: {
      on: { ...syncTransitions, ...presentationTransitions },
      invoke: {
        src: "runTriangle",
        input: ({ state }) => state.values,
        onDone: {
          target: "Ready",
          update: "root",
          data: ({ root, state, output }) => ({
            target: undefined,
            update: produce(root, (draft) => {
              recordRun(draft, state.caseId, state.name, output, "single");
            }),
          }),
        },
        onFailure: {
          target: "RunFailed",
          update: "root",
          data: ({ root, error }) => {
            const message = String(error);
            return {
              target: undefined,
              update: produce(root, (draft) => {
                clearRunState(draft);
                draft.runError = message;
              }),
            };
          },
        },
      },
    },
    RunningQuickTest: {
      on: { ...syncTransitions, ...presentationTransitions },
      invoke: {
        src: "runTriangle",
        input: ({ state }) => state.values,
        onDone: {
          target: "Ready",
          update: "root",
          data: ({ root, output }) => ({
            target: undefined,
            update: produce(root, (draft) => {
              recordQuickRun(draft, output);
            }),
          }),
        },
        onFailure: {
          target: "RunFailed",
          update: "root",
          data: ({ root, error }) => ({
            target: undefined,
            update: produce(root, (draft) => {
              clearRunState(draft);
              draft.runError = String(error);
            }),
          }),
        },
      },
    },
    RunningBatch: {
      on: { ...syncTransitions, ...presentationTransitions },
      invoke: {
        src: "runBatch",
        input: ({ state }) => state.cases,
        onElement: {
          update: "root",
          data: ({ root, element }) => {
            if (element._tag === "Started") {
              const { batchCase } = element;
              return produce(root, (draft) => {
                draft.activeCaseId = batchCase.caseId;
                draft.values = { ...batchCase.values };
                draft.result = null;
                draft.resultsByCaseId[batchCase.caseId] = null;
                draft.statuses[batchCase.caseId] = "not-run";
                draft.batchProgress = { current: batchCase.current, total: batchCase.total };
                draft.batchError = null;
                draft.runError = null;
                draft.lastRunMode = null;
              });
            }

            return produce(root, (draft) => {
              recordRun(
                draft,
                element.batchCase.caseId,
                element.batchCase.name,
                element.result,
                "batch",
              );
              draft.batchProgress = {
                current: element.batchCase.current,
                total: element.batchCase.total,
              };
              draft.batchError = null;
            });
          },
        },
        onDone: {
          target: "Ready",
          update: "root",
          data: ({ root }) => ({
            target: undefined,
            update: produce(root, (draft) => {
              draft.batchProgress = null;
              draft.batchError = null;
              draft.runError = null;
              draft.lastRunMode = "batch";
            }),
          }),
        },
        onFailure: {
          target: "RunFailed",
          update: "root",
          data: ({ root, error }) => {
            const batchError =
              "Stopped after " + error.completed + " of " + error.total +
              '. Could not run "' + error.caseName + '". Retry the selected cases.';
            const update = produce(root, (draft) => {
              draft.activeCaseId = error.caseId;
              draft.values = { ...(root.valuesByCaseId[error.caseId] ?? root.values) };
              draft.result = null;
              draft.resultsByCaseId[error.caseId] = null;
              draft.statuses[error.caseId] = "not-run";
              draft.batchProgress = null;
              draft.batchError = batchError;
              draft.runError = error.reason;
              draft.lastRunMode = "batch";
            });
            return {
              target: undefined,
              update,
            };
          },
        },
      },
    },
    RunFailed: { on: startRunEvent },
  },
});

const labRuntime = Atom.runtime(FetchHttpClient.layer);
export const labMachineAtom = AtomMachine.bind(labRuntime).make(LabMachine);

const labValueResultAtom = AtomMachine.select(labMachineAtom, "");
const runningCaseResultAtom = AtomMachine.matches(labMachineAtom, "RunningCase");
const runningBatchResultAtom = AtomMachine.matches(labMachineAtom, "RunningBatch");
const runningQuickTestResultAtom = AtomMachine.matches(labMachineAtom, "RunningQuickTest");

function currentLabValue(result: AsyncResult.AsyncResult<Option.Option<Schema.Schema.Type<typeof LabStateSchema>>, unknown>) {
  const selected = result._tag === "Success"
    ? result.value
    : result._tag === "Failure" && result.previousSuccess._tag === "Some"
      ? result.previousSuccess.value.value
      : Option.none();
  return Option.match(selected, {
    onNone: createInitialLabState,
    onSome: (lab) => lab,
  });
}

function currentBoolean(result: AsyncResult.AsyncResult<boolean, unknown>): boolean {
  return result._tag === "Success" ? result.value : false;
}

export const labStateAtom = Atom.make((get) => currentLabValue(get(labValueResultAtom)));
export const caseFilterOptionsAtom = Atom.make((get): ReadonlyArray<CaseFilterOption> =>
  makeCaseFilterOptions(get(labStateAtom).cases),
);
export const visibleCasesAtom = Atom.make((get): ReadonlyArray<TriangleCase> => {
  const { cases, caseFilters } = get(labStateAtom);
  return filterCasesByTags(cases, caseFilters);
});
export const isRunningCaseAtom = Atom.make((get) => currentBoolean(get(runningCaseResultAtom)));
export const isRunningBatchAtom = Atom.make((get) => currentBoolean(get(runningBatchResultAtom)));
export const isRunningQuickTestAtom = Atom.make((get) => currentBoolean(get(runningQuickTestResultAtom)));
export const isBusyAtom = Atom.make((get) =>
  get(isRunningCaseAtom) || get(isRunningBatchAtom) || get(isRunningQuickTestAtom),
);
