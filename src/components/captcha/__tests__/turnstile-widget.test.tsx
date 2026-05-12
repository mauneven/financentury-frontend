import React from "react";

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Turnstile widget must:
 *  1. Render nothing and trigger zero side-effects (no script load, no
 *     fetch) when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset. This is the
 *     "graceful degradation" path that keeps local dev / preview builds
 *     working without a Cloudflare account.
 *  2. Render the underlying Turnstile component when the key IS set.
 *
 * The dev / unset path is what we exercise here — when the key is set the
 * real widget would try to inject the Cloudflare script and we can't
 * meaningfully test that in jsdom.
 */

// Stub next-themes to a stable value.
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/i18n/locale", () => ({
  useLocaleStore: (selector: (s: { locale: string }) => unknown) =>
    selector({ locale: "en" }),
}));

// Spy on the @marsidev/react-turnstile Turnstile export so we can assert
// it never gets called in the unset path.
const turnstileMock = vi.fn((_props: Record<string, unknown>) => null);
vi.mock("@marsidev/react-turnstile", async () => {
  const React = await import("react");
  const MockTurnstile = React.forwardRef(function MockTurnstile(
    props: Record<string, unknown>,
    _ref: unknown
  ) {
    turnstileMock(props);
    return React.createElement("div", {
      "data-testid": "mock-turnstile",
      "data-site-key": props.siteKey,
    });
  });
  return { Turnstile: MockTurnstile };
});

describe("TurnstileWidget — graceful degradation", () => {
  beforeEach(() => {
    turnstileMock.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");

    // Fresh import so the module-level TURNSTILE_SITE_KEY reflects the env.
    vi.resetModules();
    const { TurnstileWidget, isTurnstileConfigured } = await import(
      "@/components/captcha/turnstile-widget"
    );

    expect(isTurnstileConfigured()).toBe(false);

    const { container } = render(
      <TurnstileWidget onToken={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
    expect(turnstileMock).not.toHaveBeenCalled();
  });

  it("renders nothing when the env var is missing entirely", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined);

    vi.resetModules();
    const { TurnstileWidget, isTurnstileConfigured } = await import(
      "@/components/captcha/turnstile-widget"
    );

    expect(isTurnstileConfigured()).toBe(false);

    const { container } = render(
      <TurnstileWidget onToken={vi.fn()} onError={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
    expect(turnstileMock).not.toHaveBeenCalled();
  });

  it("does not throw when onToken is called in the unset path", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");

    vi.resetModules();
    const { TurnstileWidget } = await import(
      "@/components/captcha/turnstile-widget"
    );

    // The widget renders nothing; we just verify that the *act* of mounting
    // an "unconfigured" widget with handlers attached is side-effect-free.
    const onToken = vi.fn();
    render(<TurnstileWidget onToken={onToken} />);
    expect(onToken).not.toHaveBeenCalled();
  });

  it("renders the underlying Turnstile when a site key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.resetModules();
    const { TurnstileWidget, isTurnstileConfigured, TURNSTILE_SITE_KEY } =
      await import("@/components/captcha/turnstile-widget");

    expect(isTurnstileConfigured()).toBe(true);
    expect(TURNSTILE_SITE_KEY).toBe("1x00000000000000000000AA");

    const { getByTestId } = render(
      <TurnstileWidget onToken={vi.fn()} action="test-action" />
    );

    expect(getByTestId("mock-turnstile")).toBeDefined();
    expect(getByTestId("mock-turnstile").getAttribute("data-site-key")).toBe(
      "1x00000000000000000000AA"
    );
    expect(turnstileMock).toHaveBeenCalledOnce();
    const props = turnstileMock.mock.calls[0][0] as Record<string, unknown>;
    expect(props.siteKey).toBe("1x00000000000000000000AA");
    expect((props.options as { action?: string }).action).toBe("test-action");
  });

  it("threads dark theme through to the Turnstile widget", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");

    vi.doMock("next-themes", () => ({
      useTheme: () => ({
        resolvedTheme: "dark",
        theme: "dark",
        setTheme: vi.fn(),
      }),
    }));

    vi.resetModules();
    const { TurnstileWidget } = await import(
      "@/components/captcha/turnstile-widget"
    );

    render(<TurnstileWidget onToken={vi.fn()} />);
    const props = turnstileMock.mock.calls[0][0] as Record<string, unknown>;
    expect((props.options as { theme?: string }).theme).toBe("dark");

    vi.doUnmock("next-themes");
  });
});
