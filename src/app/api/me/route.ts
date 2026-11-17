import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { getUserMapState } from "@/lib/discoveries/repository";

/** GET /api/me — viewer status + personal map state. Used by the map and the checkout success page. */
export async function GET() {
  const viewer = await getViewer();
  const state = viewer.userId && viewer.isPremium ? await getUserMapState(viewer) : { saved: [], progress: {} };
  return NextResponse.json(
    {
      signedIn: Boolean(viewer.userId),
      isPremium: viewer.isPremium,
      isAdmin: viewer.isAdmin,
      ...state,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
