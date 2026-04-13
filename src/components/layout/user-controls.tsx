"use client";

import { useAuthStore } from "@/store/auth-store";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function UserIndicator() {
  const { user } = useAuthStore();

  const displayName = user?.full_name || user?.email || "User";
  const initials = displayName
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
      <Avatar size="sm" className="overflow-hidden">
        <AvatarFallback className="bg-foreground text-background font-mono text-[10px] font-bold">{initials}</AvatarFallback>
      </Avatar>
    </Link>
  );
}
