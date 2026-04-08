"use client";

import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { LogOut, Globe, Wallet } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function AccountPage() {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const tLocal = useTranslations("localMode");
  const { user, mode, signInWithGoogle, signOut } = useAuthStore();

  return (
    <AuthGuard>
      <AppShell>
      <div className="mx-auto max-w-lg p-4 pt-8">

        {mode === "local" ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-5 pt-8 pb-8">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                <Wallet className="size-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">{tLocal("signIn")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tLocal("warningDescription")}
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-3 text-sm font-medium"
                onClick={signInWithGoogle}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {tAuth("continueWithGoogle")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="items-center pb-4">
              <Avatar className="size-20">
                {user?.avatar_url && (
                  <AvatarImage src={user.avatar_url} />
                )}
                <AvatarFallback className="text-lg">
                  {(user?.full_name || user?.email || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="mt-3 text-lg">
                {user?.full_name || t("noName")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </CardHeader>

            <Separator />

            <CardContent className="flex flex-col gap-4 pt-6">
              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-sm">{t("language")}</span>
                </div>
                <LanguageSwitcher />
              </div>

              <Separator />

              {/* Sign Out */}
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={signOut}
              >
                <LogOut className="size-4" />
                {t("signOut")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      </AppShell>
    </AuthGuard>
  );
}
