"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

export type AuthFormState = { error?: string; message?: string; fields?: Record<string, string> } | undefined;

const email = z.email({ error: "Enter a valid email address." }).max(254);
const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.");

async function guard(): Promise<string | null> {
  const ip = clientIp(await headers());
  return rateLimit("auth", ip).ok ? null : "Too many attempts. Please wait a few minutes and try again.";
}

const NOT_CONFIGURED = "Accounts are not available yet: Supabase is not configured on this deployment.";

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const limited = await guard();
  if (limited) return { error: limited };
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.").max(72) }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const fields = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED, fields };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Generic message: never reveal whether the email exists.
  if (error) return { error: "Incorrect email or password, or your email is not confirmed yet.", fields };

  redirect(safeRedirectPath(String(formData.get("next") ?? ""), "/dashboard"));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const limited = await guard();
  if (limited) return { error: limited };
  const parsed = z
    .object({
      email,
      password,
      displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(40),
      terms: z.literal("on", { error: "Please accept the terms and privacy policy." }),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName"),
      terms: formData.get("terms"),
    });
  const fields = { email: String(formData.get("email") ?? ""), displayName: String(formData.get("displayName") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED, fields };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    return { error: error.code === "weak_password" ? "That password is too weak. Try a longer passphrase." : "Could not create the account. Please try again.", fields };
  }
  if (data.session) redirect("/dashboard");
  return { message: "Check your inbox to confirm your email address, then sign in." };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const limited = await guard();
  if (limited) return { error: limited };
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });
  // Same response whether or not the account exists.
  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Could not update your password. Try a different one." };
  redirect("/dashboard?password=updated");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
