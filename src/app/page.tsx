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
  const { user, initialized, loading } = useAuthStore();
  const [authOpen, setAuthOpen] = useState(false);
  const t = useTranslations("landing");

  // Read auth callback state from URL on mount (safe in client component)
  const [authParam, setAuthParam] = useState<"loading" | "error" | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get("auth") as "loading" | "error" | null;
    const m = params.get("message");
    if (a) {
      setAuthParam(a);
      setAuthMessage(m);
      setAuthOpen(true);
    }
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  // Redirect authenticated users — but NOT when handling auth callback (modal handles it)
  useEffect(() => {
    if (authParam) return;
    if (initialized && !loading && user) router.replace("/budgets");
  }, [initialized, loading, user, router, authParam]);

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

  // Show a minimal loader while auth resolves — prevents landing flash for logged-in users.
  // For users without a token this resolves synchronously (no visible delay).
  // Also gate on `user` — when /auth/me responds with a user, the redirect useEffect
  // hasn't fired yet, so without this the landing renders for one frame.
  if (!authParam && (!initialized || loading || user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
      </div>
    );
  }

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
              className="btn-liquid px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background hover:text-foreground"
            >
              <span>{t("letsStart")}</span>
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

          <div ref={heroRef} className="relative pt-16 pb-20 lg:pt-24 lg:pb-28">
            {/* FINANCENTURY with planetary horizon curve */}
            <div
              className="relative overflow-hidden transition-all duration-700 ease-out"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateY(0)" : "translateY(24px)",
              }}
            >
              <h1 className="font-mono font-black uppercase leading-[0.85] tracking-tighter text-foreground text-6xl sm:text-8xl lg:text-[10rem] pb-6 sm:pb-10">
                FINANCENTURY
              </h1>
              {/* Curved horizon line — sits over the bottom of the text */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{ width: "160%", height: "3rem" }}
              >
                <div
                  className="w-full h-full bg-background"
                  style={{
                    borderTop: "2.5px solid var(--foreground)",
                    borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                  }}
                />
              </div>
            </div>

            <p
              className="mt-6 max-w-xl font-mono text-base sm:text-lg text-muted-foreground leading-relaxed transition-all duration-700 ease-out"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateY(0)" : "translateY(16px)",
                transitionDelay: "150ms",
              }}
            >
              {t("tagline")}
            </p>

          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x-2 divide-foreground">
            <div className="px-4 py-8 text-center sm:px-6">
              <p className="font-mono text-2xl sm:text-3xl font-black tabular-nums text-foreground">
                {t("statFree")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("statFreeLabel")}
              </p>
            </div>

            <div className="px-4 py-8 text-center sm:px-6">
              <p className="font-mono text-2xl sm:text-3xl font-black tabular-nums text-foreground">
                {t("statExpenses")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("statExpensesLabel")}
              </p>
            </div>

            <div className="px-4 py-8 text-center sm:px-6 border-t-2 sm:border-t-0 border-foreground">
              <p className="font-mono text-2xl sm:text-3xl font-black tabular-nums text-foreground">
                {t("statBudgets")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("statBudgetsLabel")}
              </p>
            </div>

            <div className="px-4 py-8 text-center sm:px-6 border-t-2 lg:border-t-0 border-foreground">
              <p className="font-mono text-2xl sm:text-3xl font-black tabular-nums text-foreground">
                {t("statHistory")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("statHistoryLabel")}
              </p>
            </div>

            <div className="px-4 py-8 text-center sm:px-6 border-t-2 lg:border-t-0 border-foreground">
              <p className="font-mono text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                {t("statCollab")}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("statCollabLabel")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA below stats ───────────────────────────────────── */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setAuthOpen(true)}
            className="btn-liquid inline-flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-8 py-4 font-mono text-sm font-black uppercase tracking-widest text-background hover:text-foreground"
          >
            <span>{t("letsStart")}</span>
            <ArrowRight className="relative z-[1] size-4" />
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
      </section>

      {/* ── Interactive Demo ──────────────────────────────────── */}
      <section id="charts" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("chartsLabel")}
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              {t("chartsTitle")}
            </h2>
            <p className="mt-3 max-w-lg font-mono text-sm text-muted-foreground">
              {t("demoTryIt")}
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
              className="btn-liquid mt-8 inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-10 py-4 font-mono text-sm font-black uppercase tracking-widest text-background hover:text-foreground"
            >
              <span>{t("letsStart")}</span>
              <ArrowRight className="relative z-[1] size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Footer />

      {/* ── Auth Modal ─────────────────────────────────────────── */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        callbackState={authParam}
        callbackError={authMessage}
      />
    </div>
  );
}
