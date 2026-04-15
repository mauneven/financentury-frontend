"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border-2 border-foreground bg-card p-8 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center border-2 border-foreground bg-muted">
          <AlertTriangle className="size-7 text-foreground" />
        </div>

        <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full border-2 border-foreground bg-foreground px-4 py-3 text-xs font-bold uppercase tracking-wider text-background transition-colors hover:bg-background hover:text-foreground"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="w-full border-2 border-foreground bg-background px-4 py-3 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background inline-block"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
