import { createFileRoute } from "@tanstack/react-router";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { createRef, useEffect, useRef, type FormEvent, type RefObject } from "react";
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
import {
  sourceCaseFilters,
  type CaseFilterOption,
} from "../lib/labState";
import {
  caseFilterOptionsAtom,
  isBusyAtom,
  isRunningBatchAtom,
  isRunningCaseAtom,
  LabEvents,
  labMachineAtom,
  labStateAtom,
  visibleCasesAtom,
} from "../lib/labMachine";
import {
  type CaseId,
  type SideValues,
  type TriangleCase,
  type TriangleOutput,
  validateSideValues,
} from "../lib/triangle";

export const Route = createFileRoute("/")({ component: TriangleLab });

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
  const state = useAtomValue(labStateAtom);
  const send = useAtomSet(labMachineAtom.send);
  const isNarrow = useMediaQuery("(max-width: 1000px)");
  const caseSelectorRefs = useRef(new Map<CaseId, RefObject<HTMLButtonElement | null>>());
  const previousHistoryLength = useRef(state.history.length);
  const visibleCases = useAtomValue(visibleCasesAtom);
  const caseFilterOptions = useAtomValue(caseFilterOptionsAtom);
  const groupedCaseFilterOptions = groupFilterOptions(caseFilterOptions);
  const isRunning = useAtomValue(isRunningCaseAtom);
  const isBatchRunning = useAtomValue(isRunningBatchAtom);
  const isBusy = useAtomValue(isBusyAtom);
  const customCaseDraft = state.customCaseDraft;
  const batchProgress = state.batchProgress;
  const batchError = state.batchError;
  const hasRunError = state.runError !== null;

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

  useEffect(() => {
    if (state.history.length <= previousHistoryLength.current) return;

    if (state.lastRunMode === "batch" && state.batchProgress !== null) return;

    previousHistoryLength.current = state.history.length;
    if (!isNarrow || state.batchError !== null || state.runError !== null) return;

    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (state.lastRunMode === "batch") {
        document.getElementById("run-ledger-title")?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        return;
      }

      const resultPanel = document.getElementById("result-panel");
      resultPanel?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    });
  }, [
    isNarrow,
    state.batchError,
    state.batchProgress,
    state.history.length,
    state.lastRunMode,
    state.runError,
  ]);

  function selectCase(testCase: TriangleCase) {
    send(LabEvents.SelectCase({ caseId: testCase.id }));
    if (isNarrow) {
      send(LabEvents.MobileCaseLibraryVisibilityChanged({ isOpen: false }));
      send(LabEvents.CaseToolsVisibilityChanged({ isOpen: false }));
    }
  }

  function updateCaseFilters(nextFilters: ReadonlyArray<string>) {
    send(LabEvents.UpdateCaseFilters({ filters: [...nextFilters] }));
  }

  function openCustomCaseDialog() {
    send(LabEvents.OpenNewCustomCaseDialog());
  }

  function openEditCustomCaseDialog(testCase: TriangleCase) {
    if (testCase.source !== "custom") return;
    send(LabEvents.OpenEditCustomCaseDialog({ caseId: testCase.id }));
  }

  function updateCustomCaseSide(side: keyof SideValues, value: string) {
    send(LabEvents.CustomCaseSideChanged({ side, value }));
  }

  function saveCustomCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customCaseDraft.name.trim();
    if (!name) {
      send(LabEvents.CustomCaseNameRejected({ message: "Enter a name for this case." }));
      return;
    }

    const sideError = validateSideValues(customCaseDraft.values);
    if (sideError) {
      send(LabEvents.CustomCaseInputRejected({ error: sideError }));
      return;
    }

    const description = customCaseDraft.description.trim();
    const tags = parseCustomTags(customCaseDraft.tags);
    const values = { ...customCaseDraft.values };
    const id = customCaseDraft.editingCaseId ?? createSessionCaseId(state.cases);
    const testCase: TriangleCase = {
      id,
      name,
      ...(description ? { description } : {}),
      source: "custom",
      tags,
      values,
    };

    send(LabEvents.SaveCustomCase({ testCase }));
    if (isNarrow) {
      send(LabEvents.MobileCaseLibraryVisibilityChanged({ isOpen: false }));
      send(LabEvents.CaseToolsVisibilityChanged({ isOpen: false }));
    }
  }

  function deleteActiveCustomCase() {
    if (activeCase.source !== "custom") return;

    send(LabEvents.DeleteCustomCase({ caseId: activeCase.id }));
    caseSelectorRefs.current.delete(activeCase.id);
    if (isNarrow) {
      send(LabEvents.MobileCaseLibraryVisibilityChanged({ isOpen: false }));
      send(LabEvents.CaseToolsVisibilityChanged({ isOpen: false }));
    }
  }

  function toggleCaseForBatch(caseId: CaseId) {
    send(LabEvents.ToggleCaseForBatch({ caseId }));
  }

  function updateSide(side: keyof SideValues, value: string) {
    if (activeCase.source !== "custom") return;
    send(LabEvents.UpdateSide({ side, value }));
  }

  function resetCase() {
    send(LabEvents.ResetCase());
  }

  function runCase() {
    if (isBusy) return;
    const values = { ...state.values };
    const validationError = validateSideValues(values);
    if (validationError) {
      send(LabEvents.SideInputRejected({ error: validationError }));
      return;
    }

    send(LabEvents.RunCase());
  }

  function runSelectedCases() {
    if (isBusy) return;
    const casesToRun = state.cases
      .filter((testCase) => state.selectedCaseIds.includes(testCase.id))
      .map((testCase) => ({
        testCase,
        values: { ...state.valuesByCaseId[testCase.id] },
      }));
    if (casesToRun.length === 0) return;

    const invalidCase = casesToRun
      .map(({ testCase, values }) => ({ testCase, error: validateSideValues(values) }))
      .find(({ error }) => error !== null);
    if (invalidCase?.error) {
      send(LabEvents.SelectCase({ caseId: invalidCase.testCase.id }));
      send(LabEvents.SideInputRejected({ error: invalidCase.error }));
      return;
    }

    send(LabEvents.RunSelectedCases());
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
                startContent={state.isCaseToolsOpen ? (
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
          isOpen={state.isCaseToolsOpen}
          onOpenChange={(isOpen) => send(LabEvents.CaseToolsVisibilityChanged({ isOpen }))}
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
              onClick={() => send(LabEvents.OpenDeleteConfirmation())}
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
                      status={state.inputError?.side === side
                        ? { type: "error", message: state.inputError.message }
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
                gap={state.isMobileCaseLibraryOpen ? 2 : 0}
                width="100%"
              >
                <HStack align="center" className="lab-mobile-case-controls-row" gap={2} width="100%">
                  <Collapsible
                    className="lab-mobile-case-picker"
                    isOpen={state.isMobileCaseLibraryOpen}
                    onOpenChange={(isOpen) => send(LabEvents.MobileCaseLibraryVisibilityChanged({ isOpen }))}
                    trigger={mobileCasePickerTrigger}
                  >
                    {caseLibrary}
                  </Collapsible>
                  {!state.isMobileCaseLibraryOpen && (
                    <Button
                      className="lab-mobile-add-case"
                      isDisabled={isBusy}
                      label="Add custom case"
                      onClick={openCustomCaseDialog}
                      variant="secondary"
                    />
                  )}
                </HStack>
                {state.isMobileCaseLibraryOpen && (
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
          isOpen={state.isHistoryDrawerOpen}
          onOpenChange={(isOpen) => send(LabEvents.HistoryDrawerVisibilityChanged({ isOpen }))}
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
        isOpen={state.isCustomCaseDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) send(LabEvents.CloseCustomCaseDialog());
        }}
        purpose="form"
        width="42rem"
      >
        <DialogHeader
          onOpenChange={(isOpen) => {
            if (!isOpen) send(LabEvents.CloseCustomCaseDialog());
          }}
          subtitle="Whole-number sides from 1 to 200. Built-in examples stay fixed."
          title={customCaseDraft.editingCaseId ? "Edit case details" : "New custom case"}
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
                  status={state.customCaseInputError?.side === side
                    ? { type: "error", message: state.customCaseInputError.message }
                    : undefined}
                  value={sideValue(customCaseDraft.values[side])}
                />
              ))}
            </Grid>
            <TextInput
              autoComplete="off"
              isRequired
              label="Case name"
              onChange={(value) => {
                const nextName = value.slice(0, 48);
                send(LabEvents.CustomCaseNameChanged({ name: nextName }));
              }}
              status={state.customCaseNameError
                ? { type: "error", message: state.customCaseNameError }
                : undefined}
              value={customCaseDraft.name}
            />
            <TextArea
              isOptional
              label="Description"
              maxLength={180}
              onChange={(description) => send(LabEvents.CustomCaseDescriptionChanged({ description }))}
              placeholder="What should this case demonstrate?"
              rows={3}
              value={customCaseDraft.description}
            />
            <TextInput
              autoComplete="off"
              description="Add one or more tags, separated by commas."
              isOptional
              label="Tags"
              onChange={(tags) => send(LabEvents.CustomCaseTagsChanged({ tags }))}
              placeholder="boundary case, equal sides"
              value={customCaseDraft.tags}
            />
            <HStack align="center" gap={2} justify="end" wrap="wrap">
              <Button
                label="Cancel"
                onClick={() => send(LabEvents.CloseCustomCaseDialog())}
                variant="secondary"
              />
              <Button
                label={customCaseDraft.editingCaseId ? "Save details" : "Save case"}
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
        isOpen={state.isDeleteDialogOpen}
        onAction={deleteActiveCustomCase}
        onOpenChange={(isOpen) => {
          if (!isOpen) send(LabEvents.CloseDeleteConfirmation());
        }}
        title="Delete this custom case?"
      />
    </AppShell>
  );
}
