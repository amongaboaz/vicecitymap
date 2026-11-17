"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogIn } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/env";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reads the local session (no network) so marketing pages stay static.
 * This is display-only; every protected action is authorised on the server.
 */
export function AccountButton({ compact = false }: { compact?: boolean }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(isSupabaseConfigured ? null : false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (signedIn === null) return <span className={cn("h-9 w-24 rounded-lg bg-white/[0.04]", compact && "w-9")} aria-hidden />;

  return signedIn ? (
    <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
      <LayoutDashboard /> {compact ? null : "Dashboard"}
    </Link>
  ) : (
    <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <LogIn /> {compact ? null : "Sign in"}
    </Link>
  );
}
