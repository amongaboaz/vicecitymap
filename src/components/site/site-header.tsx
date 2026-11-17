"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { nav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";
import { AccountButton } from "./account-button";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-fg",
                pathname === item.href && "text-fg",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <AccountButton />
          <ButtonLink href="/map" size="sm">
            Open map
          </ButtonLink>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line px-4 pb-4 pt-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-[15px] text-muted hover:bg-white/5 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 px-1" onClick={() => setOpen(false)}>
            <AccountButton />
            <ButtonLink href="/map" size="sm" className="flex-1">
              Open map
            </ButtonLink>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
