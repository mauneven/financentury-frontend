"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { sessionApi } from "@/lib/api";
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
import { LogOut, Trash2, TriangleAlert, ChevronDown, Pencil, Check, X, Monitor, Smartphone, Tablet, Loader2, ShieldX } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/budget";

const ICON_STROKE = 1.8;

function DeviceIcon({ type }: { type: string }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="size-5" strokeWidth={ICON_STROKE} />;
    case "tablet":
      return <Tablet className="size-5" strokeWidth={ICON_STROKE} />;
    default:
      return <Monitor className="size-5" strokeWidth={ICON_STROKE} />;
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

function SessionsList({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setError(false);
    try {
      const data = await sessionApi.list();
      setSessions(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await sessionApi.revoke(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // silently handle
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={ICON_STROKE} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-4 gap-2">
        <p className="text-xs text-muted-foreground">{t("errorLoadingSessions")}</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchSessions(); }}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t("noSessions")}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {sessions.map((session) => (
        <div key={session.id} className="flex items-start gap-3 py-3">
          <div className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border mt-0.5",
            session.is_current
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground"
          )}>
            <DeviceIcon type={session.device_type} />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {session.browser} — {session.os}
              </p>
              {session.is_current && (
                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md border bg-primary text-primary-foreground border-primary">
                  {t("thisDevice")}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {session.ip_address}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("lastActive")} {formatRelativeTime(session.last_active_at)}
            </p>
          </div>

          {!session.is_current && (
            <Button
              variant="ghost"
              size="sm"
              disabled={revokingId === session.id}
              onClick={() => handleRevoke(session.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive text-xs gap-1"
            >
              {revokingId === session.id ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={ICON_STROKE} />
              ) : (
                <ShieldX className="size-3.5" strokeWidth={ICON_STROKE} />
              )}
              {revokingId === session.id ? t("revoking") : t("revoke")}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AccountPage() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  // Narrow selectors: actions are stable refs, `user` is the only reactive
  // field needed. Full-store destructure would re-render on token/loading
  // changes unrelated to this page.
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const updateName = useAuthStore((s) => s.updateName);

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
                <div className="flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
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
                        <Check className="size-4" strokeWidth={ICON_STROKE} />
                      </button>
                      <button onClick={() => { setEditingName(false); setNameValue(user?.full_name || ""); setNameError(null); }} disabled={nameSaving} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <X className="size-4" strokeWidth={ICON_STROKE} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        {user?.full_name || t("noName")}
                      </p>
                      <button onClick={() => { setNameValue(user?.full_name || ""); setEditingName(true); }} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3.5" strokeWidth={ICON_STROKE} />
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

          {/* Active Sessions */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t("activeSessions")}
              </p>
              <SessionsList t={t} />
            </CardContent>
          </Card>

          {/* Sign out */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <button
                className="flex items-center gap-3 w-full py-2 text-sm text-left text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { signOut(); router.push("/"); }}
              >
                <LogOut className="size-4" strokeWidth={ICON_STROKE} />
                {t("signOut")}
              </button>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className={cn("transition-colors", dangerOpen ? "border-destructive/60" : "border-destructive/30")}>
            <button
              type="button"
              onClick={() => setDangerOpen((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-4 text-left"
            >
              <span className="text-sm font-medium text-destructive">
                {t("dangerZone")}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 text-destructive transition-transform duration-200",
                  dangerOpen && "rotate-180"
                )}
                strokeWidth={ICON_STROKE}
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
                    <Trash2 className="size-3.5" strokeWidth={ICON_STROKE} />
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
                <TriangleAlert className="size-4 text-destructive" strokeWidth={ICON_STROKE} />
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
