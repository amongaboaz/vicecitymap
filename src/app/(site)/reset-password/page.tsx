import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="You followed a secure reset link. Pick a new password below.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
