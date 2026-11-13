import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { serverEnv } from "@/lib/env";

/**
 * SERVICE ROLE client. Bypasses RLS. The only importer-restricted door to it.
 * Allowed uses: shopper-session RPCs (holds, orders), payment webhook, cron, email outbox,
 * storage uploads after an explicit authorization check. Never pass it to client code.
 */
export function serviceClient() {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
