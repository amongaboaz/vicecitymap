import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Boxes,
  Filter,
  Infinity as InfinityIcon,
  Layers,
  ListChecks,
  Search,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { MapPreview } from "@/components/home/map-preview";
import { PlanComparison } from "@/components/home/plan-comparison";
import { PricingCard } from "@/components/home/pricing-card";
import { Faq } from "@/components/home/faq";
import { demoCategories } from "@/lib/discoveries/demo";
import { faqs } from "@/lib/plans";
import { site } from "@/lib/site";

const features = [
  { icon: Search, title: "Instant search", body: "Find any discovery by name and fly straight to it. Results respect your access level." },
  { icon: Layers, title: "Smart clustering", body: "Thousands of markers stay readable. Clusters split apart as you zoom in." },
  { icon: Filter, title: "Precise filters", body: "Toggle categories, then go deeper with verification, found and saved filters on Premium." },
  { icon: BadgeCheck, title: "Verification first", body: "Every discovery carries a status — unverified, community or verified — so you know what to trust." },
  { icon: ListChecks, title: "Progress tracking", body: "Mark collectibles found and missions complete. Your completion stats live in your dashboard." },
  { icon: Bookmark, title: "Saved locations", body: "Pin the spots you care about and get back to them in one click, on any device." },
];

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      description: site.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "ViceCityMap Premium — Lifetime Access",
      description: "One-time $10 purchase for lifetime access to ViceCityMap Premium features and future map updates.",
      brand: { "@type": "Brand", name: site.name },
      offers: {
        "@type": "Offer",
        price: "10.00",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${site.url}/premium`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div aria-hidden className="absolute -top-40 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-neon/[0.07] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:pb-28 lg:pt-24">
          <div className="animate-fade-up">
            <div className="flex flex-wrap gap-2">
              <Badge tone="neon">
                <span className="size-1.5 rounded-full bg-neon" /> Independent fan project
              </Badge>
              <Badge>Unofficial · Not affiliated with Rockstar Games</Badge>
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Every discovery.
              <br />
              <span className="text-neon">One map.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              ViceCityMap is the independent interactive map for GTA 6 — locations, collectibles, missions, Easter eggs and
              hidden discoveries, added only as the community verifies them.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/map" size="lg">
                Open the map <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/premium" size="lg" variant="outline">
                Lifetime Premium — <span className="text-neon">$10</span>
              </ButtonLink>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="eyebrow">Categories</dt>
                <dd className="mt-1.5 text-2xl font-semibold text-fg">{demoCategories.length}</dd>
              </div>
              <div>
                <dt className="eyebrow">Price</dt>
                <dd className="mt-1.5 text-2xl font-semibold text-fg">$10 once</dd>
              </div>
              <div>
                <dt className="eyebrow">Free tier</dt>
                <dd className="mt-1.5 text-2xl font-semibold text-fg">Forever</dd>
              </div>
            </dl>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-ink-900 shadow-[var(--shadow-panel)]">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-white/10" />
                  <span className="size-2.5 rounded-full bg-white/10" />
                  <span className="size-2.5 rounded-full bg-white/10" />
                </div>
                <span className="font-mono text-[11px] text-subtle">vicecitymap / map</span>
                <span className="w-10" />
              </div>
              <div className="relative aspect-[4/3.4]">
                <MapPreview className="absolute inset-0" />
                <div className="absolute left-3 top-3 hidden w-44 space-y-1 rounded-xl border border-line bg-ink-950/80 p-2 backdrop-blur sm:block">
                  {demoCategories.slice(0, 6).map((c) => (
                    <div key={c.slug} className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted">
                      <span className="size-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-3 right-3 rounded-md border border-ember/30 bg-ink-950/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ember">
                  Original placeholder map · demo markers
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionHeading eyebrow="Built for explorers" title="A map that respects your time.">
          Fast where it matters: viewport-based loading, crisp clustering and controls that work as well on a phone as on a
          38-inch monitor.
        </SectionHeading>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-ink-950 p-7 transition-colors hover:bg-ink-900">
              <f.icon className="size-5 text-neon" aria-hidden />
              <h3 className="mt-5 text-[15px] font-semibold text-fg">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Honesty / verification ───────────────────────────── */}
      <section className="border-y border-line bg-ink-900/40">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <SectionHeading eyebrow="Our standard" title={<>No guesses dressed up as facts.</>}>
            We don’t invent coordinates or pass rumours off as discoveries. Until a verified, legally usable map source exists,
            ViceCityMap runs on an original placeholder map with clearly labelled demo markers. Real entries are published with
            a visible verification status.
          </SectionHeading>
          <div className="grid gap-3">
            {[
              { tone: "neutral" as const, label: "Unverified", body: "Reported, not yet confirmed. Shown with a caution label." },
              { tone: "ember" as const, label: "Community", body: "Confirmed by multiple community reports." },
              { tone: "neon" as const, label: "Verified", body: "Confirmed by our editors with supporting evidence." },
            ].map((s) => (
              <div key={s.label} className="flex items-start gap-4 rounded-xl border border-line bg-ink-950 p-5">
                <Badge tone={s.tone} className="mt-0.5 w-24 justify-center">
                  {s.label}
                </Badge>
                <p className="text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <SectionHeading eyebrow="Planned categories" title="Everything worth finding, organised.">
          These are the categories the map is built around. Content is added as it is confirmed — nothing here claims what is in
          the game.
        </SectionHeading>
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {demoCategories.map((c) => (
            <div key={c.slug} className="group rounded-xl border border-line bg-ink-900/60 p-5 transition-colors hover:border-line-strong">
              <div className="flex items-center justify-between">
                <span className="size-2.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 16px ${c.color}` }} />
                {c.is_premium ? <Badge tone="neon">Premium</Badge> : null}
              </div>
              <p className="mt-5 text-[15px] font-medium text-fg">{c.name}</p>
              <p className="mt-1 text-xs text-muted">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free vs Premium ──────────────────────────────────── */}
      <section id="pricing" className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <div>
            <SectionHeading eyebrow="Free vs Premium" title="Free to explore. $10 to unlock everything.">
              The public map stays free. Premium unlocks the full database and personal tools — paid once, yours for life.
            </SectionHeading>
            <div className="mt-10">
              <PlanComparison />
            </div>
          </div>
          <PricingCard className="lg:sticky lg:top-24" />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-line bg-ink-900/30">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="FAQ" title="Questions, answered.">
            Something else? Email {site.contactEmail}.
          </SectionHeading>
          <Faq />
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-line">
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-neon/[0.06] to-transparent" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <Boxes className="size-6 text-neon" aria-hidden />
          <h2 className="mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Start exploring now. Upgrade whenever you’re ready.
          </h2>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/map" size="lg">
              Open the map <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/premium" size="lg" variant="outline">
              <InfinityIcon /> Lifetime access — $10
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
