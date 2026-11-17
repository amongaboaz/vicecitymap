import { beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { LIFETIME_PRODUCT } from "@/lib/entitlements";
import { handlePaymentEvent, type PaymentStore, type PurchaseRecord } from "@/lib/payments/fulfillment";
import { normalizeStripeEvent, StripePaymentProvider } from "@/lib/payments/stripe";
import { WebhookVerificationError, type NormalizedPaymentEvent } from "@/lib/payments/types";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";
const PURCHASE = "33333333-3333-4333-8333-333333333333";

/** In-memory store with the same semantics as the SQL functions (idempotent on event id). */
class MemoryStore implements PaymentStore {
  events = new Map<string, string>();
  purchases = new Map<string, PurchaseRecord & { provider_payment_id: string | null }>();
  entitlements = new Map<string, { purchaseId: string; revoked: boolean }>();

  async getPurchase(id: string) {
    return this.purchases.get(id) ?? null;
  }
  async fulfill(i: Parameters<PaymentStore["fulfill"]>[0]) {
    if (this.events.has(i.eventId)) return "duplicate_event" as const;
    this.events.set(i.eventId, "fulfilled");
    const p = this.purchases.get(i.purchaseId)!;
    if (p.status === "paid") return "already_paid" as const;
    if (p.status === "refunded") return "already_refunded" as const;
    p.status = "paid";
    p.provider_reference ??= i.providerReference;
    p.provider_payment_id = i.providerPaymentId;
    this.entitlements.set(`${i.userId}:${i.productCode}`, { purchaseId: p.id, revoked: false });
    return "fulfilled" as const;
  }
  async refund(i: Parameters<PaymentStore["refund"]>[0]) {
    if (this.events.has(i.eventId)) return "duplicate_event" as const;
    this.events.set(i.eventId, "refunded");
    const p = [...this.purchases.values()].find((x) => x.provider_payment_id === i.providerPaymentId);
    if (!p) return "not_found" as const;
    p.status = "refunded";
    for (const e of this.entitlements.values()) if (e.purchaseId === p.id) e.revoked = true;
    return "refunded" as const;
  }
  async record(i: Parameters<PaymentStore["record"]>[0]) {
    if (this.events.has(i.eventId)) return "duplicate_event" as const;
    this.events.set(i.eventId, i.outcome);
    if (i.purchaseId && (i.outcome === "failed" || i.outcome === "expired")) {
      const p = this.purchases.get(i.purchaseId);
      if (p?.status === "pending") p.status = i.outcome;
    }
    return "recorded" as const;
  }
  hasAccess(userId: string) {
    const e = this.entitlements.get(`${userId}:lifetime`);
    return Boolean(e && !e.revoked);
  }
}

function paid(overrides: Partial<Extract<NormalizedPaymentEvent, { kind: "payment_succeeded" }>> = {}): NormalizedPaymentEvent {
  return {
    kind: "payment_succeeded",
    provider: "stripe",
    eventId: "evt_1",
    eventType: "checkout.session.completed",
    purchaseId: PURCHASE,
    userId: USER,
    providerReference: "cs_test_1",
    providerPaymentId: "pi_1",
    productCode: "lifetime",
    amountCents: 1000,
    currency: "usd",
    ...overrides,
  };
}

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  store.purchases.set(PURCHASE, {
    id: PURCHASE,
    user_id: USER,
    provider: "stripe",
    provider_reference: "cs_test_1",
    provider_payment_id: null,
    product_code: "lifetime",
    amount_cents: 1000,
    currency: "usd",
    status: "pending",
  });
});

describe("handlePaymentEvent — fulfilment", () => {
  it("grants lifetime access for a valid, verified payment", async () => {
    const r = await handlePaymentEvent(paid(), store, LIFETIME_PRODUCT);
    expect(r).toEqual({ outcome: "fulfilled", httpStatus: 200 });
    expect(store.hasAccess(USER)).toBe(true);
    expect(store.purchases.get(PURCHASE)!.status).toBe("paid");
  });

  it("is idempotent: replaying the same event does nothing", async () => {
    await handlePaymentEvent(paid(), store, LIFETIME_PRODUCT);
    const r = await handlePaymentEvent(paid(), store, LIFETIME_PRODUCT);
    expect(r.outcome).toBe("duplicate_event");
    expect(store.entitlements.size).toBe(1);
  });

  it("does not double-grant on a second, different success event", async () => {
    await handlePaymentEvent(paid(), store, LIFETIME_PRODUCT);
    const r = await handlePaymentEvent(paid({ eventId: "evt_2", eventType: "checkout.session.async_payment_succeeded" }), store, LIFETIME_PRODUCT);
    expect(r.outcome).toBe("already_paid");
  });

  it.each([
    ["wrong amount", { amountCents: 100 }],
    ["wrong currency", { currency: "eur" }],
    ["wrong product", { productCode: "other" }],
    ["another user's purchase", { userId: OTHER_USER }],
    ["missing user", { userId: null }],
    ["mismatched checkout reference", { providerReference: "cs_test_forged" }],
    ["unknown purchase", { purchaseId: "44444444-4444-4444-8444-444444444444" }],
    ["malformed purchase id", { purchaseId: "not-a-uuid" }],
  ])("rejects %s without granting access", async (_label, overrides) => {
    const r = await handlePaymentEvent(paid(overrides), store, LIFETIME_PRODUCT);
    expect(r.outcome).toMatch(/^rejected/);
    expect(r.httpStatus).toBe(200);
    expect(store.hasAccess(USER)).toBe(false);
    expect(store.hasAccess(OTHER_USER)).toBe(false);
    expect(store.purchases.get(PURCHASE)!.status).toBe("pending");
  });

  it("revokes access on a full refund", async () => {
    await handlePaymentEvent(paid(), store, LIFETIME_PRODUCT);
    const r = await handlePaymentEvent(
      { kind: "refunded", provider: "stripe", eventId: "evt_r", eventType: "charge.refunded", providerPaymentId: "pi_1" },
      store,
      LIFETIME_PRODUCT,
    );
    expect(r.outcome).toBe("refunded");
    expect(store.hasAccess(USER)).toBe(false);
    expect(store.purchases.get(PURCHASE)!.status).toBe("refunded");
  });

  it("marks expired checkouts without granting access", async () => {
    const r = await handlePaymentEvent(
      { kind: "payment_failed", provider: "stripe", eventId: "evt_x", eventType: "checkout.session.expired", purchaseId: PURCHASE, reason: "expired" },
      store,
      LIFETIME_PRODUCT,
    );
    expect(r.outcome).toBe("recorded");
    expect(store.purchases.get(PURCHASE)!.status).toBe("expired");
    expect(store.hasAccess(USER)).toBe(false);
  });
});

// ── Stripe normalisation + signature verification ─────────────────────
function session(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: "cs_test_1",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    amount_total: 1000,
    currency: "usd",
    client_reference_id: USER,
    payment_intent: "pi_1",
    metadata: { purchase_id: PURCHASE, user_id: USER, product_code: "lifetime" },
    ...overrides,
  } as Stripe.Checkout.Session;
}
function event(type: string, object: unknown, id = "evt_s"): Stripe.Event {
  return { id, object: "event", type, data: { object } } as unknown as Stripe.Event;
}

describe("normalizeStripeEvent", () => {
  it("normalises a paid checkout session", () => {
    expect(normalizeStripeEvent(event("checkout.session.completed", session()))).toMatchObject({
      kind: "payment_succeeded",
      purchaseId: PURCHASE,
      userId: USER,
      amountCents: 1000,
      currency: "usd",
      providerReference: "cs_test_1",
      providerPaymentId: "pi_1",
    });
  });
  it("ignores completed-but-unpaid sessions (async methods)", () => {
    expect(normalizeStripeEvent(event("checkout.session.completed", session({ payment_status: "unpaid" }))).kind).toBe("ignored");
  });
  it("ignores subscription-mode sessions", () => {
    expect(normalizeStripeEvent(event("checkout.session.completed", session({ mode: "subscription" }))).kind).toBe("ignored");
  });
  it("drops the user id when client_reference_id disagrees with metadata", () => {
    const n = normalizeStripeEvent(event("checkout.session.completed", session({ client_reference_id: OTHER_USER })));
    expect(n.kind === "payment_succeeded" && n.userId).toBeNull();
  });
  it("ignores partial refunds", () => {
    expect(normalizeStripeEvent(event("charge.refunded", { refunded: false, payment_intent: "pi_1" })).kind).toBe("ignored");
  });
});

describe("StripePaymentProvider.parseWebhook", () => {
  const secret = "whsec_test_secret";
  const provider = new StripePaymentProvider({ secretKey: "sk_test_dummy", webhookSecret: secret });
  const stripe = new Stripe("sk_test_dummy");
  const payload = JSON.stringify(event("checkout.session.completed", session()));

  it("accepts a correctly signed payload", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const n = await provider.parseWebhook(payload, new Headers({ "stripe-signature": header }));
    expect(n.kind).toBe("payment_succeeded");
  });

  it("rejects a payload signed with a different secret", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_attacker" });
    await expect(provider.parseWebhook(payload, new Headers({ "stripe-signature": header }))).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects a tampered payload", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const tampered = payload.replace('"amount_total":1000', '"amount_total":1');
    await expect(provider.parseWebhook(tampered, new Headers({ "stripe-signature": header }))).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects a missing signature header", async () => {
    await expect(provider.parseWebhook(payload, new Headers())).rejects.toBeInstanceOf(WebhookVerificationError);
  });
});
