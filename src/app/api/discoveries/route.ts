import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { jsonError, limitOrNull, parseSearchParams } from "@/lib/api";
import { listMarkers } from "@/lib/discoveries/repository";
import { markerQuerySchema } from "@/lib/discoveries/validation";

/** GET /api/discoveries?bbox=minX,minY,maxX,maxY&categories=a,b&limit=500 — viewport-based marker loading. */
export async function GET(request: Request) {
  const limited = limitOrNull(request, "read");
  if (limited) return limited;

  const parsed = parseSearchParams(markerQuerySchema, request.url);
  if (!parsed.success) return jsonError(400, "Invalid query parameters", { issues: parsed.error.issues });

  try {
    const viewer = await getViewer();
    const page = await listMarkers(viewer, parsed.data);
    return NextResponse.json(page, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[api/discoveries]", err);
    return jsonError(500, "Could not load discoveries.");
  }
}
