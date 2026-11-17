import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/map", label: "Interactive map" },
      { href: "/premium", label: "Premium — $10 lifetime" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">{site.tagline}. Built by fans, verified by the community.</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs leading-relaxed text-subtle md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">{site.disclaimer}</p>
          <p className="shrink-0">© {new Date().getFullYear()} ViceCityMap</p>
        </div>
      </div>
    </footer>
  );
}
