import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ANONYMOUS_VIEWER, hasLifetimeAccess, type Viewer } from "@/lib/entitlements";

/**
 * Data Access Layer: resolves the current viewer once per request.
 * Uses getUser() which validates the session with Supabase Auth.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // Always render viewer-dependent routes per request, even in demo mode where no cookie is read.
  await connection();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return ANONYMOUS_VIEWER;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return ANONYMOUS_VIEWER;

  const [entitlements, adminRole] = await Promise.all([
    supabase.from("entitlements").select("product_code, revoked_at").eq("user_id", user.id),
    supabase.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    isPremium: hasLifetimeAccess(entitlements.data ?? []),
    isAdmin: Boolean(adminRole.data),
  };
});

export async function requireUser(next = "/dashboard"): Promise<Viewer & { userId: string }> {
  const viewer = await getViewer();
  if (!viewer.userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer as Viewer & { userId: string };
}

/** Server-side admin gate. Non-admins get a 404 so the admin area is not advertised. */
export async function requireAdmin(): Promise<Viewer & { userId: string }> {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/login?next=/admin");
  if (!viewer.isAdmin) notFound();
  return viewer as Viewer & { userId: string };
}
