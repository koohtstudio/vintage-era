import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/security/csp";

describe("csp", () => {
  it("blocks objects and framing, nonce replaces unsafe-inline", () => {
    const csp = buildCsp({ nonce: "abc", supabaseUrl: "http://127.0.0.1:54321" });
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("'nonce-abc'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("ws://127.0.0.1:54321");
  });
});
