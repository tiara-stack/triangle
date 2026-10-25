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
import type { SideInputError, SideValues, TriangleCase, TriangleRun } from "../../lib/triangle";
import { displayTriangleOutput, sideValue } from "./presentation";

type TriangleWorkspaceProps = {
  activeCase: TriangleCase;
  activeCaseNumber: number;
  caseCount: number;
  values: SideValues;
  result: TriangleRun | null;
  inputError: SideInputError | null;
  hasRunError: boolean;
  isNarrow: boolean;
  isBusy: boolean;
  isRunning: boolean;
  onSideChange: (side: keyof SideValues, value: number | null) => void;
  onRunCase: () => void;
  onResetCase: () => void;
};

export function TriangleWorkspace({
  activeCase,
  activeCaseNumber,
  caseCount,
  values,
  result,
  inputError,
  hasRunError,
  isNarrow,
  isBusy,
  isRunning,
  onSideChange,
  onRunCase,
  onResetCase,
}: TriangleWorkspaceProps) {
  return (
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
            Case {activeCaseNumber} of {caseCount}
          </Text>
        </HStack>

        {!result && activeCase.failureExplanation && (
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
                onRunCase();
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
                      onChange={(value: number | null) => onSideChange(side, value)}
                      controlStyle={activeCase.source === "custom" ? undefined : {
                        backgroundColor: "var(--triangle-lab-neutral-wash)",
                        borderColor: "var(--triangle-lab-line)",
                        cursor: "default",
                      }}
                      status={inputError?.side === side
                        ? { type: "error", message: inputError.message }
                        : undefined}
                      step={1}
                      value={sideValue(values[side])}
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
                      onClick={onResetCase}
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
                  <Grid align="start" columns={{ minWidth: 120, max: 2 }} gap={2}>
                    <Section className="lab-result-expected" padding={2}>
                      <VStack gap={0.5}>
                        <Text color="secondary" type="label">Expected</Text>
                        <Text color="secondary" type="supporting">Triangle rules</Text>
                        <Heading level={4}>{displayTriangleOutput(result.expected)}</Heading>
                      </VStack>
                    </Section>
                    <Section className="lab-result-observed" padding={2}>
                      <VStack gap={0.5}>
                        <Text color="secondary" type="label">Observed</Text>
                        <Text color="secondary" type="supporting">Faulty classifier</Text>
                        <Heading level={4}>{displayTriangleOutput(result.observed)}</Heading>
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
                {result && (
                  <HStack
                    aria-atomic="true"
                    aria-label={
                      "Expected " + displayTriangleOutput(result.expected) +
                      ". Observed " + displayTriangleOutput(result.observed) +
                      ". " + (result.failed ? "Assertion failed." : "Assertion passed.") +
                      (result.failed && activeCase.failureExplanation ? " " + activeCase.failureExplanation : "")
                    }
                    className={result.failed ? "lab-assertion lab-assertion--failed" : "lab-assertion lab-assertion--passed"}
                    align="center"
                    gap={2}
                    role="status"
                  >
                    <StatusDot
                      label={result.failed ? "Assertion failed" : "Assertion passed"}
                      variant={result.failed ? "error" : "success"}
                    />
                    <Text className="lab-assertion__label" type="label">
                      {result.failed ? "Assertion failed" : "Assertion passed"}
                    </Text>
                  </HStack>
                )}
                {result?.failed && activeCase.failureExplanation && (
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
            <TriangleDiagram values={values} />
          </VStack>
        </Grid>
      </VStack>
    </Section>
  );
}
