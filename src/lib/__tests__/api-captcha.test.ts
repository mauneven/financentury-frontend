import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verifies the `captchaToken` extension on the api.ts `request()` helper.
 *
 * The contract:
 *  - When a caller passes `{ captchaToken: "..." }`, request() forwards it
 *    as the `X-Captcha-Token` header AND adds `X-App-Platform: web`.
 *  - When no token is provided, neither header is set.
 *  - `captchaToken` is not leaked into the fetch options object itself.
 */

vi.mock("@/lib/websocket", () => ({
  budgetWS: { disconnect: vi.fn() },
}));

function makeJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

function makeFutureToken(): string {
  return makeJWT({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
}

describe("api.ts — captcha token forwarding", () => {
  let authApi: typeof import("@/lib/api").authApi;
  let inviteApi: typeof import("@/lib/api").inviteApi;
  let budgetApi: typeof import("@/lib/api").budgetApi;

  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();

    const api = await import("@/lib/api");
    authApi = api.authApi;
    inviteApi = api.inviteApi;
    budgetApi = api.budgetApi;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards captchaToken as X-Captcha-Token on authApi.googleLogin", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: makeFutureToken(),
          user: { id: "u1", email: "a@b.com", full_name: "U" },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await authApi.googleLogin("auth-code", "http://localhost/cb", {
      captchaToken: "cf-token-abc",
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Captcha-Token"]).toBe("cf-token-abc");
    expect(headers["X-App-Platform"]).toBe("web");
  });

  it("does not add captcha headers when no token is passed", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: makeFutureToken(),
          user: { id: "u1", email: "a@b.com", full_name: "U" },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await authApi.googleLogin("auth-code", "http://localhost/cb");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Captcha-Token"]).toBeUndefined();
    expect(headers["X-App-Platform"]).toBeUndefined();
  });

  it("forwards captchaToken on inviteApi.getInfo", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          budget_name: "B",
          inviter_name: "I",
          expires_at: "2099-01-01",
          is_expired: false,
          is_used: false,
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await inviteApi.getInfo("invite-tok", { captchaToken: "cf-xyz" });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Captcha-Token"]).toBe("cf-xyz");
    expect(headers["X-App-Platform"]).toBe("web");
  });

  it("inviteApi.getInfo works without a captcha token (dev path)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          budget_name: "B",
          inviter_name: "I",
          expires_at: "2099-01-01",
          is_expired: false,
          is_used: false,
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await inviteApi.getInfo("invite-tok");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Captcha-Token"]).toBeUndefined();
    expect(headers["X-App-Platform"]).toBeUndefined();
  });

  it("does not leak captchaToken into the fetch body or URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: makeFutureToken(),
          user: { id: "u1", email: "a@b.com", full_name: "U" },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await authApi.googleLogin("auth-code", "http://localhost/cb", {
      captchaToken: "cf-secret",
    });

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).not.toContain("cf-secret");
    expect(JSON.parse(init.body)).toEqual({
      code: "auth-code",
      redirect_uri: "http://localhost/cb",
    });
    // captchaToken must not survive on the fetch init object as a stray prop
    // — that would make it visible to interceptors / logging that introspect
    // the RequestInit.
    expect(
      Object.prototype.hasOwnProperty.call(init, "captchaToken")
    ).toBe(false);
  });

  it("keeps standard headers when captcha header is set", async () => {
    const token = makeFutureToken();
    localStorage.setItem("financentury_token", token);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", mockFetch);

    // Use an arbitrary protected endpoint via budgetApi to ensure the
    // captcha header coexists with Authorization. We need to drop down a
    // level to the raw request — budgetApi.list doesn't take the option,
    // so re-import the module and exercise the path via authApi which
    // does.
    await authApi.googleLogin("auth-code", "http://localhost/cb", {
      captchaToken: "cf-with-auth",
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe(`Bearer ${token}`);
    expect(headers["X-Captcha-Token"]).toBe("cf-with-auth");
    expect(headers["X-App-Platform"]).toBe("web");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Timezone"]).toBeDefined();

    // Sanity: budgetApi.list (no captcha option) doesn't set the headers.
    mockFetch.mockClear();
    await budgetApi.list();
    const headers2 = mockFetch.mock.calls[0][1].headers;
    expect(headers2["X-Captcha-Token"]).toBeUndefined();
  });
});
