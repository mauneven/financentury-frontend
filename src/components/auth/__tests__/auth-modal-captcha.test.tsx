import React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verifies the auth-modal's captcha submit path:
 *
 *  1. When the site key is configured, the modal renders the Turnstile
 *     widget AND disables the Google sign-in button until a token has
 *     been captured.
 *  2. Once a token is captured (the Turnstile mock fires `onToken`), the
 *     button enables.
 *  3. Clicking the button stashes the token in sessionStorage (so the
 *     /auth/callback page can forward it as `X-Captcha-Token` when it
 *     posts to /auth/google) and invokes the store's `signInWithGoogle`.
 *  4. When the modal is closed the stashed token is cleared.
 */

// ── Mocks ──────────────────────────────────────────────────────────────

const signInWithGoogleMock = vi.fn();
vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      signInWithGoogle: signInWithGoogleMock,
      user: null,
      initialized: true,
      loading: false,
    }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("@/i18n/client", () => ({
  useTranslations: () => (key: string) => key,
}));

// Capture the props the Turnstile mock receives so the test can invoke
// onToken / onError on demand.
let turnstileProps: Record<string, unknown> | null = null;
vi.mock("@marsidev/react-turnstile", async () => {
  const React = await import("react");
  const MockTurnstile = React.forwardRef(function MockTurnstile(
    props: Record<string, unknown>,
    _ref: unknown
  ) {
    turnstileProps = props;
    return React.createElement("div", { "data-testid": "mock-turnstile" });
  });
  return { Turnstile: MockTurnstile };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@/i18n/locale", () => ({
  useLocaleStore: (selector: (s: { locale: string }) => unknown) =>
    selector({ locale: "en" }),
}));

// ── Tests ──────────────────────────────────────────────────────────────

describe("AuthModal — captcha submit path", () => {
  beforeEach(() => {
    signInWithGoogleMock.mockClear();
    sessionStorage.clear();
    turnstileProps = null;
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("disables the Google button until a captcha token is captured", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.resetModules();
    const { AuthModal } = await import("@/components/auth/auth-modal");

    render(<AuthModal open onOpenChange={vi.fn()} />);

    const googleBtn = screen.getByText("continueWithGoogle")
      .closest("button")!;
    expect(googleBtn).toBeDisabled();
    expect(screen.getByTestId("mock-turnstile")).toBeDefined();
  });

  it("enables the button once Turnstile fires onToken", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.resetModules();
    const { AuthModal } = await import("@/components/auth/auth-modal");

    render(<AuthModal open onOpenChange={vi.fn()} />);

    expect(turnstileProps).not.toBeNull();
    act(() => {
      (turnstileProps!.onSuccess as (t: string) => void)("cf-token-123");
    });

    const googleBtn = screen.getByText("continueWithGoogle")
      .closest("button")!;
    expect(googleBtn).not.toBeDisabled();
  });

  it("stashes the token in sessionStorage and invokes signInWithGoogle on submit", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.resetModules();
    const { AuthModal } = await import("@/components/auth/auth-modal");

    render(<AuthModal open onOpenChange={vi.fn()} />);

    // Simulate Cloudflare handing us a token.
    act(() => {
      (turnstileProps!.onSuccess as (t: string) => void)("cf-good-token");
    });

    const googleBtn = screen.getByText("continueWithGoogle")
      .closest("button")!;
    fireEvent.click(googleBtn);

    expect(sessionStorage.getItem("captcha_token")).toBe("cf-good-token");
    expect(signInWithGoogleMock).toHaveBeenCalledOnce();
  });

  it("clears stashed token on close", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.resetModules();
    const { AuthModal } = await import("@/components/auth/auth-modal");

    const onOpenChange = vi.fn();
    render(<AuthModal open onOpenChange={onOpenChange} />);

    act(() => {
      (turnstileProps!.onSuccess as (t: string) => void)("cf-token-to-clear");
    });

    const googleBtn = screen.getByText("continueWithGoogle")
      .closest("button")!;
    fireEvent.click(googleBtn);
    expect(sessionStorage.getItem("captcha_token")).toBe("cf-token-to-clear");

    // Now close — the modal renders a close button (with X icon).
    const closeButtons = document.querySelectorAll("button");
    const closeBtn = Array.from(closeButtons).find(
      (b) => b.querySelector("svg.lucide-x") !== null
    );
    if (closeBtn) {
      fireEvent.click(closeBtn);
    } else {
      // Fallback: click the backdrop (the absolute div with bg-black/50).
      const backdrop = document.querySelector(".bg-black\\/50");
      if (backdrop) fireEvent.click(backdrop);
    }

    expect(sessionStorage.getItem("captcha_token")).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("skips the captcha gate entirely when no site key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");

    vi.resetModules();
    const { AuthModal } = await import("@/components/auth/auth-modal");

    render(<AuthModal open onOpenChange={vi.fn()} />);

    // Widget should not render in the no-key dev path.
    expect(screen.queryByTestId("mock-turnstile")).toBeNull();

    // Button is immediately enabled.
    const googleBtn = screen.getByText("continueWithGoogle")
      .closest("button")!;
    expect(googleBtn).not.toBeDisabled();

    fireEvent.click(googleBtn);
    expect(signInWithGoogleMock).toHaveBeenCalledOnce();
    // No token to stash.
    expect(sessionStorage.getItem("captcha_token")).toBeNull();
  });

  it("does not render the Turnstile widget on the error screen (forces a fresh challenge on retry)", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.resetModules();
    const { AuthModal } = await import("@/components/auth/auth-modal");

    render(
      <AuthModal
        open
        onOpenChange={vi.fn()}
        callbackState="error"
        callbackError="oops"
      />
    );

    // The widget only mounts in the idle UI — the error screen shows a
    // "Try Again" button which puts the modal back into idle and remounts
    // a fresh Turnstile challenge.
    expect(screen.queryByTestId("mock-turnstile")).toBeNull();
  });
});
