import "server-only";
import { canUseFeature, canViewDiscovery, type Viewer } from "@/lib/entitlements";
import { createSupabaseServerClient, type ServerSupabase } from "@/lib/supabase/server";
import { demoCategories, demoDiscoveries, type DemoDiscovery } from "./demo";
import type {
  BBox,
  CategoryDTO,
  DiscoveryDetailDTO,
  MarkerDTO,
  MarkerPage,
  UserMapState,
} from "./types";
import type { Discovery, VerificationStatus } from "@/types/database";

export type MarkerQuery = {
  bbox?: BBox;
  categories?: string[];
  verification?: VerificationStatus;
  limit: number;
};

const MARKER_COLUMNS = "id, slug, title, category_id, map_x, map_y, access_level, verification_status" as const;
const SIGNED_URL_TTL_SECONDS = 60 * 30;

function toMarker(d: Pick<Discovery, "id" | "slug" | "title" | "category_id" | "map_x" | "map_y" | "access_level" | "verification_status">): MarkerDTO {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    categoryId: d.category_id,
    x: d.map_x,
    y: d.map_y,
    accessLevel: d.access_level,
    verification: d.verification_status,
  };
}

// ── Demo-mode helpers ────────────────────────────────────────────────
const demoCategoryBySlug = new Map(demoCategories.map((c) => [c.slug, c]));

function demoVisible(viewer: Viewer, d: DemoDiscovery) {
  return canViewDiscovery(viewer, {
    access_level: d.access_level,
    is_published: true,
    categoryIsPremium: demoCategoryBySlug.get(d.category_slug)?.is_premium,
  });
}

function demoMarker(d: DemoDiscovery): MarkerDTO {
  return {
    id: d.slug,
    slug: d.slug,
    title: d.title,
    categoryId: d.category_slug,
    x: d.map_x,
    y: d.map_y,
    accessLevel: d.access_level,
    verification: d.verification_status,
  };
}

function inBBox(x: number, y: number, b?: BBox) {
  return !b || (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY);
}

// ── Public API ───────────────────────────────────────────────────────
export async function listCategories(): Promise<CategoryDTO[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return demoCategories.map((c) => {
      const items = demoDiscoveries.filter((d) => d.category_slug === c.slug);
      const premiumCount = items.filter((d) => d.access_level === "premium" || c.is_premium).length;
      return {
        id: c.slug,
        slug: c.slug,
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
        isPremium: c.is_premium,
        sortOrder: c.sort_order,
        freeCount: items.length - premiumCount,
        premiumCount,
      };
    });
  }

  const [{ data: categories, error }, { data: counts }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.rpc("discovery_counts"),
  ]);
  if (error) throw new Error(`Failed to load categories: ${error.message}`);

  return (categories ?? []).map((c) => {
    const rows = (counts ?? []).filter((r) => r.category_id === c.id);
    const free = rows.find((r) => r.access_level === "free")?.total ?? 0;
    const premium = rows.find((r) => r.access_level === "premium")?.total ?? 0;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      isPremium: c.is_premium,
      sortOrder: c.sort_order,
      freeCount: c.is_premium ? 0 : Number(free),
      premiumCount: c.is_premium ? Number(free) + Number(premium) : Number(premium),
    };
  });
}

export async function listMarkers(viewer: Viewer, query: MarkerQuery): Promise<MarkerPage> {
  const verification = canUseFeature(viewer, "advanced_filters") ? query.verification : undefined;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const all = demoDiscoveries.filter(
      (d) =>
        demoVisible(viewer, d) &&
        inBBox(d.map_x, d.map_y, query.bbox) &&
        (!query.categories?.length || query.categories.includes(d.category_slug)) &&
        (!verification || d.verification_status === verification),
    );
    return { items: all.slice(0, query.limit).map(demoMarker), truncated: all.length > query.limit };
  }

  // RLS removes premium rows for non-members; is_published hides admin drafts on the public map.
  let q = supabase.from("discoveries").select(MARKER_COLUMNS).eq("is_published", true);
  if (query.bbox) {
    q = q
      .gte("map_x", query.bbox.minX)
      .lte("map_x", query.bbox.maxX)
      .gte("map_y", query.bbox.minY)
      .lte("map_y", query.bbox.maxY);
  }
  if (query.categories?.length) q = q.in("category_id", query.categories);
  if (verification) q = q.eq("verification_status", verification);

  const { data, error } = await q.order("id").limit(query.limit + 1);
  if (error) throw new Error(`Failed to load discoveries: ${error.message}`);
  const rows = data ?? [];
  return { items: rows.slice(0, query.limit).map(toMarker), truncated: rows.length > query.limit };
}

export async function searchDiscoveries(viewer: Viewer, term: string, limit: number): Promise<MarkerDTO[]> {
  const supabase = await createSupabaseServerClient();
  const needle = term.toLowerCase();
  if (!supabase) {
    return demoDiscoveries
      .filter((d) => demoVisible(viewer, d) && d.title.toLowerCase().includes(needle))
      .slice(0, limit)
      .map(demoMarker);
  }
  const escaped = term.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data, error } = await supabase
    .from("discoveries")
    .select(MARKER_COLUMNS)
    .eq("is_published", true)
    .ilike("title", `%${escaped}%`)
    .order("title")
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return (data ?? []).map(toMarker);
}

async function signedImages(supabase: ServerSupabase, discoveryId: string) {
  const { data: images } = await supabase
    .from("discovery_images")
    .select("id, storage_path, alt, sort_order")
    .eq("discovery_id", discoveryId)
    .order("sort_order");
  if (!images?.length) return [];
  const { data: signed } = await supabase.storage
    .from("discovery-images")
    .createSignedUrls(images.map((i) => i.storage_path), SIGNED_URL_TTL_SECONDS);
  return images.flatMap((img) => {
    const url = signed?.find((s) => s.path === img.storage_path)?.signedUrl;
    return url ? [{ id: img.id, url, alt: img.alt }] : [];
  });
}

export async function getDiscoveryDetail(viewer: Viewer, idOrSlug: string): Promise<DiscoveryDetailDTO | null> {
  const premiumAllowed = canUseFeature(viewer, "premium_details");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const d = demoDiscoveries.find((x) => x.slug === idOrSlug);
    if (!d || !demoVisible(viewer, d)) return null;
    return {
      ...demoMarker(d),
      summary: d.summary,
      description: d.description,
      sourceNote: "Demonstration data",
      isDemo: true,
      updatedAt: new Date(0).toISOString(),
      images: [],
      premiumDetails: premiumAllowed ? d.premium_details : null,
      premiumLocked: !premiumAllowed,
      userState: null,
    };
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const base = supabase.from("discoveries").select("*").eq("is_published", true);
  const { data: d, error } = await (isUuid ? base.eq("id", idOrSlug) : base.eq("slug", idOrSlug)).maybeSingle();
  if (error) throw new Error(`Failed to load discovery: ${error.message}`);
  if (!d) return null;

  const [images, premium, saved, progress] = await Promise.all([
    signedImages(supabase, d.id),
    premiumAllowed
      ? supabase.from("discovery_premium_details").select("details").eq("discovery_id", d.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer.userId
      ? supabase.from("saved_locations").select("id").eq("user_id", viewer.userId).eq("discovery_id", d.id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer.userId
      ? supabase.from("user_progress").select("status").eq("user_id", viewer.userId).eq("discovery_id", d.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...toMarker(d),
    summary: d.summary,
    description: d.description,
    sourceNote: d.source_note,
    isDemo: d.is_demo,
    updatedAt: d.updated_at,
    images,
    premiumDetails: premium.data?.details || null,
    premiumLocked: !premiumAllowed,
    userState: viewer.userId ? { saved: Boolean(saved.data), progress: progress.data?.status ?? null } : null,
  };
}

export async function getUserMapState(viewer: Viewer): Promise<UserMapState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase || !viewer.userId) return { saved: [], progress: {} };
  const [saved, progress] = await Promise.all([
    supabase.from("saved_locations").select("discovery_id").eq("user_id", viewer.userId).not("discovery_id", "is", null),
    supabase.from("user_progress").select("discovery_id, status").eq("user_id", viewer.userId),
  ]);
  return {
    saved: (saved.data ?? []).flatMap((s) => (s.discovery_id ? [s.discovery_id] : [])),
    progress: Object.fromEntries((progress.data ?? []).map((p) => [p.discovery_id, p.status])),
  };
}
