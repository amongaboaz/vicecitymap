"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/discoveries", label: "Discoveries" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/purchases", label: "Purchases" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="scrollbar-thin mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
      {items.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active ? "border-neon text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
