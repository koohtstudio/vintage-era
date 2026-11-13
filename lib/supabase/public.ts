import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cookie-less anon client for the PUBLIC catalog. Safe to use in statically rendered pages:
 * it never touches cookies() or headers(), so it does not opt the route into dynamic rendering.
 * It can only ever see what RLS lets an anonymous visitor see.
 */
export function publicClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
