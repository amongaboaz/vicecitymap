import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { jsonError, limitOrNull, parseSearchParams } from "@/lib/api";
import { searchDiscoveries } from "@/lib/discoveries/repository";
import { searchQuerySchema } from "@/lib/discoveries/validation";

export async function GET(request: Request) {
  const limited = limitOrNull(request, "read");
  if (limited) return limited;

  const parsed = parseSearchParams(searchQuerySchema, request.url);
  if (!parsed.success) return jsonError(400, "Search needs at least 2 characters.");

  try {
    const viewer = await getViewer();
    const items = await searchDiscoveries(viewer, parsed.data.q, parsed.data.limit);
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[api/discoveries/search]", err);
    return jsonError(500, "Search is temporarily unavailable.");
  }
}
