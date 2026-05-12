"use client";

import { create } from "zustand";

import { seedDisplayOrderCache } from "@/hooks/use-display-order";
import { authApi } from "@/lib/api";
import { budgetWS } from "@/lib/websocket";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  justLoggedIn: boolean;

  initialize: () => void;
  signInWithGoogle: () => void;
  handleGoogleCallback: (code: string) => Promise<void>;
  signOut: () => void;
  deleteAccount: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
}

// Mirror the sanitization in src/lib/api.ts so a misconfigured
// NEXT_PUBLIC_API_URL can't cause this module to send the bearer token to
// a javascript:/data: URL.
const API_BASE = (() => {
  const candidate =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return "http://localhost:8080/api";
    }
    return candidate;
  } catch {
    return "http://localhost:8080/api";
  }
})();

/**
 * Validates that a token looks like a well-formed JWT (3 base64url segments).
 * Does NOT verify the signature -- that is the backend's job.
 */
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every((part) => part.length > 0 && base64urlRegex.test(part));
}

/**
 * Checks whether the token's exp claim is still in the future.
 * Returns true (expired) if the token is malformed or the exp is missing.
 */
function isTokenExpired(token: string): boolean {
  try {
    const payloadB64 = token.split(".")[1];
    const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    if (typeof payload.exp !== "number") return true;
    // 60-second buffer so we don't send a token that expires mid-flight.
    return Date.now() >= (payload.exp - 60) * 1000;
  } catch {
    return true;
  }
}

/**
 * Generates a cryptographically random state parameter for OAuth CSRF protection.
 */
function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,
  initialized: false,
  justLoggedIn: false,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    if (typeof window === "undefined") {
      set({ loading: false });
      return;
    }

    const token = localStorage.getItem("financentury_token");

    if (!token || !isValidJWTFormat(token) || isTokenExpired(token)) {
      if (token) localStorage.removeItem("financentury_token");
      set({ user: null, token: null, loading: false });
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5_000),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data: AuthUser & { display_orders?: { scope_key: string; ordered_ids: string[] }[] }) => {
        const { display_orders, ...user } = data;
        if (display_orders) seedDisplayOrderCache(display_orders);
        set({ user, token, loading: false });
      })
      .catch(() => {
        localStorage.removeItem("financentury_token");
        set({ user: null, token: null, loading: false });
      });
  },

  signInWithGoogle: () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || typeof clientId !== "string") {
      // Don't build a broken OAuth URL that exposes "client_id=undefined" in
      // server logs / browser history. Bail out and surface a friendly error.
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured. OAuth sign-in is disabled."
        );
      }
      window.location.href =
        "/?auth=error&message=" +
        encodeURIComponent("Sign-in is temporarily unavailable. Please try again later.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "openid email profile";

    // Generate and store CSRF state parameter to prevent cross-site request forgery.
    const state = generateOAuthState();
    sessionStorage.setItem("oauth_state", state);

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
    window.location.href = url;
  },

  handleGoogleCallback: async (code: string) => {
    // Validate the OAuth state parameter to prevent CSRF.
    const urlParams = new URLSearchParams(window.location.search);
    const returnedState = urlParams.get("state");
    const storedState = sessionStorage.getItem("oauth_state");
    sessionStorage.removeItem("oauth_state");

    if (!returnedState || !storedState || returnedState !== storedState) {
      throw new Error("OAuth state mismatch. Please try signing in again.");
    }

    // Drain the captcha token captured in the auth-modal before the user
    // was sent to Google. Always remove it (one-shot, even if missing) so
    // a stale token can't be replayed on a later attempt.
    const captchaToken =
      typeof window !== "undefined"
        ? sessionStorage.getItem("captcha_token")
        : null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("captcha_token");
    }

    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(captchaToken
          ? { "X-Captcha-Token": captchaToken, "X-App-Platform": "web" }
          : {}),
      },
      body: JSON.stringify({
        code,
        redirect_uri: window.location.origin + "/auth/callback",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Auth failed" }));
      // Sanitize server-provided error text: strip tags and cap length so
      // untrusted payloads can't smuggle phishing content back to the UI.
      const raw = (err.error || err.message || "Auth failed") as string;
      const safe = (typeof raw === "string" ? raw : "Auth failed")
        .replace(/<[^>]*>/g, "")
        .slice(0, 300);
      throw new Error(safe);
    }

    const data: { token: string; user: AuthUser } = await res.json();

    // Validate token format before storing in localStorage.
    if (!isValidJWTFormat(data.token)) {
      throw new Error("Received invalid token from server");
    }

    // Also reject tokens whose exp has already passed — a malicious / broken
    // backend shouldn't be able to persist a dead token that would later be
    // treated as a logged-in session.
    if (isTokenExpired(data.token)) {
      throw new Error("Received expired token from server");
    }

    localStorage.setItem("financentury_token", data.token);
    set({
      user: data.user,
      token: data.token,
      justLoggedIn: true,
    });
  },

  signOut: () => {
    // Revoke server session (fire and forget).
    authApi.signOut().catch(() => {});
    budgetWS.disconnect();
    if (typeof window !== "undefined") {
      localStorage.removeItem("financentury_token");
      sessionStorage.removeItem("oauth_state");
    }
    set({
      user: null,
      token: null,
      justLoggedIn: false,
    });
  },

  deleteAccount: async () => {
    await authApi.deleteAccount();
    budgetWS.disconnect();
    if (typeof window !== "undefined") {
      localStorage.removeItem("financentury_token");
      sessionStorage.removeItem("oauth_state");
    }
    set({
      user: null,
      token: null,
      justLoggedIn: false,
    });
  },

  updateName: async (name: string) => {
    const updated = await authApi.updateProfile({ full_name: name });
    set({ user: updated });
  },
}));
