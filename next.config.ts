import type { NextConfig } from "next";

const isolatedNeonStorageOrigin = process.env.VERCEL_ENV !== "production" &&
  process.env.MEROTALENT_BACKEND_MODE === "neon-staging"
  ? " https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech"
  : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isolatedNeonStorageOrigin}`,
  "font-src 'self' data:",
  // eSewa uses a browser form POST. Keep this limited to the documented UAT
  // and production ePay endpoints rather than permitting arbitrary providers.
  "form-action 'self' https://rc-epay.esewa.com.np https://epay.esewa.com.np",
  "frame-ancestors 'none'",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vdocipher.com https://player.vimeo.com",
  `img-src 'self' data: blob: https://*.supabase.co${isolatedNeonStorageOrigin}`,
  `media-src 'self' blob: https://*.supabase.co${isolatedNeonStorageOrigin}`,
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://player.vdocipher.com`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-XSS-Protection", value: "0" },
];

const nextConfig: NextConfig = {
  // Allows isolated staging HTTP checks while a legacy dev server is running.
  ...(process.env.MEROTALENT_STAGING_HTTP_TEST === "1" ? { distDir: ".next-neon-staging" } : {}),
  // The browser must follow the same explicit mode as the server. This flag
  // carries no credential and does not enable Neon on production by itself.
  env: {
    NEXT_PUBLIC_MEROTALENT_BACKEND_MODE: process.env.VERCEL_ENV !== "production" &&
      process.env.MEROTALENT_BACKEND_MODE === "neon-staging" ? "neon-staging" : "legacy",
  },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
};

export default nextConfig;
