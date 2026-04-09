"use client";

import { useMemo } from "react";
import { usePathname, useParams } from "next/navigation";
import { useBudgetStore } from "@/store/budget-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams<{
    id?: string;
    sectionId?: string;
    categoryId?: string;
  }>();
  const mode = useAuthStore((s) => s.mode);
  const summary = useBudgetStore((s) => s.summary);
  const budgets = useBudgetStore((s) => s.budgets);
  const t = useTranslations("navbar");

  const basePath = mode === "local" ? "/localBudget" : "/budget";

  const segments = useMemo((): BreadcrumbSegment[] => {
    const segs: BreadcrumbSegment[] = [];

    // Account page
    if (pathname === "/account") {
      segs.push({ label: t("account"), href: "/account" });
      return segs;
    }

    // Not in a budget route
    if (!params.id) return segs;

    // Budget level
    const budgetName =
      summary?.budget.name ??
      budgets.find((b) => b.id === params.id)?.name ??
      "...";

    segs.push({ label: t("budgets"), href: "/" });
    segs.push({ label: budgetName, href: `${basePath}/${params.id}` });

    // Settings
    if (pathname.endsWith("/settings")) {
      segs.push({
        label: t("settings"),
        href: `${basePath}/${params.id}/settings`,
      });
      return segs;
    }

    // Section level
    if (params.sectionId) {
      const sectionName =
        summary?.sections.find((s) => s.section.id === params.sectionId)
          ?.section.name ?? "...";
      segs.push({
        label: sectionName,
        href: `${basePath}/${params.id}/section/${params.sectionId}`,
      });
    }

    // Category level
    if (params.categoryId && params.sectionId) {
      let categoryName = "...";
      const sec = summary?.sections.find(
        (s) => s.section.id === params.sectionId
      );
      if (sec) {
        const cat = sec.categories.find(
          (c) => c.category.id === params.categoryId
        );
        if (cat) categoryName = cat.category.name;
      }
      segs.push({
        label: categoryName,
        href: `${basePath}/${params.id}/section/${params.sectionId}/category/${params.categoryId}`,
      });
    }

    return segs;
  }, [pathname, params, summary, budgets, basePath, t]);

  if (segments.length === 0) return null;

  // Back href is the second-to-last segment, or home
  const backHref = segments.length > 1 ? segments[segments.length - 2].href : "/";

  return (
    <div>
      <nav className="flex items-center gap-2 py-3 min-w-0" aria-label="Breadcrumb">
          {/* Breadcrumb segments only - no back button */}
          <ol className="flex items-center gap-1 min-w-0 overflow-hidden">
            {segments.map((seg, i) => {
              const isLast = i === segments.length - 1;
              return (
                <li key={seg.href} className="flex items-center gap-1 min-w-0">
                  {i > 0 && (
                    <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
                  )}
                  {isLast ? (
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground truncate">
                      {seg.label}
                    </span>
                  ) : (
                    <Link
                      href={seg.href}
                      className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate transition-colors hover:text-foreground"
                    >
                      {/* On mobile, hide all but last 2 segments */}
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
