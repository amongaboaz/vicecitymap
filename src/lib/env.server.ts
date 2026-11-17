import "server-only";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type PaymentProviderId = "stripe";

const provider = clean(process.env.PAYMENT_PROVIDER)?.toLowerCase();

export const serverEnv = {
  supabaseSecretKey: clean(process.env.SUPABASE_SECRET_KEY) ?? clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  paymentProvider: (provider === "stripe" ? "stripe" : undefined) as PaymentProviderId | undefined,
  stripeSecretKey: clean(process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: clean(process.env.STRIPE_WEBHOOK_SECRET),
  stripePriceId: clean(process.env.STRIPE_PRICE_ID),
  isProduction: process.env.NODE_ENV === "production",
} as const;

export const isServiceRoleConfigured = Boolean(serverEnv.supabaseSecretKey);
