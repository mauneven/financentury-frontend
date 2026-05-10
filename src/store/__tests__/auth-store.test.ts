import { beforeEach,describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock dependencies before importing the store
// ---------------------------------------------------------------------------
vi.mock("@/lib/websocket", () => ({
  budgetWS: {
    disconnect: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    googleLogin: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn(),
  },
}));

import { budgetWS } from "@/lib/websocket";
import { useAuthStore } from "@/store/auth-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

function makeFutureToken(): string {
  return makeJWT({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
}

function makeExpiredToken(): string {
  return makeJWT({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 3600 });
}

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  full_name: "Test User",
  };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      loading: true,
      initialized: false,
      justLoggedIn: false,
    });
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    // Reset fetch mock
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe("initial state", () => {
    it("starts with null user", () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it("starts with null token", () => {
      expect(useAuthStore.getState().token).toBeNull();
    });

    it("starts with loading true", () => {
      expect(useAuthStore.getState().loading).toBe(true);
    });

    it("starts not initialized", () => {
      expect(useAuthStore.getState().initialized).toBe(false);
    });

    it("starts with justLoggedIn false", () => {
      expect(useAuthStore.getState().justLoggedIn).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // isValidJWTFormat (logic test — replicated since not exported)
  // -----------------------------------------------------------------------
  describe("isValidJWTFormat (logic test)", () => {
    function isValidJWTFormat(token: string): boolean {
      if (!token || typeof token !== "string") return false;
      const parts = token.split(".");
      if (parts.length !== 3) return false;
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      return parts.every((part) => part.length > 0 && base64urlRegex.test(part));
    }

    it("returns true for a well-formed JWT", () => {
      expect(isValidJWTFormat(makeFutureToken())).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(isValidJWTFormat("")).toBe(false);
    });

    it("returns false for null-like input", () => {
      expect(isValidJWTFormat(null as unknown as string)).toBe(false);
      expect(isValidJWTFormat(undefined as unknown as string)).toBe(false);
    });

    it("returns false for a token with only 2 parts", () => {
      expect(isValidJWTFormat("header.payload")).toBe(false);
    });

    it("returns false for a token with 4 parts", () => {
      expect(isValidJWTFormat("a.b.c.d")).toBe(false);
    });

    it("returns false for a token with empty segment", () => {
      expect(isValidJWTFormat("header..signature")).toBe(false);
    });

    it("returns false for a token with invalid base64url characters", () => {
      expect(isValidJWTFormat("hea der.payload.sig")).toBe(false);
    });

    it("returns true for base64url with underscores and hyphens", () => {
      expect(isValidJWTFormat("abc_def.ghi-jkl.mno_pqr")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // isTokenExpired (logic test — replicated since not exported)
  // -----------------------------------------------------------------------
  describe("isTokenExpired (logic test)", () => {
    function isTokenExpired(token: string): boolean {
      try {
        const payloadB64 = token.split(".")[1];
        const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(json);
        if (typeof payload.exp !== "number") return true;
        return Date.now() >= (payload.exp - 60) * 1000;
      } catch {
        return true;
      }
    }

    it("returns false for a token expiring in the future", () => {
      expect(isTokenExpired(makeFutureToken())).toBe(false);
    });

    it("returns true for an expired token", () => {
      expect(isTokenExpired(makeExpiredToken())).toBe(true);
    });

    it("returns true for a token without exp claim", () => {
      expect(isTokenExpired(makeJWT({ sub: "user" }))).toBe(true);
    });

    it("returns true for a malformed token", () => {
      expect(isTokenExpired("not-a-jwt")).toBe(true);
    });

    it("returns true for a token expiring within the 60-second buffer", () => {
      const almostExpired = makeJWT({
        sub: "user",
        exp: Math.floor(Date.now() / 1000) + 30, // 30 seconds from now
      });
      expect(isTokenExpired(almostExpired)).toBe(true);
    });

    it("returns false for a token expiring exactly 61 seconds from now", () => {
      const justValid = makeJWT({
        sub: "user",
        exp: Math.floor(Date.now() / 1000) + 61,
      });
      expect(isTokenExpired(justValid)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // generateOAuthState (logic test — replicated since not exported)
  // -----------------------------------------------------------------------
  describe("generateOAuthState (logic test)", () => {
    function generateOAuthState(): string {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    }

    it("returns a 64-character hex string", () => {
      const state = generateOAuthState();
      expect(state).toHaveLength(64);
      expect(state).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique values on each call", () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      expect(state1).not.toBe(state2);
    });
  });

  // -----------------------------------------------------------------------
  // initialize
  // -----------------------------------------------------------------------
  describe("initialize", () => {
    it("sets initialized to true", () => {
      useAuthStore.getState().initialize();
      expect(useAuthStore.getState().initialized).toBe(true);
    });

    it("is a no-op when already initialized", () => {
      useAuthStore.setState({ initialized: true });
      // Should not change anything
      useAuthStore.getState().initialize();
      expect(useAuthStore.getState().initialized).toBe(true);
    });

    it("clears user and token when no token in localStorage", () => {
      useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.loading).toBe(false);
    });

    it("clears user when token in localStorage is expired", () => {
      localStorage.setItem("financentury_token", makeExpiredToken());
      useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.loading).toBe(false);
      // Token should be removed from localStorage
      expect(localStorage.getItem("financentury_token")).toBeNull();
    });

    it("clears user when token has invalid JWT format", () => {
      localStorage.setItem("financentury_token", "not-a-jwt");
      useAuthStore.getState().initialize();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(localStorage.getItem("financentury_token")).toBeNull();
    });

    it("fetches user from API when valid token exists", async () => {
      const validToken = makeFutureToken();
      localStorage.setItem("financentury_token", validToken);

      // Mock the fetch for /auth/me
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });
      vi.stubGlobal("fetch", mockFetch);

      useAuthStore.getState().initialize();

      // Wait for the async fetch to complete
      await vi.waitFor(() => {
        expect(useAuthStore.getState().loading).toBe(false);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(validToken);
    });

    it("clears token when API returns unauthorized", async () => {
      const validToken = makeFutureToken();
      localStorage.setItem("financentury_token", validToken);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      vi.stubGlobal("fetch", mockFetch);

      useAuthStore.getState().initialize();

      await vi.waitFor(() => {
        expect(useAuthStore.getState().loading).toBe(false);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(localStorage.getItem("financentury_token")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // signOut
  // -----------------------------------------------------------------------
  describe("signOut", () => {
    it("clears user, token, and justLoggedIn", () => {
      const token = makeFutureToken();
      useAuthStore.setState({
        user: mockUser,
        token,
        justLoggedIn: true,
      });
      localStorage.setItem("financentury_token", token);
      sessionStorage.setItem("oauth_state", "some-state");

      useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.justLoggedIn).toBe(false);
    });

    it("removes token from localStorage", () => {
      localStorage.setItem("financentury_token", "some-token");
      useAuthStore.getState().signOut();
      expect(localStorage.getItem("financentury_token")).toBeNull();
    });

    it("removes oauth_state from sessionStorage", () => {
      sessionStorage.setItem("oauth_state", "some-state");
      useAuthStore.getState().signOut();
      expect(sessionStorage.getItem("oauth_state")).toBeNull();
    });

    it("calls budgetWS.disconnect()", () => {
      useAuthStore.getState().signOut();
      expect(budgetWS.disconnect).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // signInWithGoogle
  // -----------------------------------------------------------------------
  describe("signInWithGoogle", () => {
    it("stores oauth_state in sessionStorage and redirects", () => {
      // The store bails out without setting state if the client ID is missing,
      // so inject a value for this test.
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");

      // Mock window.location.href assignment
      const hrefSetter = vi.fn();
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          origin: "http://localhost:3000",
          href: "",
          search: "",
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, "href", {
        set: hrefSetter,
        get: () => "",
        configurable: true,
      });

      useAuthStore.getState().signInWithGoogle();

      // Should store state in sessionStorage
      const storedState = sessionStorage.getItem("oauth_state");
      expect(storedState).toBeDefined();
      expect(storedState!.length).toBe(64); // 32 bytes * 2 hex chars
      expect(storedState).toMatch(/^[0-9a-f]{64}$/);

      vi.unstubAllEnvs();
    });
  });

  // -----------------------------------------------------------------------
  // handleGoogleCallback — CSRF state validation
  // -----------------------------------------------------------------------
  describe("handleGoogleCallback — state validation", () => {
    it("throws on state mismatch", async () => {
      sessionStorage.setItem("oauth_state", "stored-state");

      // Set window.location.search to have a different state
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?state=different-state&code=auth-code",
          origin: "http://localhost:3000",
        },
        writable: true,
        configurable: true,
      });

      await expect(
        useAuthStore.getState().handleGoogleCallback("auth-code")
      ).rejects.toThrow("OAuth state mismatch");
    });

    it("throws when no stored state exists", async () => {
      sessionStorage.removeItem("oauth_state");

      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: "?state=some-state&code=auth-code",
          origin: "http://localhost:3000",
        },
        writable: true,
        configurable: true,
      });

      await expect(
        useAuthStore.getState().handleGoogleCallback("auth-code")
      ).rejects.toThrow("OAuth state mismatch");
    });

    it("clears oauth_state from sessionStorage after validation", async () => {
      const state = "matching-state";
      sessionStorage.setItem("oauth_state", state);

      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          search: `?state=${state}&code=auth-code`,
          origin: "http://localhost:3000",
        },
        writable: true,
        configurable: true,
      });

      const token = makeFutureToken();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token, user: mockUser }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await useAuthStore.getState().handleGoogleCallback("auth-code");

      expect(sessionStorage.getItem("oauth_state")).toBeNull();
    });
  });
});
