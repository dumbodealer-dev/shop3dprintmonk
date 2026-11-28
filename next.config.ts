import type { NextConfig } from "next";

// Allow next/image to optimise portfolio images served from Supabase Storage.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

// Content-Security-Policy: limits where scripts, frames and connections may go.
// Next.js inlines small bootstrap scripts, so 'unsafe-inline' is needed for scripts without nonces;
// the source allow-list still blocks loading code from any other host.
const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://*.razorpay.com https://www.google-analytics.com https://www.googletagmanager.com https://*.gstatic.com https://*.googleapis.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} https://*.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`,
  "frame-src https://*.razorpay.com https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")' },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Admin CSV product import is capped at 5 MB in the action itself.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/quote", destination: "/get-a-quote", permanent: true },
      { source: "/portfolio", destination: "/our-work", permanent: true },
      { source: "/gallery", destination: "/our-work", permanent: true },
    ];
  },
};

export default nextConfig;
