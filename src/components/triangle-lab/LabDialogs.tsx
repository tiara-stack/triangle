import { Effect } from "effect";
import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
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
import { validateSideInput, type SideInputError, type SideValues } from "../../lib/triangle";
import { sideValue } from "./presentation";

export type CustomCaseFormValues = {
  a: string;
  b: string;
  c: string;
  name: string;
  description: string;
  tags: string;
};

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
  onSubmit: (values: CustomCaseFormValues) => void;
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
  const form = useForm({
    defaultValues: {
      a: draft.values.a,
      b: draft.values.b,
      c: draft.values.c,
      name: draft.name,
      description: draft.description,
      tags: draft.tags,
    },
    onSubmit: async ({ value }) => onSubmit(value),
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      a: draft.values.a,
      b: draft.values.b,
      c: draft.values.c,
      name: draft.name,
      description: draft.description,
      tags: draft.tags,
    });
  }, [draft.editingCaseId, form, isOpen]);

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
        subtitle="Custom cases stay in this session only. Use whole numbers; values outside 1–200 can test range handling."
        title={draft.editingCaseId ? "Edit case details" : "New custom case"}
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <VStack gap={3}>
          <Grid columns={{ minWidth: 112, max: 3 }} gap={2}>
            {(["a", "b", "c"] as const).map((side) => (
              <form.Field
                key={side}
                name={side}
                validators={{
                  onSubmit: ({ value }) => Effect.runSync(validateSideInput(side, value))?.message,
                }}
              >
                {(field) => {
                  const fieldError = field.state.meta.errors[0];
                  return (
                    <NumberInput
                      hasClear
                      htmlName={side}
                      isIntegerOnly
                      isWheelEnabled={false}
                      label={"Side " + side}
                      onChange={(value) => {
                        field.handleChange(value === null ? "" : String(value));
                        onSideChange(side, value);
                      }}
                      status={inputError?.side === side
                        ? { type: "error", message: inputError.message }
                        : typeof fieldError === "string"
                          ? { type: "error", message: fieldError }
                          : undefined}
                      value={sideValue(field.state.value)}
                    />
                  );
                }}
              </form.Field>
            ))}
          </Grid>
          <form.Field
            name="name"
            validators={{
              onSubmit: ({ value }) => value.trim() ? undefined : "Enter a name for this case.",
            }}
          >
            {(field) => {
              const fieldError = field.state.meta.errors[0];
              return (
                <TextInput
                  autoComplete="off"
                  htmlName="name"
                  isRequired
                  label="Case name"
                  onChange={(name) => {
                    const nextName = name.slice(0, 48);
                    field.handleChange(nextName);
                    onNameChange(nextName);
                  }}
                  status={nameError
                    ? { type: "error", message: nameError }
                    : typeof fieldError === "string"
                      ? { type: "error", message: fieldError }
                      : undefined}
                  value={field.state.value}
                />
              );
            }}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <TextArea
                htmlName="description"
                isOptional
                label="Description"
                maxLength={180}
                onChange={(description) => {
                  field.handleChange(description);
                  onDescriptionChange(description);
                }}
                placeholder="What should this case demonstrate?"
                rows={3}
                value={field.state.value}
              />
            )}
          </form.Field>
          <form.Field name="tags">
            {(field) => (
              <TextInput
                autoComplete="off"
                description="Add one or more tags, separated by commas."
                htmlName="tags"
                isOptional
                label="Tags"
                onChange={(tags) => {
                  field.handleChange(tags);
                  onTagsChange(tags);
                }}
                placeholder="boundary case, equal sides"
                value={field.state.value}
              />
            )}
          </form.Field>
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
