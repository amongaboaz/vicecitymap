import type { Metadata } from "next";
import Link from "next/link";
import { Crown } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";
import { listCategories } from "@/lib/discoveries/repository";
import { isSupabaseConfigured } from "@/lib/env";
import { Logo } from "@/components/site/logo";
import { AccountButton } from "@/components/site/account-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { MapExplorer } from "@/components/map/map-explorer";

export const metadata: Metadata = {
  title: "Interactive Map",
  description:
    "Explore the independent GTA 6 discovery map: search, filter and track locations, collectibles, missions, Easter eggs and hidden discoveries.",
  alternates: { canonical: "/map" },
};

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const [{ d }, viewer, categories] = await Promise.all([searchParams, getViewer(), listCategories()]);
  const initialSlug = typeof d === "string" && /^[a-z0-9-]{1,100}$/.test(d) ? d : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-ink-950 px-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Logo />
          <Badge className="hidden sm:inline-flex">Unofficial fan map</Badge>
        </div>
        <div className="flex items-center gap-2">
          {viewer.isAdmin ? (
            <Link href="/admin" className="hidden text-xs text-muted hover:text-fg sm:block">
              Admin
            </Link>
          ) : null}
          {viewer.isPremium ? (
            <Badge tone="neon">
              <Crown aria-hidden /> Lifetime
            </Badge>
          ) : (
            <ButtonLink href="/premium" size="sm">
              <Crown /> <span className="hidden sm:inline">Unlock all —</span> $10
            </ButtonLink>
          )}
          <AccountButton compact />
        </div>
      </header>
      <main id="main" className="relative flex flex-1 flex-col">
        <h1 className="sr-only">ViceCityMap interactive discovery map</h1>
        <MapExplorer
          viewer={{ signedIn: Boolean(viewer.userId), isPremium: viewer.isPremium, isAdmin: viewer.isAdmin }}
          categories={categories}
          initialSlug={initialSlug}
          demoMode={!isSupabaseConfigured}
        />
      </main>
    </div>
  );
}
