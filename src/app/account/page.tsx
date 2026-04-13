"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/i18n/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { LogOut, Trash2, TriangleAlert, ChevronDown } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

// ── Geometric avatar ──────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { bg: "#6366f1", fg: "#fff" },
  { bg: "#f43f5e", fg: "#fff" },
  { bg: "#f97316", fg: "#fff" },
  { bg: "#14b8a6", fg: "#fff" },
  { bg: "#eab308", fg: "#1a1a1a" },
  { bg: "#ec4899", fg: "#fff" },
  { bg: "#3b82f6", fg: "#fff" },
  { bg: "#22c55e", fg: "#fff" },
  { bg: "#a855f7", fg: "#fff" },
  { bg: "#06b6d4", fg: "#fff" },
  { bg: "#e11d48", fg: "#fff" },
  { bg: "#84cc16", fg: "#1a1a1a" },
];

type Shape = "circle" | "diamond" | "triangle" | "hexagon" | "rounded-square" | "cross";
const SHAPES: Shape[] = ["circle", "diamond", "triangle", "hexagon", "rounded-square", "cross"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  return Math.abs(h);
}

function GeometricAvatar({ seed, size = 56 }: { seed: string; size?: number }) {
  const hash = hashString(seed);
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const shape = SHAPES[Math.floor(hash / AVATAR_PALETTES.length) % SHAPES.length];
  const s = size;
  const c = s / 2;
  const r = s * 0.3;

  let inner: React.ReactNode;

  if (shape === "circle") {
    inner = <circle cx={c} cy={c} r={r} fill={palette.fg} />;
  } else if (shape === "diamond") {
    const d = r * 0.9;
    inner = (
      <polygon
        points={`${c},${c - d} ${c + d},${c} ${c},${c + d} ${c - d},${c}`}
        fill={palette.fg}
      />
    );
  } else if (shape === "triangle") {
    const h2 = r * 0.95;
    inner = (
      <polygon
        points={`${c},${c - h2} ${c + h2 * 0.87},${c + h2 * 0.5} ${c - h2 * 0.87},${c + h2 * 0.5}`}
        fill={palette.fg}
      />
    );
  } else if (shape === "hexagon") {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${c + r * Math.cos(angle)},${c + r * Math.sin(angle)}`;
    }).join(" ");
    inner = <polygon points={pts} fill={palette.fg} />;
  } else if (shape === "rounded-square") {
    const sq = r * 0.78;
    inner = (
      <rect
        x={c - sq}
        y={c - sq}
        width={sq * 2}
        height={sq * 2}
        rx={sq * 0.22}
        fill={palette.fg}
      />
    );
  } else {
    // cross
    const arm = r * 0.28;
    const len = r * 0.85;
    inner = (
      <path
        d={`M${c - arm},${c - len} h${arm * 2} v${len - arm} h${len - arm} v${arm * 2} h${-(len - arm)} v${len - arm} h${-arm * 2} v${-(len - arm)} h${-(len - arm)} v${-arm * 2} h${len - arm} z`}
        fill={palette.fg}
      />
    );
  }

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width={s} height={s} rx={s * 0.22} fill={palette.bg} />
      {inner}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuthStore();
  const { locale, setLocale } = useLocaleStore();

  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmWord = t("deleteAccountTypePlaceholder");
  const canConfirm = confirmText === confirmWord;

  async function handleDeleteAccount() {
    if (!canConfirm) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  }

  function handleOpenDialog() {
    setConfirmText("");
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }

  const avatarSeed = user?.email || user?.full_name || "user";

  return (
    <AuthGuard>
      <AppShell>
        <div className="mx-auto max-w-md p-4 pt-8 space-y-4">

          {/* Profile */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <GeometricAvatar seed={avatarSeed} size={52} />
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {user?.full_name || t("noName")}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("language")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocale("en")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-colors",
                    locale === "en"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  English
                </button>
                <button
                  onClick={() => setLocale("es")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-colors",
                    locale === "es"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  Español
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Sign out */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <button
                className="flex items-center gap-3 w-full py-2 text-sm text-left text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { signOut(); router.push("/"); }}
              >
                <LogOut className="size-4" />
                {t("signOut")}
              </button>
            </CardContent>
          </Card>

          {/* Danger zone — accordion */}
          <Card className={cn("border-2 transition-colors", dangerOpen ? "border-destructive/60" : "border-destructive/30")}>
            <button
              type="button"
              onClick={() => setDangerOpen((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-4 text-left"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                {t("dangerZone")}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 text-destructive transition-transform duration-200",
                  dangerOpen && "rotate-180"
                )}
              />
            </button>

            {dangerOpen && (
              <CardContent className="pt-0 pb-4">
                <div className="h-px bg-destructive/20 mb-4" />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t("deleteAccount")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {t("deleteAccountDescription")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    onClick={handleOpenDialog}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <TriangleAlert className="size-4 text-destructive" />
                <DialogTitle>{t("deleteAccountConfirmTitle")}</DialogTitle>
              </div>
              <DialogDescription className="text-sm leading-relaxed">
                {t("deleteAccountConfirmDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <p className="text-xs text-muted-foreground">
                {t("deleteAccountTypePrompt")}
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmWord}
                disabled={isDeleting}
                autoComplete="off"
                spellCheck={false}
              />
              {deleteError && (
                <p className="text-xs text-destructive">{deleteError}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAccount}
                disabled={!canConfirm || isDeleting}
              >
                {isDeleting ? t("deleting") : t("deleteAccountConfirmButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </AppShell>
    </AuthGuard>
  );
}
