/**
 * Provider-agnostic payment contracts. Add a provider (e.g. M-Pesa) by
 * implementing `PaymentProvider` and registering it in `./index.ts`.
 * Access is NEVER granted from a redirect — only from a verified webhook
 * event normalised into `NormalizedPaymentEvent`.
 */

export type ProviderId = "stripe" | "mpesa";

export type Product = {
  code: string;
  name: string;
  amountCents: number;
  currency: string;
};

export type CheckoutRequest = {
  purchaseId: string;
  userId: string;
  email: string | null;
  product: Product;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  /** Provider's id for the checkout (e.g. Stripe Checkout Session id). */
  providerReference: string;
  redirectUrl: string;
};

type EventBase = { provider: ProviderId; eventId: string; eventType: string };

export type NormalizedPaymentEvent =
  | (EventBase & {
      kind: "payment_succeeded";
      purchaseId: string | null;
      userId: string | null;
      providerReference: string;
      providerPaymentId: string | null;
      productCode: string | null;
      amountCents: number | null;
      currency: string | null;
    })
  | (EventBase & { kind: "payment_failed"; purchaseId: string | null; reason: "failed" | "expired" })
  | (EventBase & { kind: "refunded"; providerPaymentId: string | null })
  | (EventBase & { kind: "ignored"; reason: string });

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export interface PaymentProvider {
  readonly id: ProviderId;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Verifies the signature and normalises the event. Throws WebhookVerificationError if invalid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<NormalizedPaymentEvent>;
}
