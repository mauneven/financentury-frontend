"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { LogOut, Globe } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function AccountPage() {
  const t = useTranslations("account");
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  return (
    <AuthGuard>
      <AppShell>
      <div className="mx-auto max-w-lg p-4 pt-8">

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
              onClick={() => { signOut(); router.push("/"); }}
            >
              <LogOut className="size-4" />
              {t("signOut")}
            </Button>
          </CardContent>
        </Card>
      </div>
      </AppShell>
    </AuthGuard>
  );
}
