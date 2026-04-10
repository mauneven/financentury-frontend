"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Wallet, X, ArrowLeft } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail, registerWithEmail } =
    useAuthStore();
  const tLanding = useTranslations("landing");
  const tAuth = useTranslations("auth");

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    setStep(1);
    setMode("signin");
    onOpenChange(false);
  };

  const handleBack = () => {
    resetForm();
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        await registerWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/budgets");
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40"
        onClick={handleClose}
      />

      {/* Modal box */}
      <div className="relative w-full max-w-sm border-2 border-foreground bg-background p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex size-7 items-center justify-center border-2 border-foreground bg-background font-mono text-xs font-bold transition-colors hover:bg-foreground hover:text-background"
        >
          <X className="size-4" />
        </button>

        {/* Wallet icon */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center border-2 border-foreground bg-foreground">
            <Wallet className="size-6 text-background" />
          </div>

          <h2 className="font-mono text-lg font-bold uppercase tracking-wider">
            {tLanding("letsBegin")}
          </h2>

          <p className="text-center font-mono text-xs tracking-wider text-muted-foreground">
            {tLanding("authDescription")}
          </p>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            {/* Google button (primary) */}
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="flex w-full items-center justify-center gap-3 border-2 border-foreground bg-foreground px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-background transition-colors hover:bg-background hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
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
            </button>

            {/* Email button (secondary) */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-3 border-2 border-foreground bg-background px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {tAuth("continueWithEmail")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            {/* Back button */}
            <button
              type="button"
              onClick={handleBack}
              className="mb-4 flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3" />
              {tAuth("back")}
            </button>

            {/* Tab toggle */}
            <div className="mb-6 flex border-2 border-foreground">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`flex-1 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === "signin"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-foreground/10"
                }`}
              >
                {tAuth("signIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 border-l-2 border-foreground py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  mode === "register"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-foreground/10"
                }`}
              >
                {tAuth("createAccount")}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "register" && (
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="auth-modal-name"
                    className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {tAuth("name")}
                  </label>
                  <input
                    id="auth-modal-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
                    placeholder={tAuth("namePlaceholder")}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="auth-modal-email"
                  className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {tAuth("email")}
                </label>
                <input
                  id="auth-modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
                  placeholder={tAuth("emailPlaceholder")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="auth-modal-password"
                  className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {tAuth("password")}
                </label>
                <input
                  id="auth-modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
                  placeholder={tAuth("passwordPlaceholder")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                {loading && (
                  <svg
                    className="size-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {loading
                  ? "..."
                  : mode === "signin"
                    ? tAuth("signIn")
                    : tAuth("createAccount")}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="mt-4 border-2 border-destructive bg-destructive/10 p-3 font-mono text-xs text-destructive">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
