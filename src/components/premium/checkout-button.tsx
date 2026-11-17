"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

export function CheckoutButton({ signedIn, disabledReason }: { signedIn: boolean; disabledReason?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!signedIn) {
      router.push("/login?next=/premium");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 401) return router.push("/login?next=/premium");
      if (!res.ok || !body.url) throw new Error(body.error ?? "Could not start checkout.");
      window.location.assign(body.url);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={start} disabled={pending || Boolean(disabledReason)}>
        {pending ? <Loader2 className="animate-spin" /> : <Lock />}
        {signedIn ? "Pay $10 once — unlock for life" : "Sign in to upgrade — $10"}
      </Button>
      {disabledReason ? <Alert tone="ember">{disabledReason}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
