import { Schema } from "effect";
import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Section } from "@astryxdesign/core/Section";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { TriangleDiagram } from "../TriangleDiagram";
import { SideValueInputSchema, type SideInputError, type SideValues, type TriangleCase, type TriangleRun } from "../../lib/triangle";
import { displayTriangleOutput, sideValue, verifiedDefectForValues } from "./presentation";

type TriangleWorkspaceProps = {
  activeCase: TriangleCase;
  activeCaseNumber: number;
  caseCount: number;
  isCompactMode: boolean;
  values: SideValues;
  result: TriangleRun | null;
  inputError: SideInputError | null;
  valuesAreValid: boolean;
  hasRunError: boolean;
  isNarrow: boolean;
  isBusy: boolean;
  isRunning: boolean;
  onSideChange: (side: keyof SideValues, value: number | null) => void;
  onRunCase: (values: SideValues) => void;
  onResetCase: () => void;
  onChooseAnotherCase: () => void;
  onEditSides: () => void;
  onViewMatchingCase: (testCase: TriangleCase) => void;
};

function describeCompletedRun(result: TriangleRun, failureExplanation?: string): string {
  const expected = displayTriangleOutput(result.expected);
  const observed = displayTriangleOutput(result.observed);

  if (result.failed && failureExplanation) {
    return `Run complete. Expected ${expected}. Observed ${observed}. The classifier returned a different result. ${failureExplanation}`;
  }
  if (result.failed) {
    return `Run complete. Expected ${expected}. Observed ${observed}. The classifier returned a different result.`;
  }

  return `Run complete. The classifier output matches the expected result: ${expected}.`;
}

export function TriangleWorkspace({
  activeCase,
  activeCaseNumber,
  caseCount,
  isCompactMode,
  values,
  result,
  inputError,
  valuesAreValid,
  hasRunError,
  isNarrow,
  isBusy,
  isRunning,
  onSideChange,
  onRunCase,
  onResetCase,
  onChooseAnotherCase,
  onEditSides,
  onViewMatchingCase,
}: TriangleWorkspaceProps) {
  const form = useForm({
    defaultValues: values,
    onSubmit: ({ value }) => onRunCase(value),
  });

  useEffect(() => {
    form.reset(values);
  }, [activeCase.id, activeCase.values.a, activeCase.values.b, activeCase.values.c, form, isCompactMode]);

  const showTriangleDiagram = !isCompactMode || valuesAreValid;
  const workspaceColumns = showTriangleDiagram
    ? { minWidth: 220, max: 2 } as const
    : { minWidth: 220, max: 1 } as const;
  const matchingVerifiedDefect = isCompactMode && result?.failed
    ? verifiedDefectForValues(result.values)
    : undefined;
  const directEntryMismatchExplanation = matchingVerifiedDefect?.failureExplanation
    ? `This matches the verified defect “${matchingVerifiedDefect.name}”: ${matchingVerifiedDefect.failureExplanation}`
    : "The classifier output differs from the triangle rules for these side lengths.";
  const resultFailureExplanation = isCompactMode
    ? result?.failed ? directEntryMismatchExplanation : undefined
    : activeCase.failureExplanation;

  return (
    <Section
      className="lab-workspace"
      aria-label={isCompactMode ? "Triangle test workspace" : "Selected test case workspace"}
      padding={isNarrow ? 2 : 3}
    >
      <VStack gap={isNarrow ? 2 : 3}>
        <HStack className="lab-sheet-band" align="start" justify="between" gap={2}>
          <VStack gap={0.5}>
            <Heading className="lab-sheet-title" level={2}>
              {isCompactMode ? "Enter side lengths" : activeCase.name}
            </Heading>
            {!isCompactMode && activeCase.description && (
              <Text color="secondary" type="supporting">{activeCase.description}</Text>
            )}
          </VStack>
          {!isCompactMode && (
            <Text className="lab-sheet-count" color="secondary" type="supporting">
              Case {activeCaseNumber} of {caseCount}
            </Text>
          )}
        </HStack>

        {!isCompactMode && !result && activeCase.failureExplanation && (
          <VStack className="lab-case-rationale" gap={0.5}>
            <Text color="secondary" type="label">What this case checks</Text>
            <Text color="secondary" type="supporting">{activeCase.failureExplanation}</Text>
          </VStack>
        )}

        <Grid align="start" columns={workspaceColumns} gap={isNarrow ? 3 : 4}>
          <VStack gap={isNarrow ? 3 : 4}>
            <form
              aria-labelledby="input-panel-title"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <VStack gap={isNarrow ? 2 : 3}>
                <VStack gap={0.5}>
                  <Heading level={3} id="input-panel-title">Side lengths</Heading>
                  <Text color="secondary" type="supporting">
                    {isCompactMode || activeCase.source === "custom"
                      ? "Use whole numbers. Values outside 1–200 should be reported as out of range."
                      : "Built-in values are fixed. Add a custom case to change them."}
                  </Text>
                </VStack>
                <Grid columns={{ minWidth: 88, max: 3 }} gap={2}>
                  {(["a", "b", "c"] as const).map((side) => (
                    <form.Field
                      key={side}
                      name={side}
                      validators={{
                        onSubmit: ({ value }) => Schema.is(SideValueInputSchema)(value)
                          ? undefined
                          : `Side ${side} must be a whole number.`,
                      }}
                    >
                      {(field) => {
                        const fieldError = field.state.meta.errors[0];
                        return (
                          <NumberInput
                            hasClear={isCompactMode || activeCase.source === "custom"}
                            htmlName={side}
                            isDisabled={isBusy}
                            isIntegerOnly
                            isReadOnly={!isCompactMode && activeCase.source !== "custom"}
                            isWheelEnabled={false}
                            label={"Side " + side}
                            onChange={(value: number | null) => {
                              field.handleChange(value === null ? "" : String(value));
                              onSideChange(side, value);
                            }}
                            controlStyle={isCompactMode || activeCase.source === "custom" ? undefined : {
                              backgroundColor: "var(--triangle-lab-neutral-wash)",
                              borderColor: "var(--triangle-lab-line)",
                              cursor: "default",
                            }}
                            status={inputError?.side === side
                              ? { type: "error", message: inputError.message }
                              : typeof fieldError === "string"
                                ? { type: "error", message: fieldError }
                                : undefined}
                            step={1}
                            value={sideValue(field.state.value)}
                          />
                        );
                      }}
                    </form.Field>
                  ))}
                </Grid>
                <HStack align="center" gap={2} wrap="wrap">
                  <Button
                    isDisabled={isBusy}
                    isLoading={isRunning}
                    label={isCompactMode ? "Run test" : "Run case"}
                    type="submit"
                    variant="primary"
                  />
                  {!isCompactMode && activeCase.source === "custom" && (
                    <Button
                      isDisabled={isBusy}
                      label="Restore saved case"
                      onClick={() => {
                        onResetCase();
                        form.reset(activeCase.values);
                      }}
                      variant="secondary"
                    />
                  )}
                </HStack>
              </VStack>
            </form>

              <Section className="lab-result-panel" aria-labelledby="result-panel-title" id="result-panel" padding={0} variant="muted">
              <VStack gap={2} padding={isNarrow ? 2 : 3}>
                <Heading level={3} id="result-panel-title">Result</Heading>
                {result ? (
                  <Section className="lab-result-observed" padding={2}>
                    <VStack gap={0.5}>
                      <Text color="secondary" type="label">Observed</Text>
                      <Text color="secondary" type="supporting">Faulty classifier</Text>
                      <Heading level={4}>{displayTriangleOutput(result.observed)}</Heading>
                    </VStack>
                  </Section>
                ) : (
                  <Text color="secondary" type="supporting">
                    {hasRunError
                      ? isCompactMode ? "Could not run this test. Retry it." : "Could not run this case. Retry it."
                      : isCompactMode
                        ? "Run the test to compare the expected result with the classifier."
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
                {result && (
                  <HStack
                    aria-atomic="true"
                    aria-label={describeCompletedRun(result, resultFailureExplanation)}
                    className={result.failed ? "lab-assertion lab-assertion--failed" : "lab-assertion lab-assertion--passed"}
                    align="center"
                    gap={2}
                    role="status"
                  >
                    <StatusDot
                      label={result.failed ? "Classifier mismatch" : "Output matches expected result"}
                      variant={result.failed ? "error" : "success"}
                    />
                    <Text className="lab-assertion__label" type="label">
                      {result.failed ? "Run complete · Classifier mismatch" : "Run complete · Matches expected"}
                    </Text>
                  </HStack>
                )}
                {result?.failed && (isCompactMode || activeCase.failureExplanation) && (
                  <VStack gap={1}>
                    <Text color="secondary" type="supporting">
                      {isCompactMode ? directEntryMismatchExplanation : activeCase.failureExplanation}
                    </Text>
                    {isCompactMode && matchingVerifiedDefect && (
                      <Button
                        isDisabled={isBusy}
                        label={"View “" + matchingVerifiedDefect.name + "” case"}
                        onClick={() => onViewMatchingCase(matchingVerifiedDefect)}
                        variant="secondary"
                      />
                    )}
                  </VStack>
                )}
                {result && isNarrow && !isCompactMode && (
                  <Button
                    isDisabled={isBusy}
                    label="Choose another case"
                    onClick={onChooseAnotherCase}
                    variant="secondary"
                  />
                )}
                {hasRunError && (
                  <HStack align="center" gap={2} role="alert">
                    <StatusDot label="Run failed" variant="error" />
                    <Text type="supporting">
                      {isCompactMode ? "Could not run this test. Retry it." : "Could not run this case. Retry it."}
                    </Text>
                  </HStack>
                )}
                {isCompactMode && isNarrow && (result || hasRunError) && (
                  <Button
                    isDisabled={isBusy}
                    label="Edit sides"
                    onClick={onEditSides}
                    variant="secondary"
                  />
                )}
              </VStack>
              </Section>
          </VStack>

          {showTriangleDiagram && (
            <VStack gap={2}>
              <Heading level={3}>Triangle diagram</Heading>
              <TriangleDiagram values={values} />
            </VStack>
          )}
        </Grid>
      </VStack>
    </Section>
  );
}
