import type { NextConfig } from "next";

/**
 * Defense-in-depth security headers.
 *
 * The backend already sets CSP on its own responses. These headers apply to
 * documents/assets served by Next.js itself so there's no window where a
 * rendered HTML page is missing protections (e.g. on cached static shells).
 *
 * `Content-Security-Policy`: Restricts script / style / connect / frame
 * sources. `'unsafe-inline'` + `'unsafe-eval'` on scripts are required because
 * this app does not use CSP nonces (would force dynamic rendering everywhere,
 * see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md)
 * and the React bundle relies on inline hydration scripts. A future hardening
 * pass can migrate to nonce-based CSP via a Next.js proxy.
 *
 * `connect-src` must allow http/https/ws/wss for the API + WebSocket endpoints
 * since we don't know the deployed host at build time.
 */
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' http: https: ws: wss:",
  // Google OAuth requires form-action to accounts.google.com.
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  // Belt-and-suspenders clickjacking protection (CSP frame-ancestors is the
  // modern standard; X-Frame-Options covers older browsers).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        // Apply to every route served by Next.js.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
