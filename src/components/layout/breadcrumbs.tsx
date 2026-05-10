"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams,usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

import { useBudgets, useBudgetSummary } from "@/hooks/use-budget-queries";
import { useTranslations } from "@/i18n/client";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams<{
    id?: string;
    categoryId?: string;
  }>();
  // Destructure to primitives for stable useMemo deps.
  const paramId = params.id;
  const paramCategoryId = params.categoryId;
  const { data: summary } = useBudgetSummary(paramId);
  const { data: budgets = [] } = useBudgets();
  const t = useTranslations("navbar");

  const basePath = "/budget";

  const segments = useMemo((): BreadcrumbSegment[] => {
    const segs: BreadcrumbSegment[] = [];

    if (pathname === "/account") {
      segs.push({ label: t("account"), href: "/account" });
      return segs;
    }

    if (!paramId) return segs;

    // Budget level
    const budgetName =
      summary?.budget.name ??
      budgets.find((b) => b.id === paramId)?.name ??
      "...";

    segs.push({ label: t("budgets"), href: "/" });
    segs.push({ label: budgetName, href: `${basePath}/${paramId}` });

    // Settings
    if (pathname.endsWith("/settings")) {
      segs.push({
        label: t("settings"),
        href: `${basePath}/${paramId}/settings`,
      });
      return segs;
    }

    // Category level — directly under the budget (no section segment).
    if (paramCategoryId) {
      // Look in own categories first, then linked categories.
      let categoryName = "...";
      const ownHit = summary?.categories.find(
        (c) => c.category.id === paramCategoryId
      );
      if (ownHit) {
        categoryName = ownHit.category.name;
      } else {
        const linkedHit = summary?.linked_categories?.find(
          (l) => l.category.category.id === paramCategoryId
        );
        if (linkedHit) categoryName = linkedHit.category.category.name;
      }
      segs.push({
        label: categoryName,
        href: `${basePath}/${paramId}/category/${paramCategoryId}`,
      });
    }

    return segs;
  }, [pathname, paramId, paramCategoryId, summary, budgets, t]);

  if (segments.length === 0) return null;

  return (
    <div>
      <nav className="flex items-center gap-2 py-3 min-w-0" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 min-w-0 overflow-hidden">
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            return (
              <li key={seg.href} className="flex items-center gap-1 min-w-0">
                {i > 0 && (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
                )}
                {isLast ? (
                  <span className="text-sm font-medium text-foreground truncate">
                    {seg.label}
                  </span>
                ) : (
                  <Link
                    href={seg.href}
                    className="text-sm text-muted-foreground truncate transition-colors hover:text-foreground"
                  >
                    <span className={i < segments.length - 2 ? "hidden sm:inline" : ""}>
                      {seg.label}
                    </span>
                    {i < segments.length - 2 && (
                      <span className="sm:hidden">...</span>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
