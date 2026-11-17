import type { Metadata } from "next";
import { PaymentStatus } from "@/components/premium/payment-status";

export const metadata: Metadata = { title: "Confirming payment", robots: { index: false } };

/**
 * Landing page after checkout. It never grants access — it only reflects
 * what the signed webhook has recorded on the server.
 */
export default function PremiumSuccessPage() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-lg items-center px-4 py-20">
      <PaymentStatus />
    </div>
  );
}
