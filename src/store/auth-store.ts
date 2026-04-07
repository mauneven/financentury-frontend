"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (session) {
        get().fetchProfile();
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
      if (session) {
        get().fetchProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  signInWithGoogle: async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
    window.location.href = "/login";
  },

  fetchProfile: async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
      const res = await fetch(`${apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const profile: Profile = await res.json();
        set({ profile });
      }
    } catch {
      // Profile fetch failed silently - user is still authenticated
    }
  },
}));
