"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Loader2, Check, Trash2 } from "lucide-react";

import { useBudgetStore } from "@/store/budget-store";
import { cn } from "@/lib/utils";
import { IconPicker, CategoryIcon } from "@/lib/icon-picker";

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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const sectionSchema = z.object({
  name: z
    .string()
    .min(1, "Section name is required")
    .max(60, "Name must be 60 characters or less"),
  allocation_percent: z
    .number({ message: "Allocation is required" })
    .min(0, "Must be 0 or more")
    .max(100, "Must be 100 or less"),
  icon: z.string().min(1, "Pick an icon"),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

// ---------------------------------------------------------------------------
// (Icon picker imported from @/lib/icon-picker)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Category inline editor
// ---------------------------------------------------------------------------

interface CategoryDraft {
  id: string;
  name: string;
  allocation_percent: number;
  icon: string;
}

function CategoryEditor({
  categories,
  onChange,
}: {
  categories: CategoryDraft[];
  onChange: (updated: CategoryDraft[]) => void;
}) {
  const t = useTranslations("section");
  const addCategory = () => {
    onChange([
      ...categories,
      {
        id: crypto.randomUUID(),
        name: "",
        allocation_percent: 0,
        icon: "tag",
      },
    ]);
  };

  const removeCategory = (id: string) => {
    onChange(categories.filter((s) => s.id !== id));
  };

  const updateCategory = (
    id: string,
    field: keyof CategoryDraft,
    value: string | number
  ) => {
    onChange(
      categories.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {t("subcategoriesOptional")}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={addCategory}
        >
          <PlusCircle className="size-3 mr-1" />
          {t("add")}
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="space-y-2">
          {categories.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-2 border-2 border-foreground bg-card/50 p-2"
            >
              <CategoryIcon iconKey={sub.icon} className="size-4" />
              <Input
                placeholder={t("subcategoryName")}
                value={sub.name}
                onChange={(e) =>
                  updateCategory(sub.id, "name", e.target.value)
                }
                className="h-7 text-xs flex-1"
              />
              <InputGroup className="h-7 w-20">
                <InputGroupInput
                  type="text"
                  inputMode="numeric"
                  value={sub.allocation_percent}
                  onChange={(e) =>
                    updateCategory(
                      sub.id,
                      "allocation_percent",
                      Number(e.target.value.replace(/[^\d.]/g, "")) || 0
                    )
                  }
                  className="text-right text-xs h-7"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText className="text-xs">%</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeCategory(sub.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddSectionDialogProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function AddSectionDialog({
  budgetId,
  open,
  onOpenChange,
}: AddSectionDialogProps) {
  const t = useTranslations("section");
  const tc = useTranslations("common");
  const addSection = useBudgetStore((s) => s.addSection);
  const addCategoryAction = useBudgetStore((s) => s.addCategory);
  const refreshSummary = useBudgetStore((s) => s.refreshSummary);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<CategoryDraft[]>(
    []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      name: "",
      allocation_percent: 0,
      icon: "🏠",
    },
  });

  const watchIcon = watch("icon");

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        reset({ name: "", allocation_percent: 0, icon: "🏠" });
        setCategories([]);
        setIsSubmitting(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open, reset]);

  const onSubmit = async (values: SectionFormValues) => {
    setIsSubmitting(true);
    try {
      const section = await addSection({
        name: values.name,
        allocation_percent: values.allocation_percent,
        icon: values.icon,
      });

      // Create categories
      const validCats = categories.filter((s) => s.name.trim().length > 0);
      for (const cat of validCats) {
        await addCategoryAction(section.id, {
          name: cat.name,
          allocation_percent: cat.allocation_percent,
          icon: cat.icon,
        });
      }

      await refreshSummary();
      onOpenChange(false);
    } catch {
      // error handling upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addSection")}</DialogTitle>
          <DialogDescription>
            {t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label>{t("icon")}</Label>
            <IconPicker
              value={watchIcon}
              onChange={(iconKey) => setValue("icon", iconKey)}
            />
            {errors.icon && (
              <p className="text-xs text-destructive">{errors.icon.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">{t("sectionName")}</Label>
            <Input
              id="cat-name"
              placeholder={t("sectionNamePlaceholder")}
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
            <Label htmlFor="cat-allocation">{t("allocationPercent")}</Label>
            <InputGroup>
              <InputGroupInput
                id="cat-allocation"
                type="text"
                inputMode="numeric"
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

          {/* Categories */}
          <CategoryEditor
            categories={categories}
            onChange={setCategories}
          />

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1" />
                  {t("addSection")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
