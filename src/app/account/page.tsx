"use client";

import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AuthGuard } from "@/components/auth/auth-guard";
import { LogOut, ArrowLeft, Globe } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export default function AccountPage() {
  const t = useTranslations("account");
  const { profile, user, signOut } = useAuthStore();
  const router = useRouter();

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AuthGuard>
      <div className="mx-auto max-w-lg p-4 pt-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </button>

        <Card>
          <CardHeader className="items-center pb-4">
            <Avatar className="size-20">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-3 text-lg">
              {profile?.full_name || t("noName")}
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
      </div>
    </AuthGuard>
  );
}
