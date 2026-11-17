import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/viewer";
import { Logo } from "@/components/site/logo";
import { Badge } from "@/components/ui/primitives";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Server-side role gate for the whole /admin tree. Non-admins receive a 404. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge tone="ember">Admin</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="hidden sm:inline">{viewer.email}</span>
            <Link href="/dashboard" className="hover:text-fg">
              Exit admin
            </Link>
          </div>
        </div>
        <AdminNav />
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
