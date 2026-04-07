"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Users, X } from "lucide-react";

import type { Collaborator } from "@/types/budget";
import { collaboratorApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "@/i18n/client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface CollaboratorsListProps {
  budgetId: string;
  isOwner: boolean;
}

export function CollaboratorsList({ budgetId, isOwner }: CollaboratorsListProps) {
  const t = useTranslations("collaborators");
  const tc = useTranslations("common");
  const { user } = useAuthStore();

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<Collaborator | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchCollaborators = useCallback(async () => {
    try {
      const data = await collaboratorApi.list(budgetId);
      setCollaborators(data);
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await collaboratorApi.remove(budgetId, removeTarget.user_id);
      setCollaborators((prev) => prev.filter((c) => c.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch {
      // Error handling
    } finally {
      setRemoving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (collaborators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 rounded-full bg-muted p-3">
          <Users className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("noCollaborators")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/50">
        {collaborators.map((collab) => {
          const isCurrentUser = user?.id === collab.user_id;
          const displayName = collab.profile?.full_name || collab.profile?.email || "Unknown";

          return (
            <div
              key={collab.id}
              className="flex items-center gap-3 py-3"
            >
              <Avatar size="sm">
                {collab.profile?.avatar_url ? (
                  <AvatarImage
                    src={collab.profile.avatar_url}
                    alt={displayName}
                  />
                ) : null}
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {displayName}
                    {isCurrentUser && (
                      <span className="ml-1 text-muted-foreground">({t("you")})</span>
                    )}
                  </p>
                </div>
                {collab.profile?.email && (
                  <p className="truncate text-xs text-muted-foreground">
                    {collab.profile.email}
                  </p>
                )}
              </div>

              <Badge
                variant={collab.role === "owner" ? "default" : "secondary"}
              >
                {collab.role === "owner" ? t("owner") : t("collaborator")}
              </Badge>

              {isOwner && !isCurrentUser && collab.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRemoveTarget(collab)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Remove confirmation dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("remove")}</DialogTitle>
            <DialogDescription>
              {t("removeConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              disabled={removing}
              onClick={handleRemove}
            >
              {removing ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : null}
              {t("remove")}
            </Button>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              {tc("cancel")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
