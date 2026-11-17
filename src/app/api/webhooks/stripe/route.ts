import { NextResponse } from "next/server";
import { LIFETIME_PRODUCT } from "@/lib/entitlements";
import { getPaymentProvider } from "@/lib/payments";
import { handlePaymentEvent } from "@/lib/payments/fulfillment";
import { createSupabasePaymentStore } from "@/lib/payments/supabase-store";
import { WebhookVerificationError } from "@/lib/payments/types";

/**
 * Stripe webhook endpoint. The ONLY place where lifetime access is granted.
 * 1. Verify the signature against the raw body.
 * 2. Normalise + validate the event against the stored purchase and price.
 * 3. Fulfil atomically and idempotently in the database.
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider || provider.id !== "stripe") {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = await provider.parseWebhook(rawBody, request.headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.warn("[webhook/stripe] signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    throw err;
  }

  try {
    const result = await handlePaymentEvent(event, createSupabasePaymentStore(), LIFETIME_PRODUCT);
    if (result.outcome.startsWith("rejected")) {
      console.error(`[webhook/stripe] ${event.eventId} ${event.eventType}: ${result.outcome}`);
    }
    return NextResponse.json({ received: true, outcome: result.outcome }, { status: result.httpStatus });
  } catch (err) {
    // 5xx makes Stripe retry; the event was not recorded because the SQL transaction rolled back.
    console.error(`[webhook/stripe] processing failed for ${event.eventId}`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
