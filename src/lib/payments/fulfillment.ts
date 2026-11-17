/**
 * Webhook fulfilment logic — pure orchestration over a `PaymentStore`, so it
 * can be unit tested without a database. The Supabase store executes the
 * same steps atomically inside SQL functions.
 */
import type { NormalizedPaymentEvent, Product, ProviderId } from "./types";

export type PurchaseRecord = {
  id: string;
  user_id: string;
  provider: string;
  provider_reference: string | null;
  product_code: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
};

export type FulfillInput = {
  provider: ProviderId;
  eventId: string;
  eventType: string;
  purchaseId: string;
  userId: string;
  providerReference: string;
  providerPaymentId: string | null;
  productCode: string;
  amountCents: number;
  currency: string;
};

export type RecordInput = {
  provider: ProviderId;
  eventId: string;
  eventType: string;
  purchaseId: string | null;
  outcome: "ignored" | "rejected" | "failed" | "expired";
  detail: string | null;
};

export interface PaymentStore {
  getPurchase(purchaseId: string): Promise<PurchaseRecord | null>;
  /** Atomically: record event (idempotent), mark purchase paid, grant entitlement. */
  fulfill(input: FulfillInput): Promise<"fulfilled" | "already_paid" | "already_refunded" | "duplicate_event">;
  /** Atomically: record event, mark purchase refunded, revoke entitlement. */
  refund(input: { provider: ProviderId; eventId: string; eventType: string; providerPaymentId: string }): Promise<
    "refunded" | "not_found" | "duplicate_event"
  >;
  record(input: RecordInput): Promise<"recorded" | "duplicate_event">;
}

export type FulfillmentResult = {
  outcome: string;
  /** HTTP status to return to the provider. 2xx acknowledges; 5xx asks for a retry. */
  httpStatus: 200 | 500;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a successful payment event against the stored purchase and the product price. */
export function validateSuccessfulPayment(
  event: Extract<NormalizedPaymentEvent, { kind: "payment_succeeded" }>,
  purchase: PurchaseRecord | null,
  product: Product,
): { ok: true } | { ok: false; reason: string } {
  if (!event.purchaseId || !UUID.test(event.purchaseId)) return { ok: false, reason: "missing or invalid purchase reference" };
  if (!purchase) return { ok: false, reason: "purchase not found" };
  if (!event.userId || event.userId !== purchase.user_id) return { ok: false, reason: "user mismatch" };
  if (purchase.provider !== event.provider) return { ok: false, reason: "provider mismatch" };
  if (purchase.provider_reference && purchase.provider_reference !== event.providerReference) {
    return { ok: false, reason: "provider reference mismatch" };
  }
  if (event.productCode !== product.code || purchase.product_code !== product.code) {
    return { ok: false, reason: "product mismatch" };
  }
  if (event.amountCents !== product.amountCents || purchase.amount_cents !== product.amountCents) {
    return { ok: false, reason: `amount mismatch (got ${event.amountCents})` };
  }
  if (event.currency?.toLowerCase() !== product.currency || purchase.currency !== product.currency) {
    return { ok: false, reason: `currency mismatch (got ${event.currency})` };
  }
  return { ok: true };
}

export async function handlePaymentEvent(
  event: NormalizedPaymentEvent,
  store: PaymentStore,
  product: Product,
): Promise<FulfillmentResult> {
  const base = { provider: event.provider, eventId: event.eventId, eventType: event.eventType };

  switch (event.kind) {
    case "payment_succeeded": {
      const purchase = event.purchaseId && UUID.test(event.purchaseId) ? await store.getPurchase(event.purchaseId) : null;
      const check = validateSuccessfulPayment(event, purchase, product);
      if (!check.ok) {
        // Acknowledge (a retry cannot fix a mismatch) but keep an audit record for review.
        const outcome = await store.record({ ...base, purchaseId: purchase?.id ?? null, outcome: "rejected", detail: check.reason });
        return { outcome: outcome === "duplicate_event" ? "duplicate_event" : `rejected: ${check.reason}`, httpStatus: 200 };
      }
      const outcome = await store.fulfill({
        ...base,
        purchaseId: purchase!.id,
        userId: purchase!.user_id,
        providerReference: event.providerReference,
        providerPaymentId: event.providerPaymentId,
        productCode: product.code,
        amountCents: product.amountCents,
        currency: product.currency,
      });
      return { outcome, httpStatus: 200 };
    }
    case "payment_failed": {
      const purchaseId = event.purchaseId && UUID.test(event.purchaseId) ? event.purchaseId : null;
      const outcome = await store.record({ ...base, purchaseId, outcome: event.reason, detail: null });
      return { outcome, httpStatus: 200 };
    }
    case "refunded": {
      if (!event.providerPaymentId) {
        const outcome = await store.record({ ...base, purchaseId: null, outcome: "ignored", detail: "refund without payment id" });
        return { outcome, httpStatus: 200 };
      }
      const outcome = await store.refund({ ...base, providerPaymentId: event.providerPaymentId });
      return { outcome, httpStatus: 200 };
    }
    case "ignored": {
      const outcome = await store.record({ ...base, purchaseId: null, outcome: "ignored", detail: event.reason });
      return { outcome, httpStatus: 200 };
    }
  }
}
