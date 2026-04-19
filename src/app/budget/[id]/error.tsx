"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ICON_STROKE = 1.8;

/**
 * Only show the raw error.message in development. In production, raw messages
 * could leak stack fragments, PII, or server internals.
 */
function displayMessage(error: Error & { digest?: string }): string {
  if (process.env.NODE_ENV === "development") {
    return (
      (error.message || "").slice(0, 500) ||
      "An unexpected error occurred while loading this budget."
    );
  }
  return error.digest
    ? `An unexpected error occurred while loading this budget. (Ref: ${error.digest})`
    : "An unexpected error occurred while loading this budget.";
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md border border-border rounded-lg bg-card p-8 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-lg border border-border bg-muted">
          <AlertTriangle className="size-7 text-foreground" strokeWidth={ICON_STROKE} />
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {displayMessage(error)}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>

          <Button variant="outline" render={<Link href="/budgets" />} className="w-full">
            Go to Budgets
          </Button>
        </div>
      </div>
    </div>
  );
}
