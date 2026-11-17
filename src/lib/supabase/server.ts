import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Request-scoped Supabase client acting as the signed-in user (RLS applies).
 * Returns null in demo mode (Supabase not configured).
 */
export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl!, publicEnv.supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

export type ServerSupabase = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
