"use client";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Footer } from "@/components/layout/footer";
import { useTranslations } from "@/i18n/client";

export default function PrivacyPage() {
  const t = useTranslations("privacy");

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground mb-8"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.8} />
            Financentury
          </Link>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>

          {/* Content */}
          <div className="mt-10 space-y-8">
            <Section title={t("introTitle")}>
              <p>{t("introText")}</p>
            </Section>

            <Section title={t("collectTitle")}>
              <Subsection title={t("collectAccountTitle")}>
                <p>{t("collectAccountText")}</p>
              </Subsection>
              <Subsection title={t("collectFinancialTitle")}>
                <p>{t("collectFinancialText")}</p>
              </Subsection>
              <Subsection title={t("collectUsageTitle")}>
                <p>{t("collectUsageText")}</p>
              </Subsection>
            </Section>

            <Section title={t("useTitle")}>
              <ul className="list-none space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span>{t("useText1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span>{t("useText2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span>{t("useText3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span>{t("useText4")}</span>
                </li>
              </ul>
            </Section>

            <Section title={t("storageTitle")}>
              <p>{t("storageText")}</p>
            </Section>

            <Section title={t("sharingTitle")}>
              <p>{t("sharingText")}</p>
            </Section>

            <Section title={t("retentionTitle")}>
              <p>{t("retentionText")}</p>
            </Section>

            <Section title={t("rightsTitle")}>
              <p>{t("rightsText")}</p>
            </Section>

            <Section title={t("cookiesTitle")}>
              <p>{t("cookiesText")}</p>
            </Section>

            <Section title={t("changesTitle")}>
              <p>{t("changesText")}</p>
            </Section>

            <Section title={t("contactTitle")}>
              <p>{t("contactText")}</p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-3">
        {title}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}
