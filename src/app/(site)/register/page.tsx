import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever. Upgrade to lifetime Premium any time for $10."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-fg underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
