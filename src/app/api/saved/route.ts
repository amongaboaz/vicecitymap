import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { isSameOrigin, jsonError, limitOrNull, parseJsonBody } from "@/lib/api";
import { canUseFeature } from "@/lib/entitlements";
import { savedBodySchema } from "@/lib/discoveries/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST /api/saved { discoveryId, saved: boolean } — toggles a saved location. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin request rejected.");
  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "Sign in to save locations.");
  if (!canUseFeature(viewer, "saved_locations")) return jsonError(402, "Saved locations are a Premium feature.");

  const limited = limitOrNull(request, "write", viewer.userId);
  if (limited) return limited;

  const parsed = await parseJsonBody(savedBodySchema, request);
  if (!parsed.success) return jsonError(400, "Invalid request body.");
  const { discoveryId, saved } = parsed.data;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return jsonError(503, "Accounts are not configured.");

  if (!saved) {
    const { error } = await supabase.from("saved_locations").delete().eq("user_id", viewer.userId).eq("discovery_id", discoveryId);
    if (error) return jsonError(400, "Could not remove saved location.");
    return NextResponse.json({ ok: true, discoveryId, saved: false });
  }

  // Read through RLS so a user can only save discoveries they are allowed to see.
  const { data: discovery } = await supabase
    .from("discoveries")
    .select("id, title, map_x, map_y")
    .eq("id", discoveryId)
    .eq("is_published", true)
    .maybeSingle();
  if (!discovery) return jsonError(404, "Discovery not found.");

  const { error } = await supabase.from("saved_locations").upsert(
    { user_id: viewer.userId, discovery_id: discovery.id, label: discovery.title, map_x: discovery.map_x, map_y: discovery.map_y },
    { onConflict: "user_id,discovery_id" },
  );
  if (error) {
    console.error("[api/saved]", error);
    return jsonError(400, "Could not save location.");
  }
  return NextResponse.json({ ok: true, discoveryId, saved: true });
}
