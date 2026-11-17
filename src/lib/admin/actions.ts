"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/viewer";
import { categoryFormSchema, discoveryFormSchema, IMAGE_UPLOAD } from "@/lib/discoveries/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

/**
 * Every admin action: (1) re-checks the admin role on the server, (2) validates
 * input with zod, (3) writes through the user's session so RLS enforces the
 * same `is_admin()` rule a second time in the database.
 */
async function adminClient() {
  const viewer = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return { viewer, supabase };
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}

function readDiscoveryForm(formData: FormData) {
  return discoveryFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    premiumDetails: formData.get("premiumDetails") ?? "",
    categoryId: formData.get("categoryId"),
    mapX: formData.get("mapX"),
    mapY: formData.get("mapY"),
    accessLevel: formData.get("accessLevel"),
    verificationStatus: formData.get("verificationStatus"),
    isPublished: formData.get("isPublished") === "on",
    sourceNote: formData.get("sourceNote") ?? "",
  });
}

export async function saveDiscovery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { viewer, supabase } = await adminClient();
  const id = formData.get("id");
  const parsed = readDiscoveryForm(formData);
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const v = parsed.data;

  const row = {
    title: v.title,
    slug: v.slug,
    summary: v.summary,
    description: v.description,
    category_id: v.categoryId,
    map_x: v.mapX,
    map_y: v.mapY,
    access_level: v.accessLevel,
    verification_status: v.verificationStatus,
    is_published: v.isPublished,
    source_note: v.sourceNote || null,
    verified_at: v.verificationStatus === "verified" ? new Date().toISOString() : null,
  };

  let discoveryId: string;
  if (typeof id === "string" && id) {
    const { error } = await supabase.from("discoveries").update(row).eq("id", id);
    if (error) return { error: error.code === "23505" ? "That slug is already in use." : `Save failed: ${error.message}` };
    discoveryId = id;
  } else {
    const { data, error } = await supabase
      .from("discoveries")
      .insert({ ...row, created_by: viewer.userId })
      .select("id")
      .single();
    if (error || !data) return { error: error?.code === "23505" ? "That slug is already in use." : `Create failed: ${error?.message}` };
    discoveryId = data.id;
  }

  if (v.premiumDetails) {
    const { error } = await supabase
      .from("discovery_premium_details")
      .upsert({ discovery_id: discoveryId, details: v.premiumDetails }, { onConflict: "discovery_id" });
    if (error) return { error: `Saved, but premium details failed: ${error.message}` };
  } else {
    await supabase.from("discovery_premium_details").delete().eq("discovery_id", discoveryId);
  }

  revalidatePath("/admin/discoveries");
  if (!id) redirect(`/admin/discoveries/${discoveryId}?created=1`);
  return { ok: "Saved." };
}

export async function deleteDiscovery(formData: FormData) {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid id");

  const { data: images } = await supabase.from("discovery_images").select("storage_path").eq("discovery_id", id);
  if (images?.length) await supabase.storage.from("discovery-images").remove(images.map((i) => i.storage_path));
  const { error } = await supabase.from("discoveries").delete().eq("id", id);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  revalidatePath("/admin/discoveries");
  redirect("/admin/discoveries?deleted=1");
}

export async function setDiscoveryFlags(formData: FormData) {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  if (field === "verify") {
    await supabase.from("discoveries").update({ verification_status: "verified", verified_at: new Date().toISOString() }).eq("id", id);
  } else if (field === "publish" || field === "unpublish") {
    await supabase.from("discoveries").update({ is_published: field === "publish" }).eq("id", id);
  }
  revalidatePath("/admin/discoveries");
  revalidatePath(`/admin/discoveries/${id}`);
}

export async function uploadDiscoveryImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await adminClient();
  const discoveryId = String(formData.get("discoveryId") ?? "");
  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 200);
  if (!/^[0-9a-f-]{36}$/i.test(discoveryId)) return { error: "Invalid discovery." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const ext = IMAGE_UPLOAD.types[file.type];
  if (!ext) return { error: "Only JPEG, PNG or WebP images are allowed." };
  if (file.size > IMAGE_UPLOAD.maxBytes) return { error: "Images must be 5 MB or smaller." };

  // Verify magic bytes — don't trust the browser-provided MIME type alone.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isWebp = String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP";
  if (!((ext === "jpg" && isJpeg) || (ext === "png" && isPng) || (ext === "webp" && isWebp))) {
    return { error: "The file contents don't match an allowed image type." };
  }

  const path = `${discoveryId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("discovery-images").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { count } = await supabase.from("discovery_images").select("id", { count: "exact", head: true }).eq("discovery_id", discoveryId);
  const { error } = await supabase.from("discovery_images").insert({ discovery_id: discoveryId, storage_path: path, alt, sort_order: count ?? 0 });
  if (error) {
    await supabase.storage.from("discovery-images").remove([path]);
    return { error: `Could not save image record: ${error.message}` };
  }
  revalidatePath(`/admin/discoveries/${discoveryId}`);
  return { ok: "Image uploaded." };
}

export async function deleteDiscoveryImage(formData: FormData) {
  const { supabase } = await adminClient();
  const id = String(formData.get("imageId") ?? "");
  const { data: img } = await supabase.from("discovery_images").select("storage_path, discovery_id").eq("id", id).maybeSingle();
  if (!img) return;
  await supabase.storage.from("discovery-images").remove([img.storage_path]);
  await supabase.from("discovery_images").delete().eq("id", id);
  revalidatePath(`/admin/discoveries/${img.discovery_id}`);
}

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await adminClient();
  const id = formData.get("id");
  const parsed = categoryFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    color: formData.get("color"),
    icon: formData.get("icon") ?? "map-pin",
    isPremium: formData.get("isPremium") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const v = parsed.data;
  const row = { name: v.name, slug: v.slug, description: v.description || null, color: v.color, icon: v.icon, is_premium: v.isPremium, sort_order: v.sortOrder };
  const { error } =
    typeof id === "string" && id
      ? await supabase.from("categories").update(row).eq("id", id)
      : await supabase.from("categories").insert(row);
  if (error) return { error: error.code === "23505" ? "That slug is already in use." : `Save failed: ${error.message}` };
  revalidatePath("/admin/categories");
  revalidatePath("/map");
  return { ok: "Category saved." };
}

export async function deleteCategory(formData: FormData) {
  const { supabase } = await adminClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("categories").delete().eq("id", id);
  // FK is ON DELETE RESTRICT: categories with discoveries cannot be removed.
  if (error) redirect(`/admin/categories?error=${encodeURIComponent("Move or delete this category's discoveries first.")}`);
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
