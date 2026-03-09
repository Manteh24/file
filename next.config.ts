import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

// Resolve the IranServer storage origin for CSP allowlisting.
// STORAGE_ENDPOINT is a full URL (e.g. https://s3.iranserver.com).
function getStorageOrigin(): string {
  const endpoint = process.env.STORAGE_ENDPOINT
  if (!endpoint) return ""
  try {
    return new URL(endpoint).origin
  } catch {
    return ""
  }
}

function buildCsp(): string {
  const storage = getStorageOrigin()

  const directives = [
    "default-src 'self'",

    // Next.js requires 'unsafe-inline' for hydration scripts.
    // Neshan mapbox-gl requires 'unsafe-eval' for WebWorker code compilation.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

    // Tailwind/CSS-in-JS inlines styles
    "style-src 'self' 'unsafe-inline'",

    // Images: self, data URIs, blob (map tiles), Neshan CDN, IranServer storage
    [
      "img-src 'self' data: blob: https://*.neshan.org",
      storage,
    ]
      .filter(Boolean)
      .join(" "),

    // Fonts: served locally via next/font/local
    "font-src 'self'",

    // API/fetch targets
    [
      "connect-src 'self'",
      "https://api.avalai.ir",
      "https://api.kavenegar.com",
      "https://api.zarinpal.com",
      "https://www.zarinpal.com",
      "https://sandbox.zarinpal.com",
      "https://*.neshan.org",
      storage,
    ]
      .filter(Boolean)
      .join(" "),

    // Neshan mapbox-gl spawns WebWorkers from blob: URLs
    "worker-src 'self' blob:",

    // PWA manifest
    "manifest-src 'self'",

    // No frames — Zarinpal uses redirect, not iframe
    "frame-src 'none'",

    // Prevent this page from being embedded anywhere (clickjacking)
    "frame-ancestors 'none'",

    // No Flash/plugins
    "object-src 'none'",

    // Prevent base-tag injection
    "base-uri 'self'",
  ]

  return directives.join("; ")
}

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      // Prevent MIME-type sniffing
      { key: "X-Content-Type-Options", value: "nosniff" },

      // Clickjacking protection (redundant with frame-ancestors CSP, belt-and-suspenders)
      { key: "X-Frame-Options", value: "DENY" },

      // Legacy XSS filter for older browsers
      { key: "X-XSS-Protection", value: "1; mode=block" },

      // Don't leak full URL to third parties, only send origin
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

      // Allow geolocation only from self (needed for map pin)
      { key: "Permissions-Policy", value: "geolocation=(self), microphone=(), camera=()" },

      // In development: report-only so local dev is never broken by CSP violations.
      // In production: enforce the policy.
      {
        key: isDev ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
        value: buildCsp(),
      },
    ]

    // HSTS only makes sense over HTTPS — never set in development
    if (!isDev) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      })
    }

    return [{ source: "/:path*", headers }]
  },

  async redirects() {
    // HTTP → HTTPS redirect in production only.
    // Relies on nginx setting the x-forwarded-proto header.
    // In development this array is empty so localhost:3000 is never redirected.
    if (process.env.NODE_ENV !== "production") return []

    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://:host/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
