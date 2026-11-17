import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentStore } from "./fulfillment";

/** PaymentStore backed by Supabase SQL functions (atomic, idempotent). Service role only. */
export function createSupabasePaymentStore(): PaymentStore {
  const db = createSupabaseAdminClient();

  return {
    async getPurchase(purchaseId) {
      const { data, error } = await db
        .from("purchases")
        .select("id, user_id, provider, provider_reference, product_code, amount_cents, currency, status")
        .eq("id", purchaseId)
        .maybeSingle();
      if (error) throw new Error(`getPurchase failed: ${error.message}`);
      return data;
    },

    async fulfill(input) {
      const { data, error } = await db.rpc("fulfill_purchase", {
        p_provider: input.provider,
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_purchase_id: input.purchaseId,
        p_user_id: input.userId,
        p_provider_reference: input.providerReference,
        p_provider_payment_id: input.providerPaymentId,
        p_product_code: input.productCode,
        p_amount_cents: input.amountCents,
        p_currency: input.currency,
      });
      if (error) throw new Error(`fulfill_purchase failed: ${error.message}`);
      return data as Awaited<ReturnType<PaymentStore["fulfill"]>>;
    },

    async refund(input) {
      const { data, error } = await db.rpc("refund_purchase", {
        p_provider: input.provider,
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_provider_payment_id: input.providerPaymentId,
      });
      if (error) throw new Error(`refund_purchase failed: ${error.message}`);
      return data as Awaited<ReturnType<PaymentStore["refund"]>>;
    },

    async record(input) {
      const { data, error } = await db.rpc("record_payment_event", {
        p_provider: input.provider,
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_purchase_id: input.purchaseId,
        p_outcome: input.outcome,
        p_detail: input.detail,
      });
      if (error) throw new Error(`record_payment_event failed: ${error.message}`);
      return data as Awaited<ReturnType<PaymentStore["record"]>>;
    },
  };
}
