"use client";

import { create } from "zustand";

export type AppMode = "local" | "online";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  mode: AppMode;
  loading: boolean;
  initialized: boolean;
  justLoggedIn: boolean;

  initialize: () => void;
  signInWithGoogle: () => void;
  handleGoogleCallback: (code: string) => Promise<void>;
  signOut: () => void;
  setMode: (mode: AppMode) => void;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  mode: "local",
  loading: true,
  initialized: false,
  justLoggedIn: false,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    const token = localStorage.getItem("financentury_token");

    if (!token) {
      set({ mode: "local", loading: false });
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((user: AuthUser) => {
        set({ user, token, mode: "online", loading: false });
      })
      .catch(() => {
        localStorage.removeItem("financentury_token");
        set({ mode: "local", loading: false });
      });
  },

  signInWithGoogle: () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "openid email profile";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = url;
  },

  handleGoogleCallback: async (code: string) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: window.location.origin + "/auth/callback",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Auth failed" }));
      throw new Error(err.error || err.message || "Auth failed");
    }

    const data: { token: string; user: AuthUser } = await res.json();
    localStorage.setItem("financentury_token", data.token);
    set({
      user: data.user,
      token: data.token,
      mode: "online",
      justLoggedIn: true,
    });
  },

  signOut: () => {
    localStorage.removeItem("financentury_token");
    set({
      user: null,
      token: null,
      mode: "local",
      justLoggedIn: false,
    });
  },

  setMode: (mode: AppMode) => {
    set({ mode });
  },
}));
