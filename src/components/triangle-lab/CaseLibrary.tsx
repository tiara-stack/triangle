import type { RefObject } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Section } from "@astryxdesign/core/Section";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { CaseFilterOption, LabState } from "../../lib/labState";
import type { BatchProgress } from "../../lib/labState";
import type { CaseId, CaseSource, TriangleCase } from "../../lib/triangle";

type CaseLibraryState = Pick<
  LabState,
  | "cases"
  | "caseFilters"
  | "selectedCaseIds"
  | "activeCaseId"
  | "valuesByCaseId"
  | "statuses"
  | "history"
  | "isDirty"
  | "isCaseToolsOpen"
>;

type CaseLibraryProps = {
  state: CaseLibraryState;
  visibleCases: ReadonlyArray<TriangleCase>;
  caseFilterOptions: ReadonlyArray<CaseFilterOption>;
  batchProgress: BatchProgress | null;
  batchError: string | null;
  isNarrow: boolean;
  isBusy: boolean;
  isBatchRunning: boolean;
  getCaseSelectorRef: (caseId: CaseId) => RefObject<HTMLButtonElement | null>;
  onSelectCase: (testCase: TriangleCase) => void;
  onUpdateCaseFilters: (filters: ReadonlyArray<string>) => void;
  onToggleCaseForBatch: (caseId: CaseId) => void;
  onRunSelectedCases: () => void;
  onAddCustomCase: () => void;
  onEditCustomCase: (testCase: TriangleCase) => void;
  onRequestDeleteCase: () => void;
  onCaseToolsVisibilityChange: (isOpen: boolean) => void;
};

const sourceCaseFilters = ["example:defect", "example:success", "custom"] as const;

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
  if (
    selectedValues.has("example:defect") &&
    selectedValues.has("example:success") &&
    selectedValues.size === 2
  ) {
    return "All 6 examples";
  }
  if (
    selectedValues.has("example:defect") &&
    selectedValues.has("example:success") &&
    selectedValues.has("custom") &&
    selectedValues.size === 3
  ) {
    return "All case types";
  }

  const labels = items.map(({ label }) => label.replace(/\s+\(\d+\)$/, ""));
  if (labels.length <= 2) return labels.join(", ");
  return labels.slice(0, 2).join(", ") + " +" + (labels.length - 2) + " more";
}

const caseGroupLabels: Record<CaseSource, string> = {
  "example:defect": "Defects",
  "example:success": "Passing examples",
  custom: "Custom cases",
};

function groupVisibleCases(cases: ReadonlyArray<TriangleCase>) {
  const groups = new Map<CaseSource, Array<TriangleCase>>();
  for (const testCase of cases) {
    const group = groups.get(testCase.source) ?? [];
    group.push(testCase);
    groups.set(testCase.source, group);
  }

  return [...groups.entries()].map(([source, groupedCases]) => ({
    source,
    label: caseGroupLabels[source],
    cases: groupedCases,
  }));
}

function describeVisibleCaseCount(visibleCount: number, totalCount: number): string {
  const noun = totalCount === 1 ? "case" : "cases";
  return visibleCount === totalCount
    ? `${totalCount} ${noun} available`
    : `${visibleCount} of ${totalCount} ${noun} shown`;
}

function statusLabel(status: string): string {
  if (status === "not-run") return "Not run";
  if (status === "modified") return "Edited";
  if (status === "passed") return "Matches expected";
  return "Classifier mismatch";
}

function statusVariant(status: string): "neutral" | "warning" | "success" | "error" {
  if (status === "modified") return "warning";
  if (status === "passed") return "success";
  if (status === "failed") return "error";
  return "neutral";
}

export function CaseLibrary({
  state,
  visibleCases,
  caseFilterOptions,
  batchProgress,
  batchError,
  isNarrow,
  isBusy,
  isBatchRunning,
  getCaseSelectorRef,
  onSelectCase,
  onUpdateCaseFilters,
  onToggleCaseForBatch,
  onRunSelectedCases,
  onAddCustomCase,
  onEditCustomCase,
  onRequestDeleteCase,
  onCaseToolsVisibilityChange,
}: CaseLibraryProps) {
  const groupedCaseFilterOptions = groupFilterOptions(caseFilterOptions);
  const visibleCaseGroups = groupVisibleCases(visibleCases);
  const hasAllBuiltInExamplesSelected =
    state.caseFilters.length === 2 &&
    state.caseFilters.includes("example:defect") &&
    state.caseFilters.includes("example:success");
  const hasRunLibraryCase = state.history.some((run) => run.caseId !== "manual-input");
  const filterOptions = groupedCaseFilterOptions.map(([group, options]) => ({
    type: "section" as const,
    title: group,
    options: options.map((option) => ({
      value: option.value,
      label: option.label + " (" + option.count + ")",
      disabled: option.count === 0,
    })),
  }));
  const activeCase = state.cases.find((testCase) => testCase.id === state.activeCaseId)!;

  const caseList = visibleCases.length > 0 ? (
    <VStack className="lab-case-groups" gap={2}>
      {visibleCaseGroups.map((group) => (
        <VStack className="lab-case-group" gap={0.5} key={group.source}>
          <HStack align="center" justify="between">
            <Heading level={3}>{group.label}</Heading>
            <Text color="secondary" type="supporting">
              {group.cases.length} {group.cases.length === 1 ? "case" : "cases"}
            </Text>
          </HStack>
          <List density="compact" edge="padded" hasDividers>
            {group.cases.map((testCase) => {
              const index = state.cases.findIndex((item) => item.id === testCase.id);
              const isActive = state.activeCaseId === testCase.id;
              const selectorRef = getCaseSelectorRef(testCase.id);
              const values = state.valuesByCaseId[testCase.id];
              const status = state.isDirty && isActive ? "modified" : state.statuses[testCase.id];
              const label = statusLabel(status);
              const isRecommendedStart =
                !hasRunLibraryCase && testCase.id === state.cases[0]?.id;

              return (
                <ListItem
                  align="first-line"
                  className="lab-case-row"
                  description={(
                    <VStack gap={0.5}>
                      {testCase.description && (
                        <Text color="secondary" type="supporting">{testCase.description}</Text>
                      )}
                      <HStack align="center" gap={1} justify="between" wrap="nowrap">
                        <Text color="secondary" type="supporting">
                          Sides: {values.a}, {values.b}, {values.c}
                        </Text>
                        {!isNarrow && (
                          <HStack align="center" gap={1}>
                            <StatusDot label={label} variant={statusVariant(status)} />
                            <Text color="secondary" type="supporting">{label}</Text>
                          </HStack>
                        )}
                      </HStack>
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
                      label={"Test " + (index + 1) + ": " + testCase.name +
                        (isRecommendedStart ? ", recommended first case" : "") +
                        ", sides " + values.a + ", " + values.b + ", " + values.c + ", " + label.toLowerCase()}
                      onClick={() => onSelectCase(testCase)}
                      ref={selectorRef}
                      variant="ghost"
                      width="100%"
                    >
                      {isRecommendedStart ? (
                        <HStack align="center" gap={1} justify="between" width="100%">
                          <Text type="label">{testCase.name}</Text>
                          <Text color="secondary" type="supporting">Start here</Text>
                        </HStack>
                      ) : testCase.name}
                    </Button>
                  )}
                  startContent={state.isCaseToolsOpen ? (
                    <CheckboxInput
                      isDisabled={isBusy}
                      isLabelHidden
                      label={"Select " + testCase.name + " for a batch run"}
                      onChange={() => onToggleCaseForBatch(testCase.id)}
                      value={state.selectedCaseIds.includes(testCase.id)}
                    />
                  ) : undefined}
                />
              );
            })}
          </List>
        </VStack>
      ))}
    </VStack>
  ) : (
    <Text color="secondary" type="supporting">
      No cases match these filters. Clear the selected tags to show all cases.
    </Text>
  );

  return (
    <Section className="lab-case-library" aria-label="Triangle test case library" padding={isNarrow ? 2 : 3}>
      <VStack gap={isNarrow ? 2 : 3}>
        <HStack align="center" justify="between">
          <Heading level={2}>Case library</Heading>
          <Text color="secondary" type="supporting">
            {describeVisibleCaseCount(visibleCases.length, state.cases.length)}
          </Text>
        </HStack>

        {!isNarrow && (
          <Button
            isDisabled={isBusy}
            label="Add custom case"
            onClick={onAddCustomCase}
            variant="secondary"
            width="100%"
          />
        )}

        <MultiSelector
          description={hasAllBuiltInExamplesSelected
            ? "Includes 3 defects and 3 passing examples."
            : "Filter by source or tag."}
          hasClear
          isDisabled={isBusy}
          label="Filter cases"
          onChange={onUpdateCaseFilters}
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
          onOpenChange={onCaseToolsVisibilityChange}
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
              <Button
                isDisabled={isBusy || state.selectedCaseIds.length === 0}
                isLoading={Boolean(batchProgress)}
                label="Run selected cases"
                onClick={onRunSelectedCases}
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
              onClick={() => onEditCustomCase(activeCase)}
              variant="secondary"
            />
            <Button
              isDisabled={isBusy}
              label="Delete case"
              onClick={onRequestDeleteCase}
              variant="destructive"
            />
          </HStack>
        )}
      </VStack>
    </Section>
  );
}
