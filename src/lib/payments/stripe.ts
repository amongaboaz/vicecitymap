import Stripe from "stripe";
import {
  WebhookVerificationError,
  type CheckoutRequest,
  type CheckoutSession,
  type NormalizedPaymentEvent,
  type PaymentProvider,
} from "./types";

export type StripeProviderConfig = {
  secretKey: string;
  webhookSecret: string;
  priceId?: string;
};

function paymentIntentId(value: string | Stripe.PaymentIntent | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Normalises a *verified* Stripe event into the provider-agnostic shape. Exported for tests. */
export function normalizeStripeEvent(event: Stripe.Event): NormalizedPaymentEvent {
  const base = { provider: "stripe" as const, eventId: event.id, eventType: event.type };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "payment") return { ...base, kind: "ignored", reason: `unsupported mode ${session.mode}` };
      if (session.payment_status !== "paid") {
        // Delayed payment methods complete later via async_payment_succeeded.
        return { ...base, kind: "ignored", reason: `payment_status ${session.payment_status}` };
      }
      const metadata = session.metadata ?? {};
      const userId = metadata.user_id ?? null;
      return {
        ...base,
        kind: "payment_succeeded",
        purchaseId: metadata.purchase_id ?? null,
        // Both identifiers are set by our server at session creation and must agree.
        userId: userId && session.client_reference_id === userId ? userId : null,
        providerReference: session.id,
        providerPaymentId: paymentIntentId(session.payment_intent),
        productCode: metadata.product_code ?? null,
        amountCents: session.amount_total,
        currency: session.currency,
      };
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return { ...base, kind: "payment_failed", purchaseId: session.metadata?.purchase_id ?? null, reason: "failed" };
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      return { ...base, kind: "payment_failed", purchaseId: session.metadata?.purchase_id ?? null, reason: "expired" };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (!charge.refunded) return { ...base, kind: "ignored", reason: "partial refund" };
      return { ...base, kind: "refunded", providerPaymentId: paymentIntentId(charge.payment_intent) };
    }
    default:
      return { ...base, kind: "ignored", reason: "unhandled event type" };
  }
}

export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  private readonly stripe: Stripe;

  constructor(private readonly config: StripeProviderConfig) {
    this.stripe = new Stripe(config.secretKey, {
      appInfo: { name: "ViceCityMap" },
      maxNetworkRetries: 2,
    });
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const { product } = request;
    const metadata = { purchase_id: request.purchaseId, user_id: request.userId, product_code: product.code };

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = this.config.priceId
      ? { price: this.config.priceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: product.currency,
            unit_amount: product.amountCents,
            product_data: {
              name: product.name,
              description: "One-time payment. Lifetime access to ViceCityMap Premium, including future map updates.",
            },
          },
        };

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [lineItem],
        client_reference_id: request.userId,
        customer_email: request.email ?? undefined,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${request.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: request.cancelUrl,
      },
      { idempotencyKey: `checkout:${request.purchaseId}` },
    );

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { providerReference: session.id, redirectUrl: session.url };
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<NormalizedPaymentEvent> {
    const signature = headers.get("stripe-signature");
    if (!signature) throw new WebhookVerificationError("Missing stripe-signature header");
    let event: Stripe.Event;
    try {
      event = await this.stripe.webhooks.constructEventAsync(rawBody, signature, this.config.webhookSecret);
    } catch (err) {
      throw new WebhookVerificationError(err instanceof Error ? err.message : "Invalid signature");
    }
    return normalizeStripeEvent(event);
  }
}
