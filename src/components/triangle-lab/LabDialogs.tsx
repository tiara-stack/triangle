import type { FormEvent } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import type { LabState } from "../../lib/labState";
import type { SideInputError, SideValues } from "../../lib/triangle";
import { sideValue } from "./presentation";

type CustomCaseDialogProps = {
  isOpen: boolean;
  draft: LabState["customCaseDraft"];
  nameError: string | null;
  inputError: SideInputError | null;
  onClose: () => void;
  onSideChange: (side: keyof SideValues, value: number | null) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTagsChange: (tags: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CustomCaseDialog({
  isOpen,
  draft,
  nameError,
  inputError,
  onClose,
  onSideChange,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
  onSubmit,
}: CustomCaseDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) onClose();
      }}
      purpose="form"
      width="42rem"
    >
      <DialogHeader
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) onClose();
        }}
        subtitle="Whole-number sides from 1 to 200. Built-in examples stay fixed."
        title={draft.editingCaseId ? "Edit case details" : "New custom case"}
      />
      <form noValidate onSubmit={onSubmit}>
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
                onChange={(value) => onSideChange(side, value)}
                status={inputError?.side === side
                  ? { type: "error", message: inputError.message }
                  : undefined}
                value={sideValue(draft.values[side])}
              />
            ))}
          </Grid>
          <TextInput
            autoComplete="off"
            isRequired
            label="Case name"
            onChange={(name) => onNameChange(name.slice(0, 48))}
            status={nameError ? { type: "error", message: nameError } : undefined}
            value={draft.name}
          />
          <TextArea
            isOptional
            label="Description"
            maxLength={180}
            onChange={onDescriptionChange}
            placeholder="What should this case demonstrate?"
            rows={3}
            value={draft.description}
          />
          <TextInput
            autoComplete="off"
            description="Add one or more tags, separated by commas."
            isOptional
            label="Tags"
            onChange={onTagsChange}
            placeholder="boundary case, equal sides"
            value={draft.tags}
          />
          <HStack align="center" gap={2} justify="end" wrap="wrap">
            <Button label="Cancel" onClick={onClose} variant="secondary" />
            <Button
              label={draft.editingCaseId ? "Save details" : "Save case"}
              type="submit"
              variant="primary"
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}

type DeleteCaseDialogProps = {
  caseName: string;
  isOpen: boolean;
  onDelete: () => void;
  onClose: () => void;
};

export function DeleteCaseDialog({ caseName, isOpen, onDelete, onClose }: DeleteCaseDialogProps) {
  return (
    <AlertDialog
      actionLabel="Delete case"
      description={'Delete "' + caseName + '" from this session? Its run history will remain.'}
      isOpen={isOpen}
      onAction={onDelete}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) onClose();
      }}
      title="Delete this custom case?"
    />
  );
}
