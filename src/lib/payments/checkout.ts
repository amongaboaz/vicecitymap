import "server-only";
import { publicEnv } from "@/lib/env";
import { checkoutEligibility, LIFETIME_PRODUCT, type Viewer } from "@/lib/entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "./index";

export type StartCheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; status: number; error: string };

/**
 * Creates a pending purchase row and a provider checkout session for it.
 * The purchase stays `pending` until a verified webhook fulfils it.
 */
export async function startLifetimeCheckout(viewer: Viewer): Promise<StartCheckoutResult> {
  const provider = getPaymentProvider();
  const eligibility = checkoutEligibility(viewer, provider !== null);
  if (!eligibility.ok) {
    switch (eligibility.reason) {
      case "not_signed_in":
        return { ok: false, status: 401, error: "Please sign in to upgrade." };
      case "already_member":
        return { ok: false, status: 409, error: "You already have lifetime access." };
      case "payments_unavailable":
        return { ok: false, status: 503, error: "Payments are not available yet. Please try again later." };
    }
  }

  const db = createSupabaseAdminClient();
  const { data: purchase, error } = await db
    .from("purchases")
    .insert({
      user_id: viewer.userId!,
      provider: provider!.id,
      product_code: LIFETIME_PRODUCT.code,
      amount_cents: LIFETIME_PRODUCT.amountCents,
      currency: LIFETIME_PRODUCT.currency,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !purchase) {
    console.error("[checkout] failed to create purchase", error);
    return { ok: false, status: 500, error: "Could not start checkout. Please try again." };
  }

  try {
    const session = await provider!.createCheckout({
      purchaseId: purchase.id,
      userId: viewer.userId!,
      email: viewer.email,
      product: LIFETIME_PRODUCT,
      successUrl: `${publicEnv.siteUrl}/premium/success`,
      cancelUrl: `${publicEnv.siteUrl}/premium?checkout=cancelled`,
    });
    await db.from("purchases").update({ provider_reference: session.providerReference }).eq("id", purchase.id);
    return { ok: true, redirectUrl: session.redirectUrl };
  } catch (err) {
    console.error("[checkout] provider error", err);
    await db.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
    return { ok: false, status: 502, error: "The payment provider is unavailable. Please try again shortly." };
  }
}
