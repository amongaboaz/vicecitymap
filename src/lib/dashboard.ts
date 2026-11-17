import "server-only";
import { listCategories } from "@/lib/discoveries/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/entitlements";
import type { ProgressStatus, PurchaseStatus } from "@/types/database";

export type ActivityItem = { at: string; kind: "progress" | "saved" | "purchase"; label: string; href?: string };

export type DashboardData = {
  displayName: string | null;
  membership: { active: boolean; grantedAt: string | null };
  purchases: { id: string; amountCents: number; currency: string; status: PurchaseStatus; createdAt: string; paidAt: string | null }[];
  completion: { categoryId: string; name: string; color: string; done: number; total: number }[];
  totals: { done: number; total: number };
  saved: { id: string; label: string; slug: string | null; createdAt: string }[];
  activity: ActivityItem[];
};

export async function getDashboardData(viewer: Viewer & { userId: string }): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const [profile, entitlement, purchases, progress, saved, categories] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", viewer.userId).maybeSingle(),
    supabase.from("entitlements").select("granted_at, revoked_at").eq("user_id", viewer.userId).eq("product_code", "lifetime").maybeSingle(),
    supabase
      .from("purchases")
      .select("id, amount_cents, currency, status, created_at, paid_at")
      .eq("user_id", viewer.userId)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("user_progress")
      .select("status, updated_at, discovery:discoveries(title, slug, category_id)")
      .eq("user_id", viewer.userId)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("saved_locations")
      .select("id, label, created_at, discovery:discoveries(slug)")
      .eq("user_id", viewer.userId)
      .order("created_at", { ascending: false })
      .limit(50),
    listCategories(),
  ]);

  type ProgressRow = { status: ProgressStatus; updated_at: string; discovery: { title: string; slug: string; category_id: string } | null };
  const progressRows = (progress.data ?? []) as unknown as ProgressRow[];
  type SavedRow = { id: string; label: string; created_at: string; discovery: { slug: string } | null };
  const savedRows = (saved.data ?? []) as unknown as SavedRow[];

  const doneByCategory = new Map<string, number>();
  for (const p of progressRows) {
    if (p.discovery) doneByCategory.set(p.discovery.category_id, (doneByCategory.get(p.discovery.category_id) ?? 0) + 1);
  }
  const completion = categories.map((c) => ({
    categoryId: c.id,
    name: c.name,
    color: c.color,
    done: doneByCategory.get(c.id) ?? 0,
    total: c.freeCount + c.premiumCount,
  }));

  const activity: ActivityItem[] = [
    ...progressRows.slice(0, 10).flatMap((p) =>
      p.discovery ? [{ at: p.updated_at, kind: "progress" as const, label: `Marked “${p.discovery.title}” ${p.status}`, href: `/map?d=${p.discovery.slug}` }] : [],
    ),
    ...savedRows.slice(0, 10).map((s) => ({
      at: s.created_at,
      kind: "saved" as const,
      label: `Saved “${s.label}”`,
      href: s.discovery ? `/map?d=${s.discovery.slug}` : undefined,
    })),
    ...(purchases.data ?? []).map((p) => ({ at: p.created_at, kind: "purchase" as const, label: `Lifetime purchase — ${p.status}` })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return {
    displayName: profile.data?.display_name ?? null,
    membership: {
      active: viewer.isPremium,
      grantedAt: entitlement.data && !entitlement.data.revoked_at ? entitlement.data.granted_at : null,
    },
    purchases: (purchases.data ?? []).map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
      paidAt: p.paid_at,
    })),
    completion,
    totals: { done: completion.reduce((n, c) => n + c.done, 0), total: completion.reduce((n, c) => n + c.total, 0) },
    saved: savedRows.map((s) => ({ id: s.id, label: s.label, slug: s.discovery?.slug ?? null, createdAt: s.created_at })),
    activity,
  };
}
