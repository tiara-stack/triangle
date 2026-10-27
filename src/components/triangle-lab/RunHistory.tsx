import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { ScrollableArea } from "@astryxdesign/core/ScrollableArea";
import { Section } from "@astryxdesign/core/Section";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { RunRecord } from "../../lib/labState";
import { displayTriangleOutput } from "./presentation";

type RunHistoryProps = {
  history: ReadonlyArray<RunRecord>;
  isNarrow: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function RunHistory({ history, isNarrow, isOpen, onOpenChange }: RunHistoryProps) {
  const historyCount = `This session · ${history.length} ${history.length === 1 ? "run" : "runs"}`;
  const historyRecords = history.length > 0 ? (
    <List density="compact" edge="flush" hasDividers>
      {history.map((run) => {
        const outcomeLabel = run.result.failed ? "Classifier mismatch" : "Matches expected";
        const outcomeAccessibleLabel = run.result.failed
          ? "Classifier mismatch"
          : "Matches expected";

        return (
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
                  label={outcomeAccessibleLabel}
                  variant={run.result.failed ? "error" : "success"}
                />
                <Text type="supporting">{outcomeLabel}</Text>
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
        );
      })}
    </List>
  ) : (
    <Text color="secondary" type="supporting">
      No runs yet. Run a case and its result will appear here.
    </Text>
  );

  if (isNarrow) {
    return (
      <Section aria-labelledby="run-ledger-title" padding={3}>
        <VStack gap={2}>
          <HStack align="center" justify="between" wrap="wrap">
            <Heading level={2} id="run-ledger-title">Run history</Heading>
            <Text color="secondary" type="supporting">{historyCount}</Text>
          </HStack>
          <Collapsible
            className="lab-mobile-history"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            trigger={(
              <HStack align="center" gap={2} width="100%">
                <Text type="label">{isOpen ? "Hide runs" : "Show runs"}</Text>
              </HStack>
            )}
          >
            {historyRecords}
          </Collapsible>
        </VStack>
      </Section>
    );
  }

  return (
    <Collapsible
      className="lab-history-drawer"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={(
        <HStack align="center" gap={2}>
          <Text type="large">Run history</Text>
          <Text color="secondary" type="supporting">{historyCount}</Text>
        </HStack>
      )}
    >
      <ScrollableArea axis="block" className="lab-history-scroll" label="Session run history">
        {historyRecords}
      </ScrollableArea>
    </Collapsible>
  );
}
