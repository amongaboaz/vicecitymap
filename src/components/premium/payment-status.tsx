"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";

type Phase = "checking" | "confirmed" | "pending";

/** Polls the server for the entitlement written by the verified webhook. Never grants access itself. */
export function PaymentStatus() {
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const me = (await res.json()) as { isPremium?: boolean };
        if (cancelled) return;
        if (me.isPremium) return setPhase("confirmed");
      } catch {
        /* keep polling */
      }
      if (cancelled) return;
      if (attempts >= 30) return setPhase("pending");
      timer = setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <Card className="w-full p-10 text-center" aria-live="polite">
      {phase === "confirmed" ? (
        <>
          <CheckCircle2 className="mx-auto size-10 text-neon" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Welcome to Premium</h1>
          <p className="mt-2 text-sm text-muted">Your payment is confirmed and lifetime access is active on your account.</p>
          <div className="mt-8 flex justify-center gap-3">
            <ButtonLink href="/map">Open the map</ButtonLink>
            <ButtonLink href="/dashboard" variant="outline">
              Dashboard
            </ButtonLink>
          </div>
        </>
      ) : phase === "pending" ? (
        <>
          <Clock className="mx-auto size-10 text-ember" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Payment still processing</h1>
          <p className="mt-2 text-sm text-muted">
            We haven&apos;t received confirmation from the payment provider yet. Some payment methods take longer — access
            activates automatically once payment is confirmed. You can safely leave this page.
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/dashboard" variant="outline">
              Go to dashboard
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="mx-auto size-10 animate-spin text-neon" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Confirming your payment…</h1>
          <p className="mt-2 text-sm text-muted">This usually takes a few seconds.</p>
        </>
      )}
    </Card>
  );
}
