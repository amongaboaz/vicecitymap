import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { isSameOrigin, jsonError, limitOrNull, parseJsonBody } from "@/lib/api";
import { canUseFeature } from "@/lib/entitlements";
import { progressBodySchema } from "@/lib/discoveries/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST /api/progress { discoveryId, status: "found" | "completed" | null } */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin request rejected.");
  const viewer = await getViewer();
  if (!viewer.userId) return jsonError(401, "Sign in to track progress.");
  if (!canUseFeature(viewer, "progress_tracking")) return jsonError(402, "Progress tracking is a Premium feature.");

  const limited = limitOrNull(request, "write", viewer.userId);
  if (limited) return limited;

  const parsed = await parseJsonBody(progressBodySchema, request);
  if (!parsed.success) return jsonError(400, "Invalid request body.");
  const { discoveryId, status } = parsed.data;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return jsonError(503, "Accounts are not configured.");

  // RLS re-checks ownership and lifetime access on every write.
  const result =
    status === null
      ? await supabase.from("user_progress").delete().eq("user_id", viewer.userId).eq("discovery_id", discoveryId)
      : await supabase
          .from("user_progress")
          .upsert({ user_id: viewer.userId, discovery_id: discoveryId, status }, { onConflict: "user_id,discovery_id" });

  if (result.error) {
    console.error("[api/progress]", result.error);
    return jsonError(400, "Could not update progress.");
  }
  return NextResponse.json({ ok: true, discoveryId, status });
}
