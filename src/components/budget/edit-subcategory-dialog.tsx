"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, Trash2 } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { useTranslations } from "@/i18n/client";
import type { Subcategory } from "@/types/budget";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const subcategorySchema = z.object({
  name: z
    .string()
    .min(1, "Subcategory name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_percent: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(100, "Must be 100 or less"),
  icon: z.string().min(1, "Pick an icon"),
});

type SubcategoryFormValues = z.infer<typeof subcategorySchema>;

// ---------------------------------------------------------------------------
// Emoji picker (simple grid)
// ---------------------------------------------------------------------------

const EMOJI_OPTIONS = [
  "\ud83c\udfe0", "\ud83c\udf7d\ufe0f", "\ud83d\ude97", "\ud83d\udca1", "\ud83c\udf89", "\ud83c\udfac", "\ud83d\udc55", "\u2708\ufe0f",
  "\ud83c\udfe6", "\ud83d\udcc8", "\ud83d\udcb0", "\ud83d\udcda", "\ud83c\udfe5", "\ud83d\udc3e", "\ud83c\udfae", "\ud83c\udfb5",
  "\u2615", "\ud83d\uded2", "\ud83d\udcbb", "\ud83d\udcf1", "\ud83c\udfcb\ufe0f", "\ud83c\udfa8", "\ud83d\udd27", "\ud83c\udf31",
];

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md text-lg transition-all duration-150",
            "hover:bg-muted",
            value === emoji
              ? "bg-emerald-500/10 ring-2 ring-emerald-500/40"
              : "bg-transparent"
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EditSubcategoryDialogProps {
  categoryId: string;
  subcategory: Subcategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function EditSubcategoryDialog({
  categoryId,
  subcategory,
  open,
  onOpenChange,
}: EditSubcategoryDialogProps) {
  const t = useTranslations("category");
  const tc = useTranslations("common");
  const updateSubcategory = useBudgetStore((s) => s.updateSubcategory);
  const deleteSubcategoryAction = useBudgetStore((s) => s.deleteSubcategory);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      name: subcategory.name,
      allocation_percent: subcategory.allocation_percent,
      icon: subcategory.icon || "\ud83d\udccc",
    },
  });

  const watchIcon = watch("icon");

  // Reset form when subcategory changes or dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        name: subcategory.name,
        allocation_percent: subcategory.allocation_percent,
        icon: subcategory.icon || "\ud83d\udccc",
      });
      setShowDeleteConfirm(false);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [open, subcategory, reset]);

  const onSubmit = async (values: SubcategoryFormValues) => {
    setIsSubmitting(true);
    try {
      await updateSubcategory(categoryId, subcategory.id, {
        name: values.name,
        allocation_percent: values.allocation_percent,
        icon: values.icon,
      });
      await refreshSummary();
      onOpenChange(false);
    } catch {
      // error handling upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSubcategoryAction(categoryId, subcategory.id);
      await refreshSummary();
      onOpenChange(false);
    } catch {
      // error handling upstream
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editSubcategory")}</DialogTitle>
          <DialogDescription>
            {t("editSubcategoryDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label>{t("icon")}</Label>
            <EmojiPicker
              value={watchIcon}
              onChange={(emoji) => setValue("icon", emoji)}
            />
            {errors.icon && (
              <p className="text-xs text-destructive">{errors.icon.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-name">{t("subcategoryName")}</Label>
            <Input
              id="edit-sub-name"
              placeholder={t("subcategoryName")}
              autoFocus
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Allocation */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-sub-allocation">
              {t("allocationPercent")}
            </Label>
            <InputGroup>
              <InputGroupInput
                id="edit-sub-allocation"
                type="number"
                min={0}
                max={100}
                aria-invalid={!!errors.allocation_percent}
                {...register("allocation_percent", { valueAsNumber: true })}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>%</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {errors.allocation_percent && (
              <p className="text-xs text-destructive">
                {errors.allocation_percent.message}
              </p>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {/* Delete */}
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4 mr-1" />
                {t("deleteSubcategory")}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 mr-1 animate-spin" />
                      {t("deleting")}
                    </>
                  ) : (
                    tc("confirm")
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {tc("cancel")}
                </Button>
              </div>
            )}

            {/* Save */}
            <Button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1" />
                  {tc("save")}
                </>
              )}
            </Button>
          </div>

          {showDeleteConfirm && (
            <p className="text-xs text-destructive">
              {t("confirmDeleteSubcategory")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
