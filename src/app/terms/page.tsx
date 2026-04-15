"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "@/i18n/client";
import { Footer } from "@/components/layout/footer";

export default function TermsPage() {
  const t = useTranslations("terms");

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground mb-8"
          >
            <ArrowLeft className="size-3.5" />
            Financentury
          </Link>

          {/* Title */}
          <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: 'var(--text-fluid-xl)' }}>
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("lastUpdated")}</p>

          {/* Content */}
          <div className="mt-10 space-y-8">
            <Section title={t("introTitle")}>
              <p>{t("introText")}</p>
            </Section>

            <Section title={t("accountTitle")}>
              <ul className="list-none space-y-2">
                <BulletItem text={t("accountText1")} />
                <BulletItem text={t("accountText2")} />
                <BulletItem text={t("accountText3")} />
                <BulletItem text={t("accountText4")} />
              </ul>
            </Section>

            <Section title={t("serviceTitle")}>
              <p>{t("serviceText")}</p>
            </Section>

            <Section title={t("limitsTitle")}>
              <p>{t("limitsText")}</p>
              <ul className="mt-2 list-none space-y-2">
                <BulletItem text={t("limitBudgets")} />
                <BulletItem text={t("limitExpenses")} />
                <BulletItem text={t("limitHistory")} />
              </ul>
            </Section>

            <Section title={t("dataTitle")}>
              <p>{t("dataText")}</p>
            </Section>

            <Section title={t("collaborationTitle")}>
              <p>{t("collaborationText")}</p>
            </Section>

            <Section title={t("prohibitedTitle")}>
              <ul className="list-none space-y-2">
                <BulletItem text={t("prohibitedText1")} />
                <BulletItem text={t("prohibitedText2")} />
                <BulletItem text={t("prohibitedText3")} />
                <BulletItem text={t("prohibitedText4")} />
              </ul>
            </Section>

            <Section title={t("terminationTitle")}>
              <p>{t("terminationText")}</p>
            </Section>

            <Section title={t("liabilityTitle")}>
              <p>{t("liabilityText")}</p>
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
    <div className="border-l-2 border-foreground pl-5">
      <h2 className="font-bold text-foreground mb-3" style={{ fontSize: 'var(--text-fluid-lg)' }}>
        {title}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 size-1.5 shrink-0 bg-foreground" />
      <span>{text}</span>
    </li>
  );
}
