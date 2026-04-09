"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Wallet,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Shield,
  Globe,
  Zap,
  X,
  ChevronDown,
} from "lucide-react";

const MOCK_SPENDING_DATA = [
  { month: "Oct", total: 1200000 },
  { month: "Nov", total: 1450000 },
  { month: "Dic", total: 980000 },
  { month: "Ene", total: 1650000 },
  { month: "Feb", total: 1230000 },
  { month: "Mar", total: 1780000 },
];

const MOCK_BREAKDOWN_DATA = [
  { name: "Vivienda", value: 850000, color: "#6366f1" },
  { name: "Comida", value: 320000, color: "#f43f5e" },
  { name: "Transporte", value: 180000, color: "#f97316" },
  { name: "Ahorro", value: 420000, color: "#22c55e" },
  { name: "Entretenimiento", value: 230000, color: "#eab308" },
];

const FEATURES = [
  {
    icon: BarChart3,
    title: "PRESUPUESTOS",
    desc: "Crea múltiples presupuestos para diferentes períodos y metas financieras.",
  },
  {
    icon: PieChartIcon,
    title: "CATEGORÍAS",
    desc: "Divide tus gastos en secciones y categorías personalizadas con control total.",
  },
  {
    icon: TrendingUp,
    title: "TENDENCIAS",
    desc: "Visualiza cómo evolucionan tus gastos mes a mes con gráficas claras.",
  },
  {
    icon: Shield,
    title: "SEGURO",
    desc: "Tu información protegida con autenticación robusta y encriptación.",
  },
  {
    icon: Globe,
    title: "MULTI-MONEDA",
    desc: "Gestiona presupuestos en cualquier moneda del mundo sin restricciones.",
  },
  {
    icon: Zap,
    title: "TIEMPO REAL",
    desc: "Datos actualizados al instante. Siempre sincronizados, nunca desactualizados.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "CREA TU PRESUPUESTO",
    desc: "Define tu ingreso y período de facturación. Elige el modo guiado 50/30/20 o configuración manual completa.",
  },
  {
    num: "02",
    title: "DEFINE CATEGORÍAS",
    desc: "Organiza en secciones como Necesidades, Deseos y Ahorro, con categorías específicas dentro de cada una.",
  },
  {
    num: "03",
    title: "REGISTRA GASTOS",
    desc: "Agrega cada gasto en segundos. Asígnalo a la categoría correcta para un seguimiento preciso.",
  },
  {
    num: "04",
    title: "ANALIZA Y AJUSTA",
    desc: "Observa tendencias, desglose por categoría y métricas de uso del presupuesto en tiempo real.",
  },
];

function formatCOP(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
}

export default function LandingPage() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialized && user) {
      router.replace("/home");
    }
  }, [initialized, user, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
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
            <button
              onClick={() => router.push("/login")}
              className="px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border-2 border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border-2 border-foreground bg-foreground text-background hover:bg-background hover:text-foreground transition-colors"
            >
              Crear Cuenta
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative border-b-2 border-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center border-2 border-foreground px-3 py-1">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                Control financiero total
              </span>
            </div>
            <h1 className="font-mono font-black uppercase leading-none tracking-tight text-foreground">
              <span className="block text-6xl sm:text-8xl lg:text-9xl">EL</span>
              <span className="block text-6xl sm:text-8xl lg:text-9xl">ESPACIO</span>
              <span className="block text-6xl sm:text-8xl lg:text-9xl border-b-4 border-foreground pb-2">
                FINANCIERO
              </span>
            </h1>
            <p className="mt-8 max-w-xl font-mono text-base sm:text-lg text-muted-foreground leading-relaxed">
              Presupuesta con precisión. Rastrea cada gasto. Toma decisiones
              con datos reales — no con suposiciones.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-8 py-4 font-mono text-sm font-black uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground"
              >
                Empezar Gratis
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center justify-center gap-2 border-2 border-foreground bg-background px-8 py-4 font-mono text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Ver más
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b-2 border-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-3 divide-x-2 divide-foreground">
            {[
              { value: "50/30/20", label: "Método probado" },
              { value: "∞", label: "Presupuestos" },
              { value: "100%", label: "Tuyo" },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-8 text-center sm:px-8">
                <p className="font-mono text-3xl sm:text-4xl font-black tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b-2 border-foreground py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Características
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Todo lo que necesitas
            </h2>
          </div>
          <div className="border-l-2 border-t-2 border-foreground">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  className="border-b-2 border-r-2 border-foreground p-6 sm:p-8"
                >
                  <div className="mb-4 flex size-10 items-center justify-center border-2 border-foreground">
                    <feat.icon className="size-5" />
                  </div>
                  <h3 className="font-mono text-sm font-black uppercase tracking-widest text-foreground">
                    {feat.title}
                  </h3>
                  <p className="mt-2 font-mono text-sm text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Charts preview */}
      <section className="border-b-2 border-foreground py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Visualización
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Tus datos, claros
            </h2>
            <p className="mt-3 max-w-lg font-mono text-sm text-muted-foreground">
              Gráficas en tiempo real que muestran tendencias de gasto y el
              desglose exacto de cada categoría.
            </p>
          </div>

          {mounted && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Spending area chart */}
              <div className="border-2 border-foreground bg-card lg:col-span-2">
                <div className="border-b-2 border-foreground px-6 py-4">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
                    Tendencias de Gastos · Últimos 6 meses
                  </h3>
                </div>
                <div className="p-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={MOCK_SPENDING_DATA}
                        margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="landing-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--foreground)"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--foreground)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="none"
                          stroke="var(--border)"
                          strokeOpacity={0.3}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{
                            fontSize: 10,
                            fill: "var(--muted-foreground)",
                            fontFamily: "monospace",
                          }}
                          tickLine={false}
                          axisLine={{
                            stroke: "var(--foreground)",
                            strokeWidth: 2,
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: 10,
                            fill: "var(--muted-foreground)",
                            fontFamily: "monospace",
                          }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => formatCOP(v)}
                          width={50}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "2px solid var(--foreground)",
                            borderRadius: "0",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            boxShadow: "4px 4px 0px var(--foreground)",
                            color: "var(--foreground)",
                          }}
                          labelStyle={{
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "var(--foreground)",
                          }}
                          itemStyle={{ color: "var(--foreground)" }}
                          formatter={(v) => [formatCOP(Number(v)), "Total"]}
                        />
                        <Area
                          type="natural"
                          dataKey="total"
                          stroke="var(--foreground)"
                          fill="url(#landing-gradient)"
                          strokeWidth={2}
                          dot={{
                            fill: "var(--foreground)",
                            r: 3,
                            strokeWidth: 0,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Donut chart */}
              <div className="border-2 border-foreground bg-card">
                <div className="border-b-2 border-foreground px-6 py-4">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
                    Desglose por Categoría
                  </h3>
                </div>
                <div className="p-4">
                  <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="80%"
                          dataKey="value"
                          strokeWidth={0}
                          isAnimationActive={false}
                        >
                          <Cell fill="var(--muted)" />
                        </Pie>
                        <Pie
                          data={MOCK_BREAKDOWN_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={1}
                          dataKey="value"
                          strokeWidth={2}
                          stroke="var(--background)"
                          startAngle={90}
                          endAngle={90 - 0.68 * 360}
                        >
                          {MOCK_BREAKDOWN_DATA.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="font-mono text-xl font-black tabular-nums text-foreground">
                        $2.0M
                      </p>
                      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        68% usado
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {MOCK_BREAKDOWN_DATA.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="size-2.5 shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                          {entry.name}
                        </span>
                        <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                          {formatCOP(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-2 border-foreground py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Flujo de trabajo
            </p>
            <h2 className="mt-2 font-mono text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
              Cómo funciona
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
                    {step.title}
                  </h3>
                  <p className="mt-2 font-mono text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-2 border-foreground p-8 sm:p-16 text-center">
            <h2 className="font-mono text-3xl sm:text-5xl font-black uppercase tracking-tight text-foreground">
              ¿Listo para tomar control?
            </h2>
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              Empieza hoy. Es gratis. No necesitas tarjeta de crédito.
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-8 inline-flex items-center gap-2 border-2 border-foreground bg-foreground px-10 py-4 font-mono text-sm font-black uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground"
            >
              Crear Cuenta Gratis
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-foreground py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-4" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest">
                Financentury
              </span>
            </div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              © 2026
            </p>
          </div>
        </div>
      </footer>

      {/* "You need an account" dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative w-full max-w-sm border-2 border-foreground bg-background p-8">
            <button
              onClick={() => setDialogOpen(false)}
              className="absolute right-3 top-3 flex size-7 items-center justify-center border-2 border-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              <X className="size-3.5" />
            </button>
            <div className="mb-5 flex size-12 items-center justify-center border-2 border-foreground bg-foreground">
              <Wallet className="size-6 text-background" />
            </div>
            <h2 className="font-mono text-base font-black uppercase tracking-widest text-foreground">
              Necesitas una cuenta
            </h2>
            <p className="mt-2 font-mono text-xs text-muted-foreground leading-relaxed">
              Para acceder al espacio financiero necesitas crear una cuenta o
              iniciar sesión.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => router.push("/login?mode=register")}
                className="w-full border-2 border-foreground bg-foreground px-4 py-3 font-mono text-xs font-black uppercase tracking-widest text-background transition-colors hover:bg-background hover:text-foreground"
              >
                Crear Cuenta
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full border-2 border-foreground bg-background px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Ya tengo una cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
