/**
 * Content Security Policy builder, shared by next.config.ts (static pages, no nonce)
 * and middleware.ts (dynamic pages, per-request nonce).
 */
export function buildCsp(opts: { nonce?: string; dev?: boolean; supabaseUrl?: string }): string {
  const supa = opts.supabaseUrl ? new URL(opts.supabaseUrl) : null;
  const supaHttp = supa ? supa.origin : "";
  const supaWs = supa ? `${supa.protocol === "https:" ? "wss" : "ws"}://${supa.host}` : "";

  const script = opts.nonce
    ? [`'self'`, `'nonce-${opts.nonce}'`, `'strict-dynamic'`]
    : [`'self'`, `'unsafe-inline'`];
  script.push("https://js.stripe.com", "https://challenges.cloudflare.com");
  if (opts.dev) script.push(`'unsafe-eval'`);

  const directives: Record<string, string[]> = {
    "default-src": [`'self'`],
    "script-src": script,
    "style-src": [`'self'`, `'unsafe-inline'`],
    "img-src": [`'self'`, "data:", "blob:", supaHttp, "https://*.stripe.com"].filter(Boolean),
    "font-src": [`'self'`, "data:"],
    "connect-src": [`'self'`, supaHttp, supaWs, "https://api.stripe.com", "https://challenges.cloudflare.com"].filter(Boolean),
    "frame-src": ["https://js.stripe.com", "https://hooks.stripe.com", "https://challenges.cloudflare.com", "https://www.google.com"],
    "media-src": [`'self'`, "data:", "blob:"],
    "object-src": [`'none'`],
    "base-uri": [`'self'`],
    "form-action": [`'self'`, "https://checkout.stripe.com"],
    "frame-ancestors": [`'none'`],
  };
  if (!opts.dev) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

export const BASE_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(self)" },
];
