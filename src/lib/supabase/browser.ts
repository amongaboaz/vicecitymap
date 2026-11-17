"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  client ??= createBrowserClient<Database>(publicEnv.supabaseUrl!, publicEnv.supabasePublishableKey!);
  return client;
}
