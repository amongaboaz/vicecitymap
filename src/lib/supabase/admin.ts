import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Service-role client. BYPASSES RLS — use only in trusted server code paths
 * (payment webhook fulfilment, creating pending purchases, admin user listing)
 * and only after the caller has been authorised.
 */
export function createSupabaseAdminClient() {
  if (!publicEnv.supabaseUrl || !serverEnv.supabaseSecretKey) {
    throw new Error("Supabase service credentials are not configured (SUPABASE_SECRET_KEY).");
  }
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
