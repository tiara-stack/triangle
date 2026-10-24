import { createFileRoute } from "@tanstack/react-router";
import { useAtom, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { createRef, useRef, useState, type FormEvent, type RefObject } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Center } from "@astryxdesign/core/Center";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { ScrollableArea } from "@astryxdesign/core/ScrollableArea";
import { Section } from "@astryxdesign/core/Section";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { TriangleDiagram } from "../components/TriangleDiagram";
import { runTriangleAtom } from "../lib/labActions";
import {
  caseFilterOptionsAtom,
  filterCasesByTags,
  labStateAtom,
  sourceCaseFilters,
  visibleCasesAtom,
  type CaseFilterOption,
} from "../lib/labState";
import {
  type CaseId,
  type SideValues,
  type TriangleCase,
  type TriangleOutput,
} from "../lib/triangle";

export const Route = createFileRoute("/")({ component: TriangleLab });

type InputError = {
  side: keyof SideValues;
  message: string;
};

let customCaseIdSequence = 0;

function createSessionCaseId(cases: ReadonlyArray<TriangleCase>): CaseId {
  let id: CaseId;
  do {
    customCaseIdSequence += 1;
    id = `custom-${Date.now().toString(36)}-${customCaseIdSequence.toString(36)}`;
  } while (cases.some((testCase) => testCase.id === id));
  return id;
}

function displayTriangleOutput(output: TriangleOutput): string {
  return output === "NotATriangle" ? "Not a triangle" : output;
}

function validateSideValues(values: SideValues): InputError | null {
  for (const side of ["a", "b", "c"] as const) {
    const value = values[side].trim();
    if (!/^\d+$/.test(value)) {
      return { side, message: `Side ${side} must be a whole number from 1 to 200.` };
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 200) {
      return { side, message: `Side ${side} must be a whole number from 1 to 200.` };
    }
  }

  return null;
}

function parseCustomTags(value: string): ReadonlyArray<string> {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, " "))
      .filter((tag) =>
        tag.length > 0 &&
        tag !== "all" &&
        !sourceCaseFilters.includes(tag as (typeof sourceCaseFilters)[number]) &&
        !tag.startsWith("example:"),
      ),
  )];
}

function groupFilterOptions(options: ReadonlyArray<CaseFilterOption>) {
  const groups = new Map<string, Array<CaseFilterOption>>();
  for (const option of options) {
    const group = groups.get(option.group) ?? [];
    group.push(option);
    groups.set(option.group, group);
  }
  return [...groups];
}

function formatSelectedFilters(items: ReadonlyArray<{ value: string; label: string }>): string {
  const selectedValues = new Set(items.map(({ value }) => value));
  if (selectedValues.has("example:defect") && selectedValues.has("example:success")) {
    return "Defects + successes";
  }

  const labels = items.map(({ label }) => label.replace(/\s+\(\d+\)$/, ""));
  if (labels.length <= 2) return labels.join(", ");
  return labels.slice(0, 2).join(", ") + " +" + (labels.length - 2) + " more";
}

function describeVisibleCaseCount(visibleCount: number, totalCount: number): string {
  const noun = totalCount === 1 ? "case" : "cases";
  return visibleCount === totalCount
    ? `${totalCount} ${noun} available`
    : `${visibleCount} of ${totalCount} ${noun} shown`;
}

function TriangleLab() {
  const [state, setState] = useAtom(labStateAtom);
  const isNarrow = useMediaQuery("(max-width: 1000px)");
  const caseSelectorRefs = useRef(new Map<CaseId, RefObject<HTMLButtonElement | null>>());
  const [inputError, setInputError] = useState<InputError | null>(null);
  const [customCaseName, setCustomCaseName] = useState("");
  const [customCaseNameError, setCustomCaseNameError] = useState<string | null>(null);
  const [customCaseDescription, setCustomCaseDescription] = useState("");
  const [customCaseTags, setCustomCaseTags] = useState("");
  const [customCaseValues, setCustomCaseValues] = useState<SideValues>({ a: "", b: "", c: "" });
  const [customCaseInputError, setCustomCaseInputError] = useState<InputError | null>(null);
  const [editingCustomCaseId, setEditingCustomCaseId] = useState<CaseId | null>(null);
  const [isCustomCaseDialogOpen, setIsCustomCaseDialogOpen] = useState(false);
  const [isMobileCaseLibraryOpen, setIsMobileCaseLibraryOpen] = useState(false);
  const [isCaseToolsOpen, setIsCaseToolsOpen] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const visibleCases = useAtomValue(visibleCasesAtom);
  const caseFilterOptions = useAtomValue(caseFilterOptionsAtom);
  const groupedCaseFilterOptions = groupFilterOptions(caseFilterOptions);
  const runState = useAtomValue(runTriangleAtom);
  const runTriangle = useAtomSet(runTriangleAtom, { mode: "promise" });
  const resetRunState = useAtomSet(runTriangleAtom);
  const isRunning = runState.waiting;
  const isBusy = isRunning || isBatchRunning;
  const hasRunError = runState._tag === "Failure";

  function getCaseSelectorRef(caseId: CaseId): RefObject<HTMLButtonElement | null> {
    let selectorRef = caseSelectorRefs.current.get(caseId);
    if (!selectorRef) {
      selectorRef = createRef<HTMLButtonElement>();
      caseSelectorRefs.current.set(caseId, selectorRef);
    }
    return selectorRef;
  }

  const activeCase = state.cases.find((testCase) => testCase.id === state.activeCaseId)!;
  const activeCaseNumber = state.cases.findIndex((testCase) => testCase.id === state.activeCaseId) + 1;
  const lastResult = state.result;

  function selectCase(testCase: TriangleCase) {
    resetRunState(Atom.Reset);
    setInputError(null);
    if (isNarrow) {
      setIsMobileCaseLibraryOpen(false);
      setIsCaseToolsOpen(false);
    }
    setState((previous) => {
      const values = previous.valuesByCaseId[testCase.id];
      return {
        ...previous,
        activeCaseId: testCase.id,
        values,
        result: previous.resultsByCaseId[testCase.id],
        isDirty: previous.statuses[testCase.id] === "modified",
      };
    });
  }

  function updateCaseFilters(nextFilters: ReadonlyArray<string>) {
    resetRunState(Atom.Reset);
    setInputError(null);
    setState((previous) => {
      const matchingCases = filterCasesByTags(previous.cases, nextFilters);
      const visibleCaseIds = new Set(matchingCases.map((testCase) => testCase.id));
      const selectedCaseIds = previous.selectedCaseIds.filter((caseId) => visibleCaseIds.has(caseId));
      const activeCaseIsVisible = matchingCases.some((testCase) => testCase.id === previous.activeCaseId);
      const nextCase = !activeCaseIsVisible ? matchingCases[0] : undefined;

      if (!nextCase) return { ...previous, caseFilters: nextFilters, selectedCaseIds };

      return {
        ...previous,
        caseFilters: nextFilters,
        selectedCaseIds,
        activeCaseId: nextCase.id,
        values: previous.valuesByCaseId[nextCase.id],
        result: previous.resultsByCaseId[nextCase.id],
        isDirty: previous.statuses[nextCase.id] === "modified",
      };
    });
  }

  function openCustomCaseDialog() {
    resetRunState(Atom.Reset);
    setInputError(null);
    setEditingCustomCaseId(null);
    setCustomCaseNameError(null);
    const customCount = state.cases.filter((testCase) => testCase.source === "custom").length;
    setCustomCaseName(`Custom case ${customCount + 1}`);
    setCustomCaseDescription("");
    setCustomCaseTags("");
    setCustomCaseValues({ ...state.values });
    setCustomCaseInputError(validateSideValues(state.values));
    setIsCustomCaseDialogOpen(true);
  }

  function openEditCustomCaseDialog(testCase: TriangleCase) {
    if (testCase.source !== "custom") return;
    resetRunState(Atom.Reset);
    setInputError(null);
    setEditingCustomCaseId(testCase.id);
    setCustomCaseNameError(null);
    setCustomCaseName(testCase.name);
    setCustomCaseDescription(testCase.description ?? "");
    setCustomCaseTags(testCase.tags.join(", "));
    const values = { ...state.valuesByCaseId[testCase.id] };
    setCustomCaseValues(values);
    setCustomCaseInputError(validateSideValues(values));
    setIsCustomCaseDialogOpen(true);
  }

  function updateCustomCaseSide(side: keyof SideValues, value: string) {
    const values = { ...customCaseValues, [side]: value };
    setCustomCaseValues(values);
    setCustomCaseInputError(validateSideValues(values));
  }

  function saveCustomCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customCaseName.trim();
    if (!name) {
      setCustomCaseNameError("Enter a name for this case.");
      return;
    }
    setCustomCaseNameError(null);

    const sideError = validateSideValues(customCaseValues);
    if (sideError) {
      setCustomCaseInputError(sideError);
      return;
    }

    const description = customCaseDescription.trim();
    const tags = parseCustomTags(customCaseTags);
    const values = { ...customCaseValues };
    if (editingCustomCaseId) {
      const caseId = editingCustomCaseId;
      setState((previous) => {
        const previousValues = previous.valuesByCaseId[caseId];
        const valuesChanged =
          values.a !== previousValues.a || values.b !== previousValues.b || values.c !== previousValues.c;
        const result = valuesChanged ? null : previous.resultsByCaseId[caseId];
        const status = result ? (result.failed ? "failed" : "passed") : "not-run";

        return {
          ...previous,
          cases: previous.cases.map((testCase) =>
            testCase.id === caseId && testCase.source === "custom"
              ? { ...testCase, name, description: description || undefined, tags, values }
              : testCase,
          ),
          caseFilters: ["custom"],
          activeCaseId: caseId,
          values,
          valuesByCaseId: { ...previous.valuesByCaseId, [caseId]: values },
          result,
          resultsByCaseId: { ...previous.resultsByCaseId, [caseId]: result },
          statuses: { ...previous.statuses, [caseId]: status },
          isDirty: false,
        };
      });
      setIsCustomCaseDialogOpen(false);
      if (isNarrow) {
        setIsMobileCaseLibraryOpen(false);
        setIsCaseToolsOpen(false);
      }
      return;
    }

    const id = createSessionCaseId(state.cases);
    const testCase: TriangleCase = {
      id,
      name,
      description: description || undefined,
      source: "custom",
      tags,
      values,
    };

    resetRunState(Atom.Reset);
    setState((previous) => ({
      ...previous,
      cases: [...previous.cases, testCase],
      caseFilters: ["custom"],
      selectedCaseIds: [],
      activeCaseId: id,
      values,
      valuesByCaseId: { ...previous.valuesByCaseId, [id]: values },
      result: null,
      resultsByCaseId: { ...previous.resultsByCaseId, [id]: null },
      statuses: { ...previous.statuses, [id]: "not-run" },
      isDirty: false,
    }));
    setIsCustomCaseDialogOpen(false);
    if (isNarrow) {
      setIsMobileCaseLibraryOpen(false);
      setIsCaseToolsOpen(false);
    }
  }

  function deleteActiveCustomCase() {
    if (activeCase.source !== "custom") return;

    resetRunState(Atom.Reset);
    setInputError(null);
    setIsDeleteDialogOpen(false);
    setState((previous) => {
      const cases = previous.cases.filter((testCase) => testCase.id !== activeCase.id);
      const valuesByCaseId = { ...previous.valuesByCaseId };
      const resultsByCaseId = { ...previous.resultsByCaseId };
      const statuses = { ...previous.statuses };
      delete valuesByCaseId[activeCase.id];
      delete resultsByCaseId[activeCase.id];
      delete statuses[activeCase.id];
      const nextCase = cases.find((testCase) => testCase.source !== "custom")!;

      return {
        ...previous,
        cases,
        caseFilters: [],
        selectedCaseIds: previous.selectedCaseIds.filter((caseId) => caseId !== activeCase.id),
        activeCaseId: nextCase.id,
        values: valuesByCaseId[nextCase.id],
        valuesByCaseId,
        result: resultsByCaseId[nextCase.id],
        resultsByCaseId,
        statuses,
        isDirty: statuses[nextCase.id] === "modified",
      };
    });
    caseSelectorRefs.current.delete(activeCase.id);
    if (isNarrow) {
      setIsMobileCaseLibraryOpen(false);
      setIsCaseToolsOpen(false);
    }
  }

  function toggleCaseForBatch(caseId: CaseId) {
    setState((previous) => ({
      ...previous,
      selectedCaseIds: previous.selectedCaseIds.includes(caseId)
        ? previous.selectedCaseIds.filter((selectedId) => selectedId !== caseId)
        : [...previous.selectedCaseIds, caseId],
    }));
  }

  function updateSide(side: keyof SideValues, value: string) {
    if (activeCase.source !== "custom") return;
    resetRunState(Atom.Reset);
    setInputError(null);
    setState((previous) => {
      const values = { ...previous.values, [side]: value };
      return {
        ...previous,
        values,
        valuesByCaseId: { ...previous.valuesByCaseId, [previous.activeCaseId]: values },
        result: null,
        resultsByCaseId: { ...previous.resultsByCaseId, [previous.activeCaseId]: null },
        statuses: { ...previous.statuses, [previous.activeCaseId]: "modified" },
        isDirty: true,
      };
    });
  }

  function resetCase() {
    resetRunState(Atom.Reset);
    setInputError(null);
    const testCase = state.cases.find((item) => item.id === state.activeCaseId)!;
    const priorPresetRun = [...state.history].reverse().find((run) =>
      run.caseId === testCase.id &&
      run.result.values.a === testCase.values.a &&
      run.result.values.b === testCase.values.b &&
      run.result.values.c === testCase.values.c,
    );
    const result = priorPresetRun?.result ?? null;
    const status = priorPresetRun
      ? (priorPresetRun.result.failed ? "failed" : "passed")
      : "not-run";
    setState((previous) => ({
      ...previous,
      values: testCase.values,
      valuesByCaseId: { ...previous.valuesByCaseId, [testCase.id]: testCase.values },
      result,
      resultsByCaseId: { ...previous.resultsByCaseId, [testCase.id]: result },
      statuses: {
        ...previous.statuses,
        [testCase.id]: status,
      },
      isDirty: false,
    }));
  }

  async function runCase() {
    if (isBusy) return;
    const caseId = state.activeCaseId;
    const caseName = activeCase.name;
    const values = { ...state.values };
    const validationError = validateSideValues(values);
    if (validationError) {
      setInputError(validationError);
      return;
    }

    setInputError(null);
    setBatchError(null);
    setState((previous) => ({
      ...previous,
      result: null,
      resultsByCaseId: { ...previous.resultsByCaseId, [caseId]: null },
      statuses: { ...previous.statuses, [caseId]: "not-run" },
    }));
    resetRunState(Atom.Reset);
    try {
      const result = await runTriangle(values);
      setState((previous) => ({
        ...previous,
        result,
        resultsByCaseId: { ...previous.resultsByCaseId, [caseId]: result },
        statuses: {
          ...previous.statuses,
          [caseId]: result.failed ? "failed" : "passed",
        },
        history: [
          ...previous.history,
          {
            id: previous.history.length + 1,
            caseId,
            name: caseName,
            result,
          },
        ],
        isDirty: false,
      }));
      if (window.matchMedia("(max-width: 1000px)").matches) {
        window.requestAnimationFrame(() => {
          const resultPanel = document.getElementById("result-panel");
          if (!resultPanel) return;

          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          resultPanel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        });
      }
    } catch {
      // The run atom carries the failure state for the assertion region.
    }
  }

  async function runSelectedCases() {
    if (isBusy) return;
    const casesToRun = state.cases
      .filter((testCase) => state.selectedCaseIds.includes(testCase.id))
      .map((testCase) => ({
        testCase,
        values: { ...state.valuesByCaseId[testCase.id] },
      }));
    if (casesToRun.length === 0) return;

    const invalidCase = casesToRun.find(({ values }) => validateSideValues(values) !== null);
    if (invalidCase) {
      setState((previous) => ({
        ...previous,
        activeCaseId: invalidCase.testCase.id,
        values: invalidCase.values,
        result: previous.resultsByCaseId[invalidCase.testCase.id],
        isDirty: previous.statuses[invalidCase.testCase.id] === "modified",
      }));
      setInputError(validateSideValues(invalidCase.values));
      return;
    }

    setInputError(null);
    setBatchError(null);
    setIsBatchRunning(true);
    setBatchProgress({ current: 1, total: casesToRun.length });
    resetRunState(Atom.Reset);

    let completed = 0;
    let failedCaseName: string | null = null;
    for (const [index, { testCase, values }] of casesToRun.entries()) {
      setBatchProgress({ current: index + 1, total: casesToRun.length });
      setState((previous) => ({
        ...previous,
        activeCaseId: testCase.id,
        values,
        result: null,
        resultsByCaseId: { ...previous.resultsByCaseId, [testCase.id]: null },
        statuses: { ...previous.statuses, [testCase.id]: "not-run" },
        isDirty: false,
      }));
      resetRunState(Atom.Reset);

      try {
        const result = await runTriangle(values);
        setState((previous) => ({
          ...previous,
          result,
          resultsByCaseId: { ...previous.resultsByCaseId, [testCase.id]: result },
          statuses: {
            ...previous.statuses,
            [testCase.id]: result.failed ? "failed" : "passed",
          },
          history: [
            ...previous.history,
            {
              id: previous.history.length + 1,
              caseId: testCase.id,
              name: testCase.name,
              result,
            },
          ],
          isDirty: false,
        }));
        completed += 1;
      } catch {
        failedCaseName = testCase.name;
        break;
      }
    }

    setIsBatchRunning(false);
    setBatchProgress(null);
    if (failedCaseName) {
      setBatchError("Stopped after " + completed + " of " + casesToRun.length + ". Could not run \"" + failedCaseName + "\". Retry the selected cases.");
      return;
    }

    if (window.matchMedia("(max-width: 1000px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("run-ledger-title")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
    }
  }

  const filterOptions = groupedCaseFilterOptions.map(([group, options]) => ({
    type: "section" as const,
    title: group,
    options: options.map((option) => ({
      value: option.value,
      label: option.label + " (" + option.count + ")",
      disabled: option.count === 0,
    })),
  }));

  function sideValue(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function setSideValue(side: keyof SideValues, value: number | null, custom = false) {
    const nextValue = value === null ? "" : String(value);
    if (custom) updateCustomCaseSide(side, nextValue);
    else updateSide(side, nextValue);
  }

  function statusLabel(status: string): string {
    if (status === "not-run") return "Not run";
    if (status === "modified") return "Edited";
    if (status === "passed") return "Passed";
    return "Failed";
  }

  function statusVariant(status: string): "neutral" | "warning" | "success" | "error" {
    if (status === "modified") return "warning";
    if (status === "passed") return "success";
    if (status === "failed") return "error";
    return "neutral";
  }

  const caseList = (
    <>
      {visibleCases.length > 0 ? (
        <List density="compact" edge="padded" hasDividers>
          {visibleCases.map((testCase) => {
            const index = state.cases.findIndex((item) => item.id === testCase.id);
            const isActive = state.activeCaseId === testCase.id;
            const selectorRef = getCaseSelectorRef(testCase.id);
            const values = state.valuesByCaseId[testCase.id];
            const status = state.isDirty && isActive ? "modified" : state.statuses[testCase.id];
            const label = statusLabel(status);
            return (
              <ListItem
                align="first-line"
                className="lab-case-row"
                description={(
                  <VStack gap={0.5}>
                    {testCase.description && (
                      <Text color="secondary" type="supporting">{testCase.description}</Text>
                    )}
                    <Text color="secondary" type="supporting">
                      Sides: {values.a}, {values.b}, {values.c}
                    </Text>
                    {!isNarrow && (
                      <HStack align="center" gap={1}>
                        <StatusDot label={label} variant={statusVariant(status)} />
                        <Text color="secondary" type="supporting">{label}</Text>
                      </HStack>
                    )}
                  </VStack>
                )}
                endContent={isNarrow ? (
                  <HStack align="center" gap={1}>
                    <StatusDot label={label} variant={statusVariant(status)} />
                    <Text color="secondary" type="supporting">{label}</Text>
                  </HStack>
                ) : undefined}
                interactiveRef={selectorRef}
                isDisabled={isBusy}
                isSelected={isActive}
                key={testCase.id}
                label={(
                  <Button
                    className="lab-case-selector"
                    id={"case-selector-" + testCase.id}
                    isDisabled={isBusy}
                    label={"Test " + (index + 1) + ": " + testCase.name + ", sides " + values.a + ", " + values.b + ", " + values.c + ", " + label.toLowerCase()}
                    onClick={() => selectCase(testCase)}
                    ref={selectorRef}
                    variant="ghost"
                    width="100%"
                  >
                    {testCase.name}
                  </Button>
                )}
                startContent={isCaseToolsOpen ? (
                  <CheckboxInput
                    isDisabled={isBusy}
                    isLabelHidden
                    label={"Select " + testCase.name + " for a batch run"}
                    onChange={() => toggleCaseForBatch(testCase.id)}
                    value={state.selectedCaseIds.includes(testCase.id)}
                  />
                ) : undefined}
              />
            );
          })}
        </List>
      ) : (
        <Text color="secondary" type="supporting">
          No cases match these filters. Clear the selected tags to show all cases.
        </Text>
      )}
    </>
  );
  const caseLibrary = (
    <Section className="lab-case-library" aria-label="Triangle test case library" padding={isNarrow ? 2 : 3}>
      <VStack gap={isNarrow ? 2 : 3}>
        <HStack align="center" justify="between">
          <Heading level={2}>Case library</Heading>
          <Text color="secondary" type="supporting">
            {describeVisibleCaseCount(visibleCases.length, state.cases.length)}
          </Text>
        </HStack>

        <MultiSelector
          description="Filter by source or tag."
          hasClear
          isDisabled={isBusy}
          label="Filter cases"
          onChange={updateCaseFilters}
          options={filterOptions}
          placeholder="All cases"
          presentation="adaptive"
          triggerDisplay="labels"
          formatValue={formatSelectedFilters}
          value={[...state.caseFilters]}
          width="100%"
        />

        <Collapsible
          className="lab-case-tools"
          isDisabled={isBatchRunning}
          isOpen={isCaseToolsOpen}
          onOpenChange={setIsCaseToolsOpen}
          trigger={(
            <HStack align="center" gap={2} width="100%">
              <Text type="label">{isNarrow ? "Batch tools" : "Custom and batch tools"}</Text>
              {state.selectedCaseIds.length > 0 && (
                <Text color="secondary" type="supporting">
                  {state.selectedCaseIds.length} selected
                </Text>
              )}
            </HStack>
          )}
        >
          <VStack gap={2}>
            <HStack align="center" gap={2} wrap="wrap">
              {!isNarrow && (
                <Button
                  isDisabled={isBusy}
                  label="Add custom case"
                  onClick={openCustomCaseDialog}
                  variant="secondary"
                />
              )}
              <Button
                isDisabled={isBusy || state.selectedCaseIds.length === 0}
                isLoading={Boolean(batchProgress)}
                label="Run selected cases"
                onClick={() => void runSelectedCases()}
                variant="primary"
              />
            </HStack>

            <Text color="secondary" role="status" type="supporting">
              {batchProgress
                ? "Running " + batchProgress.current + " of " + batchProgress.total + " cases."
                : state.selectedCaseIds.length > 0
                  ? state.selectedCaseIds.length +
                    (state.selectedCaseIds.length === 1 ? " case" : " cases") +
                    " selected. Adjust the checkboxes or run the selected cases."
                  : "Select cases with checkboxes to run them together. Select a case name to open it in the workspace."}
            </Text>

            {batchError && (
              <HStack align="center" gap={2} role="alert">
                <StatusDot label="Batch run stopped" variant="error" />
                <Text type="supporting">{batchError}</Text>
              </HStack>
            )}

          </VStack>
        </Collapsible>

        {caseList}

        {activeCase.source === "custom" && (
          <HStack gap={2} wrap="wrap">
            <Button
              isDisabled={isBusy}
              label="Edit case details"
              onClick={() => openEditCustomCaseDialog(activeCase)}
              variant="secondary"
            />
            <Button
              isDisabled={isBusy}
              label="Delete case"
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
            />
          </HStack>
        )}
      </VStack>
    </Section>
  );

  const mobileCasePickerTrigger = (
    <HStack align="center" gap={2} justify="between" width="100%">
      <Text type="large">Change case</Text>
    </HStack>
  );

  const workspace = (
    <Section className="lab-workspace" aria-label="Selected test case workspace" padding={isNarrow ? 2 : 3}>
      <VStack gap={isNarrow ? 2 : 3}>
        <HStack className="lab-sheet-band" align="start" justify="between" gap={2}>
          <VStack gap={0.5}>
            <Heading className="lab-sheet-title" level={2}>{activeCase.name}</Heading>
            {activeCase.description && (
              <Text color="secondary" type="supporting">{activeCase.description}</Text>
            )}
          </VStack>
          <Text className="lab-sheet-count" color="secondary" type="supporting">
            Case {activeCaseNumber} of {state.cases.length}
          </Text>
        </HStack>

        {!lastResult && activeCase.failureExplanation && (
          <VStack className="lab-case-rationale" gap={0.5}>
            <Text color="secondary" type="label">What this case checks</Text>
            <Text color="secondary" type="supporting">{activeCase.failureExplanation}</Text>
          </VStack>
        )}

        <Grid align="start" columns={{ minWidth: 220, max: 2 }} gap={isNarrow ? 3 : 4}>
          <VStack gap={isNarrow ? 3 : 4}>
            <form
              aria-labelledby="input-panel-title"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void runCase();
              }}
            >
              <VStack gap={isNarrow ? 2 : 3}>
                <VStack gap={0.5}>
                  <Heading level={3} id="input-panel-title">Side lengths</Heading>
                  <Text color="secondary" type="supporting">
                    {activeCase.source === "custom"
                      ? "Whole numbers from 1 to 200."
                      : "Built-in values are fixed. Add a custom case to change them."}
                  </Text>
                </VStack>
                <Grid columns={{ minWidth: 88, max: 3 }} gap={2}>
                  {(["a", "b", "c"] as const).map((side) => (
                    <NumberInput
                      hasClear={activeCase.source === "custom"}
                      isDisabled={isBusy}
                      isIntegerOnly
                      isReadOnly={activeCase.source !== "custom"}
                      isWheelEnabled={false}
                      key={side}
                      label={"Side " + side}
                      max={200}
                      min={1}
                      onChange={(value: number | null) => setSideValue(side, value)}
                      controlStyle={activeCase.source === "custom" ? undefined : {
                        backgroundColor: "var(--triangle-lab-neutral-wash)",
                        borderColor: "var(--triangle-lab-line)",
                        cursor: "default",
                      }}
                      status={inputError?.side === side
                        ? { type: "error", message: inputError.message }
                        : undefined}
                      step={1}
                      value={sideValue(state.values[side])}
                    />
                  ))}
                </Grid>
                <HStack align="center" gap={2} wrap="wrap">
                  <Button
                    isDisabled={isBusy}
                    isLoading={isRunning}
                    label="Run case"
                    type="submit"
                    variant="primary"
                  />
                  {activeCase.source === "custom" && (
                    <Button
                      isDisabled={isBusy}
                      label="Restore saved case"
                      onClick={resetCase}
                      variant="secondary"
                    />
                  )}
                </HStack>
              </VStack>
            </form>

            <Section className="lab-result-panel" aria-labelledby="result-panel-title" id="result-panel" padding={0} variant="muted">
              <VStack gap={2} padding={isNarrow ? 2 : 3}>
                <Heading level={3} id="result-panel-title">Result</Heading>
                {lastResult ? (
                  <Grid align="start" columns={{ minWidth: 120, max: 2 }} gap={2}>
                    <Section className="lab-result-expected" padding={2}>
                      <VStack gap={0.5}>
                        <Text color="secondary" type="label">Expected</Text>
                        <Text color="secondary" type="supporting">Triangle rules</Text>
                        <Heading level={4}>{displayTriangleOutput(lastResult.expected)}</Heading>
                      </VStack>
                    </Section>
                    <Section className="lab-result-observed" padding={2}>
                      <VStack gap={0.5}>
                        <Text color="secondary" type="label">Observed</Text>
                        <Text color="secondary" type="supporting">Faulty classifier</Text>
                        <Heading level={4}>{displayTriangleOutput(lastResult.observed)}</Heading>
                      </VStack>
                    </Section>
                  </Grid>
                ) : (
                  <Text color="secondary" type="supporting">
                    {hasRunError
                      ? "Could not run this case. Retry it."
                      : "Expected comes from triangle rules; observed comes from the faulty classifier."}
                  </Text>
                )}
                <Link
                  download="lesson-3-triangle-problem.pdf"
                  href="/lesson-3-triangle-problem.pdf"
                  isStandalone
                  size="sm"
                >
                  Download Lesson 3: The Triangle Problem (PDF)
                </Link>
                {lastResult && (
                  <HStack
                    aria-atomic="true"
                    aria-label={
                      "Expected " + displayTriangleOutput(lastResult.expected) +
                      ". Observed " + displayTriangleOutput(lastResult.observed) +
                      ". " + (lastResult.failed ? "Assertion failed." : "Assertion passed.") +
                      (lastResult.failed && activeCase.failureExplanation ? " " + activeCase.failureExplanation : "")
                    }
                    className={lastResult.failed ? "lab-assertion lab-assertion--failed" : "lab-assertion lab-assertion--passed"}
                    align="center"
                    gap={2}
                    role="status"
                  >
                    <StatusDot
                      label={lastResult.failed ? "Assertion failed" : "Assertion passed"}
                      variant={lastResult.failed ? "error" : "success"}
                    />
                    <Text className="lab-assertion__label" type="label">
                      {lastResult.failed ? "Assertion failed" : "Assertion passed"}
                    </Text>
                  </HStack>
                )}
                {lastResult?.failed && activeCase.failureExplanation && (
                  <Text color="secondary" type="supporting">{activeCase.failureExplanation}</Text>
                )}
                {hasRunError && (
                  <HStack align="center" gap={2} role="alert">
                    <StatusDot label="Run failed" variant="error" />
                    <Text type="supporting">Could not run this case. Retry it.</Text>
                  </HStack>
                )}
              </VStack>
            </Section>
          </VStack>

          <VStack gap={2}>
            <Heading level={3}>Triangle diagram</Heading>
            <TriangleDiagram values={state.values} />
          </VStack>
        </Grid>
      </VStack>
    </Section>
  );

  const historyCount = `This session · ${state.history.length} ${state.history.length === 1 ? "run" : "runs"}`;
  const historyRecords = state.history.length > 0 ? (
    <List density="compact" edge="flush" hasDividers>
      {state.history.map((run) => (
        <ListItem
          align="first-line"
          description={(
            <VStack gap={0.5}>
              <Text color="secondary" type="supporting">
                Sides: {run.result.values.a}, {run.result.values.b}, {run.result.values.c}
              </Text>
              <Text color="secondary" type="supporting">
                Expected: {displayTriangleOutput(run.result.expected)}
              </Text>
              <Text color="secondary" type="supporting">
                Observed: {displayTriangleOutput(run.result.observed)}
              </Text>
            </VStack>
          )}
          endContent={(
            <HStack align="center" gap={1}>
              <StatusDot
                label={run.result.failed ? "Assertion failed" : "Assertion passed"}
                variant={run.result.failed ? "error" : "success"}
              />
              <Text type="supporting">{run.result.failed ? "Failed" : "Passed"}</Text>
            </HStack>
          )}
          key={run.id}
          label={(
            <HStack align="center" gap={2}>
              <Text hasTabularNumbers type="label">Run {String(run.id).padStart(2, "0")}</Text>
              <Text type="body">{run.name}</Text>
            </HStack>
          )}
        />
      ))}
    </List>
  ) : (
    <Text color="secondary" type="supporting">
      No runs yet. Run a case and its result will appear here.
    </Text>
  );
  const historyTrigger = (
    <HStack align="center" gap={2}>
      <Text type="large">Run history</Text>
      <Text color="secondary" type="supporting">{historyCount}</Text>
    </HStack>
  );

  return (
    <AppShell className="lab-shell" contentPadding={4} height="fill">
      <Center axis="horizontal" width="100%">
        <VStack
          className={isNarrow ? "lab-page" : "lab-page lab-page-with-history-drawer"}
          gap={isNarrow ? 2 : 4}
          maxWidth="99.125rem"
          width="100%"
        >
          <VStack className="lab-page-header" gap={0.5}>
            <Text className="lab-product-name" color="secondary" type="label">Triangle Test Lab</Text>
            <Heading className="lab-page-title" level={1} id="workspace-title">Classify a triangle</Heading>
            <Text color="secondary" type="supporting">
              Run a case to compare results.
            </Text>
          </VStack>

          {isNarrow ? (
            <VStack gap={3}>
              <VStack
                className="lab-mobile-case-controls"
                gap={isMobileCaseLibraryOpen ? 2 : 0}
                width="100%"
              >
                <HStack align="center" className="lab-mobile-case-controls-row" gap={2} width="100%">
                  <Collapsible
                    className="lab-mobile-case-picker"
                    isOpen={isMobileCaseLibraryOpen}
                    onOpenChange={setIsMobileCaseLibraryOpen}
                    trigger={mobileCasePickerTrigger}
                  >
                    {caseLibrary}
                  </Collapsible>
                  {!isMobileCaseLibraryOpen && (
                    <Button
                      className="lab-mobile-add-case"
                      isDisabled={isBusy}
                      label="Add custom case"
                      onClick={openCustomCaseDialog}
                      variant="secondary"
                    />
                  )}
                </HStack>
                {isMobileCaseLibraryOpen && (
                  <Button
                    className="lab-mobile-add-case lab-mobile-add-case-expanded"
                    isDisabled={isBusy}
                    label="Add custom case"
                    onClick={openCustomCaseDialog}
                    variant="secondary"
                    width="100%"
                  />
                )}
              </VStack>
              {workspace}
            </VStack>
          ) : (
            <Layout
              height="auto"
              padding={0}
              start={
                <LayoutPanel
                  hasDivider
                  label="Test case library"
                  padding={0}
                  role="complementary"
                  width="clamp(15rem, 18.5%, 18.3125rem)"
                >
                  {caseLibrary}
                </LayoutPanel>
              }
              content={<LayoutContent padding={0}>{workspace}</LayoutContent>}
            />
          )}

          {isNarrow && (
            <Section aria-labelledby="run-ledger-title" padding={3}>
              <VStack gap={2}>
                <HStack align="center" justify="between" wrap="wrap">
                  <Heading level={2} id="run-ledger-title">Run history</Heading>
                  <Text color="secondary" type="supporting">{historyCount}</Text>
                </HStack>
                {historyRecords}
              </VStack>
            </Section>
          )}
        </VStack>
      </Center>

      {!isNarrow && (
        <Collapsible
          className="lab-history-drawer"
          defaultIsOpen={false}
          trigger={historyTrigger}
        >
          <ScrollableArea
            axis="block"
            className="lab-history-scroll"
            label="Session run history"
          >
            {historyRecords}
          </ScrollableArea>
        </Collapsible>
      )}

      <Dialog
        isOpen={isCustomCaseDialogOpen}
        onOpenChange={setIsCustomCaseDialogOpen}
        purpose="form"
        width="42rem"
      >
        <DialogHeader
          onOpenChange={setIsCustomCaseDialogOpen}
          subtitle="Whole-number sides from 1 to 200. Built-in examples stay fixed."
          title={editingCustomCaseId ? "Edit case details" : "New custom case"}
        />
        <form noValidate onSubmit={saveCustomCase}>
          <VStack gap={3}>
            <Grid columns={{ minWidth: 112, max: 3 }} gap={2}>
              {(["a", "b", "c"] as const).map((side) => (
                <NumberInput
                  hasClear
                  isIntegerOnly
                  isWheelEnabled={false}
                  key={side}
                  label={"Side " + side}
                  max={200}
                  min={1}
                  onChange={(value) => setSideValue(side, value, true)}
                  status={customCaseInputError?.side === side
                    ? { type: "error", message: customCaseInputError.message }
                    : undefined}
                  value={sideValue(customCaseValues[side])}
                />
              ))}
            </Grid>
            <TextInput
              autoComplete="off"
              isRequired
              label="Case name"
              onChange={(value) => {
                const nextName = value.slice(0, 48);
                setCustomCaseName(nextName);
                if (nextName.trim()) setCustomCaseNameError(null);
              }}
              status={customCaseNameError
                ? { type: "error", message: customCaseNameError }
                : undefined}
              value={customCaseName}
            />
            <TextArea
              isOptional
              label="Description"
              maxLength={180}
              onChange={setCustomCaseDescription}
              placeholder="What should this case demonstrate?"
              rows={3}
              value={customCaseDescription}
            />
            <TextInput
              autoComplete="off"
              description="Add one or more tags, separated by commas."
              isOptional
              label="Tags"
              onChange={setCustomCaseTags}
              placeholder="boundary case, equal sides"
              value={customCaseTags}
            />
            <HStack align="center" gap={2} justify="end" wrap="wrap">
              <Button
                label="Cancel"
                onClick={() => setIsCustomCaseDialogOpen(false)}
                variant="secondary"
              />
              <Button
                label={editingCustomCaseId ? "Save details" : "Save case"}
                type="submit"
                variant="primary"
              />
            </HStack>
          </VStack>
        </form>
      </Dialog>

      <AlertDialog
        actionLabel="Delete case"
        description={'Delete "' + activeCase.name + '" from this session? Its run history will remain.'}
        isOpen={isDeleteDialogOpen}
        onAction={deleteActiveCustomCase}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete this custom case?"
      />
    </AppShell>
  );
}
