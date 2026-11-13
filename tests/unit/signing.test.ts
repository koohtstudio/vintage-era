import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

beforeAll(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APP_MODE: "mock",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(40),
    SUPABASE_SERVICE_ROLE_KEY: "b".repeat(40),
    SESSION_SECRET: "s".repeat(40),
    ORDER_TOKEN_SECRET: "o".repeat(40),
  });
});

describe("order tokens", () => {
  it("accepts a signed token and rejects tampering or guesses", async () => {
    const { signOrderToken, verifyOrderToken } = await import("@/lib/security/tokens");
    const raw = "a".repeat(64);
    const signed = signOrderToken(raw);
    expect(verifyOrderToken(signed)).toBe(raw);
    expect(verifyOrderToken(signed.slice(0, -1) + "x")).toBeNull();
    expect(verifyOrderToken(`${"b".repeat(64)}.${signed.split(".")[1]}`)).toBeNull();
    expect(verifyOrderToken("1234")).toBeNull();
  });
});

describe("shopper session cookie", () => {
  it("only accepts values signed by the server", async () => {
    const { verifySessionValue } = await import("@/lib/security/session");
    const { createHmac } = await import("node:crypto");
    const id = "123e4567-e89b-42d3-a456-426614174000";
    const sig = createHmac("sha256", "s".repeat(40)).update(`sid:${id}`).digest("base64url");
    expect(verifySessionValue(`${id}.${sig}`)).toBe(id);
    expect(verifySessionValue(`${id}.forged`)).toBeNull();
    expect(verifySessionValue("123e4567-e89b-42d3-a456-426614174001." + sig)).toBeNull();
    expect(verifySessionValue(undefined)).toBeNull();
  });
});

describe("env guard", () => {
  it("refuses a live Stripe key in mock mode", async () => {
    vi.resetModules();
    const { serverEnv } = await import("@/lib/env");
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    expect(() => serverEnv()).toThrow(/LIVE Stripe key/);
    delete process.env.STRIPE_SECRET_KEY;
  });
});
