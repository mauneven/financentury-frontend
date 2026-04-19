"use client";

import { useAuthStore } from "@/store/auth-store";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground"
    >
      <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.8} />
      <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.8} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

/** Truncate name to fit max chars, cutting at word boundary when possible. */
function truncateName(name: string, max: number): string {
  if (name.length <= max) return name;
  // Try to cut at last space within the limit.
  const sliced = name.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > 0) return sliced.slice(0, lastSpace);
  // Single long word — hard cut with ellipsis.
  return name.slice(0, max - 1) + "\u2026";
}

export function UserIndicator() {
  // Narrow selector: this component only uses `user`. A full-store destructure
  // would re-render on every token refresh / loading / justLoggedIn toggle.
  const user = useAuthStore((s) => s.user);

  const fullName = user?.full_name || "";
  const displayName = fullName ? truncateName(fullName, 15) : (user?.email?.split("@")[0] || "User");
  const initials = (fullName || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href="/account"
      className="flex items-center gap-2 transition-colors hover:opacity-80"
    >
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
        {initials}
      </div>
      <span className="hidden sm:block text-xs font-medium text-foreground">
        {displayName}
      </span>
    </Link>
  );
}
