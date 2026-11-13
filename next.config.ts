import type { NextConfig } from "next";
import { BASE_SECURITY_HEADERS, buildCsp } from "./lib/security/csp";

// Fail the build if a secret-looking variable is exposed to the browser bundle.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE|PRIVATE/i.test(key)) {
    throw new Error(`${key} is exposed to the browser. Secrets must not use the NEXT_PUBLIC_ prefix.`);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl) : null;
const dev = process.env.NODE_ENV !== "production";

const config: NextConfig = {
  poweredByHeader: false,
  // photo uploads (already shrunk in the browser) go through server actions
  experimental: { serverActions: { bodySizeLimit: "24mb" } },
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: supabaseHost
      ? [
          {
            protocol: supabaseHost.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseHost.hostname,
            port: supabaseHost.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      // Dynamic routes get a strict per-request nonce CSP from middleware.ts.
      // Everything else is static/ISR, so it gets the header CSP (no nonce possible).
      {
        source: "/((?!admin|checkout|order|auth|api|mock).*)",
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: "Content-Security-Policy", value: buildCsp({ dev, supabaseUrl }) },
        ],
      },
      { source: "/(admin|checkout|order|auth|api|mock)(.*)", headers: BASE_SECURITY_HEADERS },
    ];
  },
};

export default config;
