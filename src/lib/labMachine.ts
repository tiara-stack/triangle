import { Effect, Option, Schema, Stream } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { FetchHttpClient, HttpClient } from "effect/http";
import { Machine } from "@typeonce/effect-machine";
import { AtomMachine } from "@typeonce/effect-machine/reactivity";
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
  SideValuesSchema,
  TriangleCaseSchema,
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

const LabStates = Machine.state({
  fields: LabStateFields,
  states: {
    Ready: {},
    RunningCase: RunCaseStateSchema,
    RunningBatch: RunBatchStateSchema,
    RunFailed: {},
  },
});

export const LabEvents = Machine.eventsFromSchemas(
  Schema.TaggedUnion({
    SelectCase: { caseId: Schema.String },
    UpdateCaseFilters: { filters: Schema.Array(Schema.String) },
    SaveCustomCase: { testCase: TriangleCaseSchema },
    DeleteCustomCase: { caseId: Schema.String },
    ToggleCaseForBatch: { caseId: Schema.String },
    UpdateSide: {
      side: Schema.Literals(["a", "b", "c"]),
      value: Schema.String,
    },
    ResetCase: {},
    ClearRunError: {},
    RunCase: {},
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

function withClearedRunState(lab: LabState): LabState {
  return {
    ...lab,
    batchProgress: null,
    batchError: null,
    runError: null,
    lastRunMode: null,
  };
}

function selectCase(lab: LabState, caseId: CaseId): LabState {
  const testCase = lab.cases.find((candidate) => candidate.id === caseId);
  if (!testCase) return withClearedRunState(lab);
  return {
    ...withClearedRunState(lab),
    activeCaseId: testCase.id,
    values: lab.valuesByCaseId[testCase.id],
    result: lab.resultsByCaseId[testCase.id],
    isDirty: lab.statuses[testCase.id] === "modified",
  };
}

function updateFilters(lab: LabState, filters: ReadonlyArray<string>): LabState {
  const matchingCases = filterCasesByTags(lab.cases, filters);
  const visibleCaseIds = new Set(matchingCases.map((testCase) => testCase.id));
  const selectedCaseIds = lab.selectedCaseIds.filter((caseId) => visibleCaseIds.has(caseId));
  const activeCaseIsVisible = matchingCases.some((testCase) => testCase.id === lab.activeCaseId);
  const nextCase = activeCaseIsVisible ? undefined : matchingCases[0];
  const cleared = withClearedRunState(lab);

  if (!nextCase) return { ...cleared, caseFilters: filters, selectedCaseIds };

  return {
    ...cleared,
    caseFilters: filters,
    selectedCaseIds,
    activeCaseId: nextCase.id,
    values: lab.valuesByCaseId[nextCase.id],
    result: lab.resultsByCaseId[nextCase.id],
    isDirty: lab.statuses[nextCase.id] === "modified",
  };
}

function saveCustomCase(lab: LabState, testCase: TriangleCase): LabState {
  const existingCase = lab.cases.find((candidate) => candidate.id === testCase.id);
  if (existingCase?.source === "custom") {
    const previousValues = lab.valuesByCaseId[testCase.id];
    const valuesChanged =
      testCase.values.a !== previousValues.a ||
      testCase.values.b !== previousValues.b ||
      testCase.values.c !== previousValues.c;
    const result = valuesChanged ? null : lab.resultsByCaseId[testCase.id];

    return {
      ...withClearedRunState(lab),
      cases: lab.cases.map((candidate) => candidate.id === testCase.id ? testCase : candidate),
      caseFilters: ["custom"],
      activeCaseId: testCase.id,
      values: testCase.values,
      valuesByCaseId: { ...lab.valuesByCaseId, [testCase.id]: testCase.values },
      result,
      resultsByCaseId: { ...lab.resultsByCaseId, [testCase.id]: result },
      statuses: {
        ...lab.statuses,
        [testCase.id]: result ? (result.failed ? "failed" : "passed") : "not-run",
      },
      isDirty: false,
    };
  }

  return {
    ...withClearedRunState(lab),
    cases: [...lab.cases, testCase],
    caseFilters: ["custom"],
    selectedCaseIds: [],
    activeCaseId: testCase.id,
    values: testCase.values,
    valuesByCaseId: { ...lab.valuesByCaseId, [testCase.id]: testCase.values },
    result: null,
    resultsByCaseId: { ...lab.resultsByCaseId, [testCase.id]: null },
    statuses: { ...lab.statuses, [testCase.id]: "not-run" },
    isDirty: false,
  };
}

function deleteCustomCase(lab: LabState, caseId: CaseId): LabState {
  const activeCase = lab.cases.find((testCase) => testCase.id === caseId);
  if (activeCase?.source !== "custom") return withClearedRunState(lab);

  const cases = lab.cases.filter((testCase) => testCase.id !== caseId);
  const valuesByCaseId = { ...lab.valuesByCaseId };
  const resultsByCaseId = { ...lab.resultsByCaseId };
  const statuses = { ...lab.statuses };
  delete valuesByCaseId[caseId];
  delete resultsByCaseId[caseId];
  delete statuses[caseId];
  const nextCase = cases.find((testCase) => testCase.source !== "custom")!;

  return {
    ...withClearedRunState(lab),
    cases,
    caseFilters: [],
    selectedCaseIds: lab.selectedCaseIds.filter((selectedId) => selectedId !== caseId),
    activeCaseId: nextCase.id,
    values: valuesByCaseId[nextCase.id],
    valuesByCaseId,
    result: resultsByCaseId[nextCase.id],
    resultsByCaseId,
    statuses,
    isDirty: statuses[nextCase.id] === "modified",
  };
}

function toggleCaseForBatch(lab: LabState, caseId: CaseId): LabState {
  return {
    ...withClearedRunState(lab),
    selectedCaseIds: lab.selectedCaseIds.includes(caseId)
      ? lab.selectedCaseIds.filter((selectedId) => selectedId !== caseId)
      : [...lab.selectedCaseIds, caseId],
  };
}

function updateSide(lab: LabState, side: keyof SideValues, value: string): LabState {
  const activeCase = lab.cases.find((testCase) => testCase.id === lab.activeCaseId);
  if (activeCase?.source !== "custom") return withClearedRunState(lab);

  const values = { ...lab.values, [side]: value };
  return {
    ...withClearedRunState(lab),
    values,
    valuesByCaseId: { ...lab.valuesByCaseId, [lab.activeCaseId]: values },
    result: null,
    resultsByCaseId: { ...lab.resultsByCaseId, [lab.activeCaseId]: null },
    statuses: { ...lab.statuses, [lab.activeCaseId]: "modified" },
    isDirty: true,
  };
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

  return {
    ...withClearedRunState(lab),
    values: testCase.values,
    valuesByCaseId: { ...lab.valuesByCaseId, [testCase.id]: testCase.values },
    result,
    resultsByCaseId: { ...lab.resultsByCaseId, [testCase.id]: result },
    statuses: {
      ...lab.statuses,
      [testCase.id]: priorRun ? (priorRun.result.failed ? "failed" : "passed") : "not-run",
    },
    isDirty: false,
  };
}

function selectedBatchCases(lab: LabState): ReadonlyArray<BatchCase> {
  const selected = lab.cases.filter((testCase) => lab.selectedCaseIds.includes(testCase.id));
  return selected.map((testCase, index) => ({
    caseId: testCase.id,
    name: testCase.name,
    values: lab.valuesByCaseId[testCase.id],
    current: index + 1,
    total: selected.length,
  }));
}

function recordRun(
  lab: LabState,
  caseId: CaseId,
  name: string,
  result: TriangleRun,
  mode: "single" | "batch",
): LabState {
  return {
    ...lab,
    result,
    resultsByCaseId: { ...lab.resultsByCaseId, [caseId]: result },
    statuses: { ...lab.statuses, [caseId]: result.failed ? "failed" : "passed" },
    history: [
      ...lab.history,
      { id: lab.history.length + 1, caseId, name, result },
    ],
    isDirty: false,
    runError: null,
    lastRunMode: mode,
  };
}

type RootContext = { readonly root: LabState };
type RootEventContext<Event> = RootContext & { readonly event: Event };

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
  ResetCase: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root }: RootContext) => ({
      target: undefined,
      update: resetCase(root),
    }),
  },
  ClearRunError: {
    target: "Ready" as const,
    update: "root" as const,
    data: ({ root }: RootContext) => ({
      target: undefined,
      update: withClearedRunState(root),
    }),
  },
};

const runTransitions = {
  RunCase: {
    target: "RunningCase" as const,
    update: "root" as const,
    data: ({ root }: RootContext) => {
      const activeCase = root.cases.find((testCase) => testCase.id === root.activeCaseId)!;
      const update: LabState = {
        ...withClearedRunState(root),
        result: null,
        resultsByCaseId: { ...root.resultsByCaseId, [activeCase.id]: null },
        statuses: { ...root.statuses, [activeCase.id]: "not-run" },
        lastRunMode: "single",
      };
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
  RunSelectedCases: {
    target: "RunningBatch" as const,
    update: "root" as const,
    guard: ({ root }: RootContext) => selectedBatchCases(root).length > 0,
    data: ({ root }: RootContext) => {
      const cases = selectedBatchCases(root);
      const firstCase = cases[0];
      const update: LabState = {
        ...withClearedRunState(root),
        activeCaseId: firstCase.caseId,
        values: firstCase.values,
        result: null,
        resultsByCaseId: { ...root.resultsByCaseId, [firstCase.caseId]: null },
        statuses: { ...root.statuses, [firstCase.caseId]: "not-run" },
        batchProgress: { current: 1, total: cases.length },
        lastRunMode: "batch",
      };
      return {
        target: { cases },
        update,
      };
    },
  },
};

const startRunEvent = {
  ...syncTransitions,
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
      on: syncTransitions,
      invoke: {
        src: "runTriangle",
        input: ({ state }) => state.values,
        onDone: {
          target: "Ready",
          update: "root",
          data: ({ root, state, output }) => ({
            target: undefined,
            update: recordRun(root, state.caseId, state.name, output, "single"),
          }),
        },
        onFailure: {
          target: "RunFailed",
          update: "root",
          data: ({ root, error }) => {
            const message = String(error);
            return {
              target: undefined,
              update: { ...withClearedRunState(root), runError: message },
            };
          },
        },
      },
    },
    RunningBatch: {
      on: syncTransitions,
      invoke: {
        src: "runBatch",
        input: ({ state }) => state.cases,
        onElement: {
          update: "root",
          data: ({ root, element }) => {
            if (element._tag === "Started") {
              const { batchCase } = element;
              const update: LabState = {
                ...root,
                activeCaseId: batchCase.caseId,
                values: batchCase.values,
                result: null,
                resultsByCaseId: { ...root.resultsByCaseId, [batchCase.caseId]: null },
                statuses: { ...root.statuses, [batchCase.caseId]: "not-run" },
                batchProgress: { current: batchCase.current, total: batchCase.total },
                batchError: null,
                runError: null,
                lastRunMode: null,
              };
              return update;
            }

            const update: LabState = {
              ...recordRun(
                root,
                element.batchCase.caseId,
                element.batchCase.name,
                element.result,
                "batch",
              ),
              batchProgress: {
                current: element.batchCase.current,
                total: element.batchCase.total,
              },
              batchError: null,
            };
            return update;
          },
        },
        onDone: {
          target: "Ready",
          update: "root",
          data: ({ root }) => {
            const update: LabState = {
              ...root,
              batchProgress: null,
              batchError: null,
              runError: null,
              lastRunMode: "batch",
            };
            return { target: undefined, update };
          },
        },
        onFailure: {
          target: "RunFailed",
          update: "root",
          data: ({ root, error }) => {
            const batchError =
              "Stopped after " + error.completed + " of " + error.total +
              '. Could not run "' + error.caseName + '". Retry the selected cases.';
            const update: LabState = {
              ...root,
              activeCaseId: error.caseId,
              values: root.valuesByCaseId[error.caseId] ?? root.values,
              result: null,
              resultsByCaseId: { ...root.resultsByCaseId, [error.caseId]: null },
              statuses: { ...root.statuses, [error.caseId]: "not-run" },
              batchProgress: null,
              batchError,
              runError: error.reason,
              lastRunMode: "batch",
            };
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
export const isBusyAtom = Atom.make((get) => get(isRunningCaseAtom) || get(isRunningBatchAtom));
