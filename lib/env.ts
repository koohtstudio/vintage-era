import "server-only";
import { z } from "zod";
import { APP_MODE } from "@/lib/mode";

const base = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be 32+ chars (openssl rand -base64 32)"),
  ORDER_TOKEN_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  SMS_PROVIDER: z.string().optional(),
});

const live = base.extend({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(3),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(16),
});

const mock = base.extend({
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Era Vintage <hello@example.com>"),
});

export type ServerEnv = z.infer<typeof live> | z.infer<typeof mock>;

let cached: ServerEnv | null = null;

/** Validated, typed server env. Throws a readable error naming every bad variable. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const schema = APP_MODE === "live" ? live : mock;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment for ${APP_MODE} mode:\n${lines.join("\n")}`);
  }
  if (APP_MODE === "mock" && parsed.data.STRIPE_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("Refusing to start: mock mode with a LIVE Stripe key. Remove STRIPE_SECRET_KEY or use test keys.");
  }
  cached = parsed.data;
  return cached;
}
