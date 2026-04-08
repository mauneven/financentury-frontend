"use client";

import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";
import { useTheme } from "next-themes";
import { LogIn, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { user, mode, signInWithGoogle } = useAuthStore();
  const t = useTranslations("localMode");

  if (mode === "local") {
    return (
      <button
        type="button"
        onClick={signInWithGoogle}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">{t("signIn")}</span>
      </button>
    );
  }

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
      <Avatar size="sm">
        {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </Link>
  );
}
