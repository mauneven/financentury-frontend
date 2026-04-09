"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    user,
    initialized,
  } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "register">(
    searchParams.get("mode") === "register" ? "register" : "signin"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialized && user) {
      router.replace("/home");
    }
  }, [initialized, user, router]);

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
      router.push("/home");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center border-2 border-foreground bg-foreground">
            <Wallet className="size-6 text-background" />
          </div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-wider">
            Financentury
          </h1>
        </div>

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
            Sign in
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
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="name"
                className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
                placeholder="Your name"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-2 border-foreground bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 border-2 border-foreground bg-foreground px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
          >
            {loading
              ? "..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-foreground/20" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-foreground/20" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-3 border-2 border-foreground bg-background px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground hover:text-background"
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
          Continue with Google
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 border-2 border-destructive bg-destructive/10 p-3 font-mono text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
