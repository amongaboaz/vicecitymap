import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bookmark, CheckCircle2, Crown, LogOut, MapPin, Receipt, Settings, Shield } from "lucide-react";
import { requireUser } from "@/lib/auth/viewer";
import { signOut } from "@/lib/auth/actions";
import { getDashboardData } from "@/lib/dashboard";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { PremiumLock } from "@/components/map/premium-lock";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireUser("/dashboard");
  const [{ password }, data] = await Promise.all([searchParams, getDashboardData(viewer)]);
  const pct = data.totals.total ? Math.round((data.totals.done / data.totals.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {data.displayName ? `Hey, ${data.displayName}` : "Your dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted">{viewer.email}</p>
        </div>
        <div className="flex gap-2">
          {viewer.isAdmin ? (
            <ButtonLink href="/admin" variant="outline" size="sm">
              <Shield /> Admin
            </ButtonLink>
          ) : null}
          <ButtonLink href="/account" variant="ghost" size="sm">
            <Settings /> Settings
          </ButtonLink>
          <ButtonLink href="/map" size="sm">
            <MapPin /> Open map
          </ButtonLink>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Sign out
            </Button>
          </form>
        </div>
      </div>

      {password === "updated" ? (
        <Alert tone="neon" className="mt-6">
          Your password has been updated.
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6">
          <div aria-hidden className={`absolute -right-10 -top-10 size-40 rounded-full blur-3xl ${data.membership.active ? "bg-neon/15" : "bg-white/5"}`} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Membership</p>
              <Crown className={`size-4 ${data.membership.active ? "text-neon" : "text-subtle"}`} aria-hidden />
            </div>
            {data.membership.active ? (
              <>
                <p className="mt-4 text-2xl font-semibold text-neon">Lifetime Premium</p>
                <p className="mt-1 text-sm text-muted">
                  Active{data.membership.grantedAt ? ` since ${formatDate(data.membership.grantedAt)}` : ""}. Includes all future updates.
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-2xl font-semibold">Free plan</p>
                <p className="mt-1 text-sm text-muted">Unlock everything for a one-time $10.</p>
                <ButtonLink href="/premium" size="sm" className="mt-5">
                  Upgrade — $10 lifetime
                </ButtonLink>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Completion</p>
            <CheckCircle2 className="size-4 text-subtle" aria-hidden />
          </div>
          {data.membership.active ? (
            <>
              <div className="mt-4 flex items-end gap-3">
                <p className="text-4xl font-semibold">{pct}%</p>
                <p className="mb-1 text-sm text-muted">
                  {data.totals.done} of {data.totals.total} discoveries found
                </p>
              </div>
              <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {data.completion.map((c) => {
                  const p = c.total ? (c.done / c.total) * 100 : 0;
                  return (
                    <li key={c.categoryId}>
                      <div className="flex justify-between text-xs">
                        <span className="text-fg/90">{c.name}</span>
                        <span className="font-mono text-subtle">
                          {c.done}/{c.total}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label={`${c.name} completion`} aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: c.color }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <PremiumLock className="mt-4" title="Completion tracking is a Premium feature" body="Mark collectibles found and missions completed, and watch your stats grow here." />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Bookmark className="size-4 text-ember" aria-hidden />
            <h2 className="text-sm font-semibold">Saved locations</h2>
          </div>
          {data.saved.length ? (
            <ul className="divide-y divide-line">
              {data.saved.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  {s.slug ? (
                    <Link href={`/map?d=${s.slug}`} className="truncate text-sm text-fg hover:text-neon">
                      {s.label}
                    </Link>
                  ) : (
                    <span className="truncate text-sm text-fg">{s.label}</span>
                  )}
                  <span className="shrink-0 pl-3 text-[11px] text-subtle">{formatDate(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Bookmark />} title="No saved locations yet">
              {data.membership.active ? "Open a discovery on the map and tap Save." : "Saved locations are part of Premium."}
            </EmptyState>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="size-4 text-neon" aria-hidden />
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {data.activity.length ? (
            <ol className="space-y-3">
              {data.activity.map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neon/70" aria-hidden />
                  <div className="min-w-0">
                    {a.href ? (
                      <Link href={a.href} className="block truncate text-sm text-fg hover:text-neon">
                        {a.label}
                      </Link>
                    ) : (
                      <p className="truncate text-sm text-fg">{a.label}</p>
                    )}
                    <p className="text-[11px] text-subtle">{formatDateTime(a.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={<Activity />} title="Nothing yet">
              Your progress, saves and purchases will appear here.
            </EmptyState>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Receipt className="size-4 text-muted" aria-hidden />
            <h2 className="text-sm font-semibold">Purchase history</h2>
          </div>
          {data.purchases.length ? (
            <ul className="divide-y divide-line">
              {data.purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-fg">Lifetime access</p>
                    <p className="text-[11px] text-subtle">{formatDate(p.paidAt ?? p.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-fg">{formatCurrency(p.amountCents, p.currency)}</p>
                    <Badge tone={p.status === "paid" ? "neon" : p.status === "refunded" ? "ember" : "neutral"}>{p.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Receipt />} title="No purchases">
              One-time payments appear here once confirmed.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
