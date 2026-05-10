"use client";

import { useCallback,useRef, useState } from "react";

import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/client";
import { useLocaleStore } from "@/i18n/locale";
import { inviteApi } from "@/lib/api";

interface InviteDialogProps {
  budgetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ budgetId, open, onOpenChange }: InviteDialogProps) {
  const t = useTranslations("invite");
  const { locale } = useLocaleStore();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await inviteApi.create(budgetId);
      setInviteUrl(result.invite_url);
      setExpiresAt(result.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    clearCopyTimer();
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteUrl || !canShare) return;
    setSharing(true);
    try {
      await navigator.share({
        title: t("title"),
        text: t("shareText"),
        url: inviteUrl,
      });
    } catch {
      // User cancelled or share failed — silent
    } finally {
      setSharing(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      // Reset state and clear timers when closing
      clearCopyTimer();
      setInviteUrl(null);
      setExpiresAt(null);
      setCopied(false);
      setError(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("generate")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          {!inviteUrl ? (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              aria-busy={generating}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" strokeWidth={1.8} />
                  {t("generating")}
                </>
              ) : (
                <>
                  <Link2 className="size-4 mr-2" strokeWidth={1.8} />
                  {t("generate")}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  aria-label={t("title")}
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label={t("copied")}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-600" strokeWidth={1.8} />
                  ) : (
                    <Copy className="size-4" strokeWidth={1.8} />
                  )}
                </Button>
              </div>

              {copied && (
                <p className="text-xs text-emerald-600 font-medium">
                  {t("copied")}
                </p>
              )}

              {canShare && (
                <Button
                  variant="outline"
                  onClick={handleShare}
                  disabled={sharing}
                  aria-busy={sharing}
                  className="w-full"
                >
                  {sharing ? (
                    <Loader2 className="size-4 mr-2 animate-spin" strokeWidth={1.8} />
                  ) : (
                    <Share2 className="size-4 mr-2" strokeWidth={1.8} />
                  )}
                  {t("share")}
                </Button>
              )}

              {expiresAt && (
                <p className="text-xs text-muted-foreground">
                  {t("expires")}: {new Date(expiresAt).toLocaleDateString(
                    locale === "es" ? "es" : "en",
                    { year: "numeric", month: "short", day: "numeric" }
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
