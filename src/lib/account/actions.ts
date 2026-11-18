"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/viewer";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; ok?: string } | undefined;

export async function updateProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const viewer = await requireUser("/account");
  const parsed = z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(40, "Display name must be at most 40 characters.")
    .safeParse(formData.get("displayName"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = (await createSupabaseServerClient())!;
  // RLS: users can only update their own profile row.
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", viewer.userId);
  if (error) return { error: "Could not update your profile." };
  revalidatePath("/dashboard");
  revalidatePath("/account");
  return { ok: "Profile updated." };
}

/**
 * Permanently deletes the signed-in user's account. Profile, progress, saves and
 * entitlements cascade; purchase records are kept (detached) for accounting.
 */
export async function deleteAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const viewer = await requireUser("/account");
  if (!rateLimit("auth", `delete:${clientIp(await headers())}`).ok) {
    return { error: "Too many attempts. Please wait a few minutes." };
  }
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE (in capitals) to confirm." };
  if (viewer.isAdmin) return { error: "Admin accounts must be removed by another admin via SQL." };
  if (!isServiceRoleConfigured) return { error: "Account deletion is not available on this deployment yet." };

  // Service role is used only for the authenticated user's own id, after requireUser().
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(viewer.userId);
  if (error) {
    console.error("[account] delete failed", error);
    return { error: "Could not delete your account. Please contact support." };
  }

  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
