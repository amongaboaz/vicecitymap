import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { jsonError, limitOrNull } from "@/lib/api";
import { getDiscoveryDetail } from "@/lib/discoveries/repository";

export async function GET(request: Request, ctx: RouteContext<"/api/discoveries/[id]">) {
  const limited = limitOrNull(request, "read");
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!/^[a-z0-9-]{1,100}$/i.test(id)) return jsonError(400, "Invalid discovery id.");

  try {
    const viewer = await getViewer();
    const detail = await getDiscoveryDetail(viewer, id);
    // 404 for both "missing" and "premium-only" so locked content isn't confirmed to exist.
    if (!detail) return jsonError(404, "Discovery not found or requires Premium.");
    return NextResponse.json(detail, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[api/discoveries/:id]", err);
    return jsonError(500, "Could not load this discovery.");
  }
}
