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
import { LogOut, Trash2, TriangleAlert, ChevronDown, Pencil, Check, X } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

export default function AccountPage() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user, signOut, deleteAccount, updateName } = useAuthStore();
  const { locale, setLocale } = useLocaleStore();

  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Editable name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.full_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

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

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    if (trimmed === user?.full_name) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      await updateName(trimmed);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  }

  const initials = (user?.full_name || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AuthGuard>
      <AppShell>
        <div className="mx-auto max-w-md p-4 pt-8 space-y-4">

          {/* Profile */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex size-13 shrink-0 items-center justify-center rounded-full bg-foreground text-background font-mono text-sm font-bold">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setNameValue(user?.full_name || ""); } }}
                        disabled={nameSaving}
                        maxLength={100}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <button onClick={handleSaveName} disabled={nameSaving || !nameValue.trim()} className="shrink-0 text-foreground hover:opacity-70 disabled:opacity-30">
                        <Check className="size-4" />
                      </button>
                      <button onClick={() => { setEditingName(false); setNameValue(user?.full_name || ""); setNameError(null); }} disabled={nameSaving} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        {user?.full_name || t("noName")}
                      </p>
                      <button onClick={() => { setNameValue(user?.full_name || ""); setEditingName(true); }} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  )}
                  {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
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
