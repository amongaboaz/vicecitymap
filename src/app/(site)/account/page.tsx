import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteAccountForm, ProfileForm } from "@/components/account/account-forms";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await requireUser("/account");
  const supabase = (await createSupabaseServerClient())!;
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", viewer.userId).maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-1 text-sm text-muted">{viewer.email}</p>

      <Card className="mt-8 p-6">
        <h2 className="mb-4 text-sm font-semibold">Profile</h2>
        <ProfileForm displayName={profile?.display_name ?? ""} />
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="mb-4 text-sm font-semibold">Change password</h2>
        <ResetPasswordForm />
      </Card>

      <Card className="mt-4 border-danger/25 p-6">
        <h2 className="mb-4 text-sm font-semibold text-danger">Delete account</h2>
        <DeleteAccountForm isPremium={viewer.isPremium} />
      </Card>
    </div>
  );
}
