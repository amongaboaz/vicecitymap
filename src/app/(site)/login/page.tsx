import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { Alert } from "@/components/ui/primitives";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = safeRedirectPath(typeof next === "string" ? next : null, "/dashboard");
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track progress and manage your membership."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="text-fg underline-offset-4 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      {error === "link" ? (
        <Alert tone="danger" className="mb-4">
          That link is invalid or has expired. Please try again.
        </Alert>
      ) : null}
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
