import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { BASE_SECURITY_HEADERS, buildCsp } from "@/lib/security/csp";

/**
 * Runs ONLY for dynamic, sensitive routes (see matcher). Static shop pages never go through here,
 * so they stay fully cacheable (their CSP comes from next.config.ts headers).
 *
 *  - strict nonce-based CSP
 *  - /admin/* requires a signed-in user (role is re-checked in the layout and in every server action)
 *  - keeps the staff Supabase session fresh
 */
export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV !== "production", supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, siteUrl: process.env.NEXT_PUBLIC_SITE_URL });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
    const user = await updateSession(request, response);
    const isLogin = pathname === "/admin/login";
    if (pathname.startsWith("/admin") && !user && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      response = NextResponse.redirect(url);
    }
  }

  response.headers.set("Content-Security-Policy", csp);
  for (const h of BASE_SECURITY_HEADERS) response.headers.set(h.key, h.value);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (pathname.startsWith("/order")) response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*", "/checkout/:path*", "/order/:path*", "/mock/:path*"],
};
