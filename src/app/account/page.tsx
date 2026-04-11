"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { LogOut, Globe, Trash2, TriangleAlert } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function AccountPage() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuthStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmWord = t("deleteAccountTypePlaceholder");
  const canConfirm = confirmText === confirmWord;

  function getInitials(name: string | undefined, email: string | undefined) {
    return (name || email || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

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

  return (
    <AuthGuard>
      <AppShell>
        <div className="mx-auto max-w-md p-4 pt-8 space-y-4">

          {/* Profile card */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-14 shrink-0">
                  {user?.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="text-base font-medium">
                    {getInitials(user?.full_name, user?.email)}
                  </AvatarFallback>
                </Avatar>
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

          {/* Settings card */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-1">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-sm">{t("language")}</span>
                </div>
                <LanguageSwitcher />
              </div>
            </CardContent>
          </Card>

          {/* Actions card */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <button
                className="flex items-center gap-3 w-full py-2 text-sm text-left hover:text-foreground transition-colors text-muted-foreground"
                onClick={() => { signOut(); router.push("/"); }}
              >
                <LogOut className="size-4" />
                {t("signOut")}
              </button>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
              {t("dangerZone")}
            </p>
            <Card className="border-destructive/40">
              <CardContent className="pt-4 pb-4">
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
            </Card>
          </div>

        </div>

        {/* Delete account confirmation dialog */}
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
