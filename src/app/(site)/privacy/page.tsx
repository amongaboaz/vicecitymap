import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 17, 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          {site.name} is an independent fan project providing an interactive discovery map. This policy explains what personal data we
          process when you use the site and why.
        </p>
      </section>
      <section>
        <h2>Data we collect</h2>
        <ul>
          <li>Account data: your email address, display name and a hashed password (managed by our authentication provider, Supabase).</li>
          <li>Usage data you create: discoveries you mark found or completed, and locations you save.</li>
          <li>Purchase records: amount, currency, status, dates and the payment provider&apos;s transaction reference.</li>
          <li>Basic technical logs (IP address, user agent) used for security, abuse prevention and rate limiting.</li>
        </ul>
      </section>
      <section>
        <h2>Payments</h2>
        <p>
          Payments are processed by Stripe. We never receive or store your full card number, CVC or other card details. Stripe&apos;s own privacy
          policy applies to the data you provide during checkout.
        </p>
      </section>
      <section>
        <h2>How we use data</h2>
        <ul>
          <li>To provide the map, your account, progress tracking and saved locations.</li>
          <li>To verify payments and maintain your lifetime entitlement.</li>
          <li>To keep the service secure and prevent fraud and abuse.</li>
        </ul>
        <p className="mt-3">We do not sell your personal data and we do not use third-party advertising trackers.</p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>We use strictly necessary cookies to keep you signed in. No marketing cookies are set.</p>
      </section>
      <section>
        <h2>Retention and your rights</h2>
        <p>
          We keep account data while your account exists. Purchase records are retained as required for accounting and tax purposes. You can
          request access to, correction of, or deletion of your data by contacting {site.contactEmail}.
        </p>
      </section>
      <section>
        <h2>Processors</h2>
        <ul>
          <li>Supabase — database, authentication and file storage.</li>
          <li>Stripe — payment processing.</li>
          <li>Vercel — hosting.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
