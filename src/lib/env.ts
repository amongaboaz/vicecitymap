/**
 * Centralised, validated access to environment configuration.
 *
 * Public values (NEXT_PUBLIC_*) are inlined at build time and may be read on
 * the client. Server-only values live in `env.server.ts`, which imports
 * `server-only` so it can never be bundled into client code.
 */

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const siteUrl = (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "http://localhost:3000").replace(/\/+$/, "");

const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabasePublishableKey =
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const maxZoomRaw = Number(clean(process.env.NEXT_PUBLIC_MAP_MAX_ZOOM) ?? "7");

export const publicEnv = {
  siteUrl,
  supabaseUrl,
  supabasePublishableKey,
  mapTilesUrl: clean(process.env.NEXT_PUBLIC_MAP_TILES_URL),
  mapTilesAttribution: clean(process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION),
  mapMaxZoom: Number.isFinite(maxZoomRaw) ? Math.min(Math.max(maxZoomRaw, 3), 12) : 7,
} as const;

/** True when Supabase URL + publishable key are present. Otherwise the app runs in demo mode. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
