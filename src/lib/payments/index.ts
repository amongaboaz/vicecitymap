import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { isServiceRoleConfigured, serverEnv } from "@/lib/env.server";
import { StripePaymentProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export type PaymentConfigStatus =
  | { configured: true; provider: PaymentProvider["id"] }
  | { configured: false; missing: string[] };

/**
 * Explicit provider configuration. There is deliberately no "fake" or
 * "simulated" provider: if real credentials are missing, checkout is disabled.
 */
export function paymentConfigStatus(): PaymentConfigStatus {
  const missing: string[] = [];
  if (!isSupabaseConfigured) missing.push("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!isServiceRoleConfigured) missing.push("SUPABASE_SECRET_KEY");
  if (!serverEnv.paymentProvider) missing.push("PAYMENT_PROVIDER");
  if (serverEnv.paymentProvider === "stripe") {
    if (!serverEnv.stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
    if (!serverEnv.stripeWebhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
    if (serverEnv.isProduction && serverEnv.stripeSecretKey?.startsWith("sk_test_")) {
      console.warn("[payments] Running in production with a Stripe TEST key — no real charges will occur.");
    }
  }
  if (missing.length) return { configured: false, missing };
  return { configured: true, provider: serverEnv.paymentProvider! };
}

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider | null {
  const status = paymentConfigStatus();
  if (!status.configured) return null;
  if (cached) return cached;
  switch (status.provider) {
    case "stripe":
      cached = new StripePaymentProvider({
        secretKey: serverEnv.stripeSecretKey!,
        webhookSecret: serverEnv.stripeWebhookSecret!,
        priceId: serverEnv.stripePriceId,
      });
      return cached;
    default:
      return null;
  }
}
