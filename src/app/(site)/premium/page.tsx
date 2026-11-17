import type { Metadata } from "next";
import { CheckCircle2, Crown, Infinity as InfinityIcon, Receipt, ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";
import { paymentConfigStatus } from "@/lib/payments";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, SectionHeading } from "@/components/ui/primitives";
import { PricingCard } from "@/components/home/pricing-card";
import { PlanComparison } from "@/components/home/plan-comparison";
import { Faq } from "@/components/home/faq";
import { CheckoutButton } from "@/components/premium/checkout-button";

export const metadata: Metadata = {
  title: "Premium — $10 Lifetime Access",
  description:
    "Unlock the full ViceCityMap discovery database, hidden discoveries, progress tracking and saved locations with a one-time $10 payment. No subscription.",
  alternates: { canonical: "/premium" },
};

const promises = [
  { icon: InfinityIcon, title: "Lifetime, for real", body: "One payment. No renewals, no subscription, no hidden upsell tier." },
  { icon: Receipt, title: "Future updates included", body: "Every map and database update we ship is included with your membership." },
  { icon: ShieldCheck, title: "Secure by design", body: "Stripe processes your card. Access is granted only after Stripe confirms payment to our server." },
];

export default async function PremiumPage({ searchParams }: PageProps<"/premium">) {
  const [{ checkout }, viewer] = await Promise.all([searchParams, getViewer()]);
  const payments = paymentConfigStatus();

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_25%,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
          <div>
            <Badge tone="neon">
              <Crown /> ViceCityMap Premium
            </Badge>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Unlock the whole map. <span className="text-neon">Pay once.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              $10 gets you the full verified discovery database, hidden discoveries, progress tracking and saved locations — plus
              every future update, for the lifetime of the project.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {promises.map((p) => (
                <div key={p.title} className="rounded-xl border border-line bg-ink-900/60 p-4">
                  <p.icon className="size-4 text-neon" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-fg">{p.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            {checkout === "cancelled" ? (
              <Alert tone="ember" className="mb-4">
                Checkout was cancelled — you have not been charged.
              </Alert>
            ) : null}
            {viewer.isPremium ? (
              <div className="rounded-3xl border border-neon/30 bg-ink-900 p-10 text-center">
                <CheckCircle2 className="mx-auto size-10 text-neon" aria-hidden />
                <h2 className="mt-4 text-2xl font-semibold">You have lifetime access</h2>
                <p className="mt-2 text-sm text-muted">Thanks for supporting ViceCityMap. Everything is unlocked.</p>
                <div className="mt-8 flex justify-center gap-3">
                  <ButtonLink href="/map">Open the map</ButtonLink>
                  <ButtonLink href="/dashboard" variant="outline">
                    Dashboard
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <PricingCard
                cta={
                  <CheckoutButton
                    signedIn={Boolean(viewer.userId)}
                    disabledReason={payments.configured ? undefined : "Checkout is not available yet on this deployment. Please check back soon."}
                  />
                }
              />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Compare" title="Free vs Premium" align="center" />
        <div className="mt-10">
          <PlanComparison />
        </div>
        <p className="mt-6 text-center text-xs text-subtle">
          Premium unlocks content as it is verified. Until real game information is confirmed, the map uses an original placeholder
          map and clearly labelled demonstration data.
        </p>
      </section>

      <section className="border-t border-line bg-ink-900/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Before you buy" align="center" />
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>
    </>
  );
}
