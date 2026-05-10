"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Copy, Link2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useTransientFlag } from "@/hooks/use-transient-flag";
import { useTranslations } from "@/i18n/client";
import { useLocaleStore } from "@/i18n/locale";
import { inviteApi } from "@/lib/api";
import type { Invite } from "@/types/budget";

interface PendingInvitesProps {
  budgetId: string;
}

function getInviteStatus(invite: Invite): "pending" | "used" | "expired" {
  if (invite.used_by) return "used";
  const expires = new Date(invite.expires_at);
  if (Date.now() > expires.getTime()) return "expired";
  return "pending";
}

export function PendingInvites({ budgetId }: PendingInvitesProps) {
  const t = useTranslations("collaborators");
  const { locale } = useLocaleStore();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, flagCopied] = useTransientFlag<string>(2000);

  const fetchInvites = useCallback(async () => {
    try {
      const data = await inviteApi.list(budgetId);
      setInvites(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCopy = async (invite: Invite) => {
    const url = `${window.location.origin}/invite/${invite.invite_token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    flagCopied(invite.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={1.8} />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="size-4 text-muted-foreground" strokeWidth={1.8} />
          <h3 className="text-sm font-medium">{t("pendingInvites")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("noPendingInvites")}</p>
      </div>
    );
  }

  const badgeVariant = (
    status: "pending" | "used" | "expired"
  ): "default" | "secondary" | "destructive" => {
    if (status === "pending") return "default";
    if (status === "expired") return "destructive";
    return "secondary";
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h3 className="text-sm font-medium">{t("pendingInvites")}</h3>
      </div>

      <div className="space-y-2">
        {invites.map((invite) => {
          const status = getInviteStatus(invite);
          const isCopied = copiedId === invite.id;

          return (
            <div
              key={invite.id}
              className="flex items-center gap-3 rounded-lg py-2 px-3 border border-border/50 text-xs"
            >
              <div className="min-w-0 flex-1 text-muted-foreground truncate">
                ...{invite.invite_token.slice(-12)}
              </div>

              <span className="text-muted-foreground shrink-0">
                {new Date(invite.created_at).toLocaleDateString(
                  locale === "es" ? "es" : "en",
                  { month: "short", day: "numeric" }
                )}
              </span>

              <Badge
                variant={badgeVariant(status)}
                className="shrink-0"
              >
                {t(status)}
              </Badge>

              {status === "pending" && (
                <button
                  type="button"
                  onClick={() => handleCopy(invite)}
                  aria-label={isCopied ? t("used") : "copy"}
                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isCopied ? (
                    <Check className="size-3.5 text-emerald-600" strokeWidth={1.8} />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={1.8} />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
