import { Check, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const included = [
  "Full verified discovery database",
  "Hidden discoveries & premium details",
  "Collectibles and mission progress tracking",
  "Personal saved locations",
  "Advanced filters",
  "Every future map update — no renewals",
];

export function PricingCard({ className, cta }: { className?: string; cta?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-neon/25 bg-ink-900 p-8 shadow-[var(--shadow-panel)] sm:p-10",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-neon/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-neon">Premium · Lifetime</p>
          <Badge tone="ember">One-time</Badge>
        </div>
        <div className="mt-6 flex items-end gap-2">
          <span className="text-6xl font-semibold tracking-tight text-fg">$10</span>
          <span className="mb-2 text-sm text-muted">USD, once</span>
        </div>
        <p className="mt-3 text-sm text-muted">Pay once. Keep Premium forever, including future map updates. No subscription.</p>
        <ul className="mt-8 space-y-3">
          {included.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-fg/90">
              <Check className="mt-0.5 size-4 shrink-0 text-neon" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-9">
          {cta ?? (
            <ButtonLink href="/premium" size="lg" className="w-full">
              Get lifetime access — $10
            </ButtonLink>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-subtle">
          <ShieldCheck className="size-3.5" aria-hidden /> Secure checkout by Stripe. We never store card details.
        </p>
      </div>
    </div>
  );
}
