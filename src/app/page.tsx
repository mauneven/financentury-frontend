"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  Wallet,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Shield,
  Globe,
  Zap,
  ChevronDown,
} from "lucide-react";
import { AuthModal } from "@/components/auth/auth-modal";
import dynamic from "next/dynamic";
const LandingCharts = dynamic(() => import("@/components/landing/landing-charts").then(m => ({ default: m.LandingCharts })), { ssr: false });
import { Footer } from "@/components/layout/footer";
import { ThemeToggle } from "@/components/layout/user-controls";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslations } from "@/i18n/client";

const FEATURES = [
  { icon: BarChart3, titleKey: "featBudgets", descKey: "featBudgetsDesc" },
  { icon: PieChartIcon, titleKey: "featCategories", descKey: "featCategoriesDesc" },
  { icon: TrendingUp, titleKey: "featTrends", descKey: "featTrendsDesc" },
  { icon: Shield, titleKey: "featSecure", descKey: "featSecureDesc" },
  { icon: Globe, titleKey: "featMultiCurrency", descKey: "featMultiCurrencyDesc" },
  { icon: Zap, titleKey: "featRealTime", descKey: "featRealTimeDesc" },
];

const HOW_IT_WORKS = [
  { num: "01", titleKey: "step1Title", descKey: "step1Desc" },
  { num: "02", titleKey: "step2Title", descKey: "step2Desc" },
  { num: "03", titleKey: "step3Title", descKey: "step3Desc" },
  { num: "04", titleKey: "step4Title", descKey: "step4Desc" },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const t = useTranslations("landing");

  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    if (initialized && user) router.replace("/budgets");
  }, [initialized, user, router]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeroVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center border-2 border-foreground bg-foreground">
              <Wallet className="size-4 text-background" />
            </div>
            <span className="font-mono text-sm font-black uppercase tracking-widest">
              Financentury
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={() => setAuthOpen(true)}
              className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background transition-colors hover:bg-background hover:text-foreground"
            >
              {t("letsStart")}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Full-viewport brutalist grid background with downward fade */}
        <div
          className="pointer-events-none absolute inset-0 z-0 w-screen left-1/2 -translate-x-1/2"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            opacity: 0.07,
            maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div ref={heroRef} className="relative max-w-4xl pt-16 pb-20 lg:pt-24 lg:pb-28">
            <h1 className="font-mono font-black uppercase leading-none tracking-tight text-foreground text-5xl sm:text-7xl lg:text-8xl">
              <span
                className="block transition-all duration-700 ease-out"
                style={{
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? "translateY(0)" : "translateY(24px)",
                  transitionDelay: "0ms",
                }}
              >
                {t("heroTitle1")}
              </span>
              <span
                className="block transition-all duration-700 ease-out"
                style={{
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? "translateY(0)" : "translateY(24px)",
                  transitionDelay: "100ms",
                }}
              >
                {t("heroTitle2")}
              </span>
              <span
                className="block border-b-4 border-foreground pb-2 transition-all duration-700 ease-out"
                style={{
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? "translateY(0)" : "translateY(24px)",
                  transitionDelay: "200ms",
                }}
              >
                {t("heroTitle3")}
              </span>
            </h1>

            <p className="mt-8 max-w-xl font-mono text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("tagline")}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-8 py-4 font-mono text-sm font-black uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground"
              >
                {t("letsStart")}
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("charts")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center justify-center gap-2 border-2 border-foreground bg-background px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-3 divide-x-2 divide-foreground">
            {/* Column 1: $0 / It's free */}
            <div className="px-4 py-8 text-center sm:px-8">
              <p className="font-mono text-3xl sm:text-4xl font-black tabular-nums text-foreground">
                {t("statFree")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("statFreeLabel")}
              </p>
            </div>

            {/* Column 2: Easy to use */}
            <div className="px-4 py-8 text-center sm:px-8">
              <p className="font-mono text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
                {t("statEasy")}
              </p>
            </div>

            {/* Column 3: Guided systems */}
            <div className="px-4 py-8 text-center sm:px-8">
              <p className="font-mono text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
                {t("statGuided")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Charts ─────────────────────────────────────────────── */}
      <section id="charts" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("chartsLabel")}
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              {t("chartsTitle")}
            </h2>
            <p className="mt-3 max-w-lg font-mono text-sm text-muted-foreground">
              {t("chartsDescription")}
            </p>
          </div>
          <LandingCharts />
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("featuresLabel")}
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              {t("featuresTitle")}
            </h2>
          </div>
          <div className="border-l-2 border-t-2 border-foreground">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feat) => (
                <div
                  key={feat.titleKey}
                  className="border-b-2 border-r-2 border-foreground p-6 sm:p-8"
                >
                  <div className="mb-4 flex size-10 items-center justify-center border-2 border-foreground">
                    <feat.icon className="size-5" />
                  </div>
                  <h3 className="font-mono text-sm font-black uppercase tracking-widest text-foreground">
                    {t(feat.titleKey)}
                  </h3>
                  <p className="mt-2 font-mono text-sm text-muted-foreground leading-relaxed">
                    {t(feat.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("howItWorksLabel")}
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              {t("howItWorksTitle")}
            </h2>
          </div>
          <div className="border-l-2 border-t-2 border-foreground">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step) => (
                <div
                  key={step.num}
                  className="border-b-2 border-r-2 border-foreground p-6 sm:p-8"
                >
                  <p className="font-mono text-5xl font-black text-foreground/10">
                    {step.num}
                  </p>
                  <h3 className="mt-4 font-mono text-xs font-black uppercase tracking-widest text-foreground">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 font-mono text-sm text-muted-foreground leading-relaxed">
                    {t(step.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-2 border-foreground p-8 sm:p-16 text-center">
            <h2 className="font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
              {t("ctaTitle")}
            </h2>
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              {t("ctaSubtitle")}
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-8 inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-10 py-4 font-mono text-sm font-black uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground"
            >
              {t("letsStart")}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Footer />

      {/* ── Auth Modal ─────────────────────────────────────────── */}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
