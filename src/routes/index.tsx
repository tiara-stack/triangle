import { createFileRoute } from "@tanstack/react-router";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { createRef, useEffect, useRef, type FormEvent, type RefObject } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { CaseLibrary } from "../components/triangle-lab/CaseLibrary";
import { CustomCaseDialog, DeleteCaseDialog } from "../components/triangle-lab/LabDialogs";
import { RunHistory } from "../components/triangle-lab/RunHistory";
import { TriangleWorkspace } from "../components/triangle-lab/TriangleWorkspace";
import {
  isBusyAtom,
  isRunningBatchAtom,
  isRunningCaseAtom,
  LabEvents,
  labMachineAtom,
  labStateAtom,
  visibleCasesAtom,
  caseFilterOptionsAtom,
} from "../lib/labMachine";
import { sourceCaseFilters } from "../lib/labState";
import {
  type CaseId,
  type SideValues,
  type TriangleCase,
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

function TriangleLab() {
  const state = useAtomValue(labStateAtom);
  const send = useAtomSet(labMachineAtom.send);
  const isNarrow = useMediaQuery("(max-width: 1000px)");
  const caseSelectorRefs = useRef(new Map<CaseId, RefObject<HTMLButtonElement | null>>());
  const previousHistoryLength = useRef(state.history.length);
  const visibleCases = useAtomValue(visibleCasesAtom);
  const caseFilterOptions = useAtomValue(caseFilterOptionsAtom);
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

      document.getElementById("result-panel")?.scrollIntoView({
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

  function updateCustomCaseSide(side: keyof SideValues, value: number | null) {
    send(LabEvents.CustomCaseSideChanged({ side, value: value === null ? "" : String(value) }));
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
    const testCase: TriangleCase = {
      id: customCaseDraft.editingCaseId ?? createSessionCaseId(state.cases),
      name,
      ...(description ? { description } : {}),
      source: "custom",
      tags: parseCustomTags(customCaseDraft.tags),
      values: { ...customCaseDraft.values },
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

  function updateSide(side: keyof SideValues, value: number | null) {
    if (activeCase.source !== "custom") return;
    send(LabEvents.UpdateSide({ side, value: value === null ? "" : String(value) }));
  }

  function resetCase() {
    send(LabEvents.ResetCase());
  }

  function runCase() {
    if (isBusy) return;
    const validationError = validateSideValues({ ...state.values });
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

  function requestDeleteCase() {
    send(LabEvents.OpenDeleteConfirmation());
  }

  const caseLibrary = (
    <CaseLibrary
      state={state}
      visibleCases={visibleCases}
      caseFilterOptions={caseFilterOptions}
      batchProgress={batchProgress}
      batchError={batchError}
      isNarrow={isNarrow}
      isBusy={isBusy}
      isBatchRunning={isBatchRunning}
      getCaseSelectorRef={getCaseSelectorRef}
      onSelectCase={selectCase}
      onUpdateCaseFilters={updateCaseFilters}
      onToggleCaseForBatch={toggleCaseForBatch}
      onRunSelectedCases={runSelectedCases}
      onAddCustomCase={openCustomCaseDialog}
      onEditCustomCase={openEditCustomCaseDialog}
      onRequestDeleteCase={requestDeleteCase}
      onCaseToolsVisibilityChange={(isOpen) => send(LabEvents.CaseToolsVisibilityChanged({ isOpen }))}
    />
  );

  const workspace = (
    <TriangleWorkspace
      activeCase={activeCase}
      activeCaseNumber={activeCaseNumber}
      caseCount={state.cases.length}
      values={state.values}
      result={state.result}
      inputError={state.inputError}
      hasRunError={hasRunError}
      isNarrow={isNarrow}
      isBusy={isBusy}
      isRunning={isRunning}
      onSideChange={updateSide}
      onRunCase={runCase}
      onResetCase={resetCase}
    />
  );

  const mobileCasePickerTrigger = (
    <HStack align="center" gap={2} justify="between" width="100%">
      <Text type="large">Change case</Text>
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
              start={(
                <LayoutPanel
                  hasDivider
                  label="Test case library"
                  padding={0}
                  role="complementary"
                  width="clamp(15rem, 18.5%, 18.3125rem)"
                >
                  {caseLibrary}
                </LayoutPanel>
              )}
              content={<LayoutContent padding={0}>{workspace}</LayoutContent>}
            />
          )}

          {isNarrow && (
            <RunHistory
              history={state.history}
              isNarrow
              isOpen={state.isHistoryDrawerOpen}
              onOpenChange={(isOpen) => send(LabEvents.HistoryDrawerVisibilityChanged({ isOpen }))}
            />
          )}
        </VStack>
      </Center>

      {!isNarrow && (
        <RunHistory
          history={state.history}
          isNarrow={false}
          isOpen={state.isHistoryDrawerOpen}
          onOpenChange={(isOpen) => send(LabEvents.HistoryDrawerVisibilityChanged({ isOpen }))}
        />
      )}

      <CustomCaseDialog
        isOpen={state.isCustomCaseDialogOpen}
        draft={customCaseDraft}
        nameError={state.customCaseNameError}
        inputError={state.customCaseInputError}
        onClose={() => send(LabEvents.CloseCustomCaseDialog())}
        onSideChange={updateCustomCaseSide}
        onNameChange={(name) => send(LabEvents.CustomCaseNameChanged({ name }))}
        onDescriptionChange={(description) => send(LabEvents.CustomCaseDescriptionChanged({ description }))}
        onTagsChange={(tags) => send(LabEvents.CustomCaseTagsChanged({ tags }))}
        onSubmit={saveCustomCase}
      />
      <DeleteCaseDialog
        caseName={activeCase.name}
        isOpen={state.isDeleteDialogOpen}
        onDelete={deleteActiveCustomCase}
        onClose={() => send(LabEvents.CloseDeleteConfirmation())}
      />
    </AppShell>
  );
}
