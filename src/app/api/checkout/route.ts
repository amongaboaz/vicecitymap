import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { isSameOrigin, jsonError, limitOrNull } from "@/lib/api";
import { startLifetimeCheckout } from "@/lib/payments/checkout";

/** POST /api/checkout — starts a $10 one-time lifetime checkout for the signed-in user. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin request rejected.");

  const viewer = await getViewer();
  const limited = limitOrNull(request, "checkout", viewer.userId ?? undefined);
  if (limited) return limited;

  const result = await startLifetimeCheckout(viewer);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ url: result.redirectUrl });
}
