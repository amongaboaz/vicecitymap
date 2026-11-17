import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 17, 2026">
      <section>
        <h2>Independent fan project</h2>
        <p>{site.disclaimer}</p>
      </section>
      <section>
        <h2>The service</h2>
        <p>
          {site.name} provides an interactive map of discoveries. Content is community-sourced and labelled with a verification status. Until
          verified information is available, the map uses an original placeholder map and demonstration data that does not represent the game.
          We do not guarantee that any information is complete or accurate.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>You are responsible for keeping your login credentials secure. One account per person. We may suspend accounts used for abuse, scraping or fraud.</p>
      </section>
      <section>
        <h2>Premium lifetime access</h2>
        <ul>
          <li>Premium is a one-time purchase of USD 10.00. It is not a subscription and does not renew.</li>
          <li>“Lifetime” means for as long as {site.name} is operated, including future map and database updates we publish.</li>
          <li>Access is granted to the purchasing account once the payment provider confirms payment, and is non-transferable.</li>
          <li>Refund requests made within 14 days of purchase will be reviewed. Refunded purchases remove Premium access.</li>
        </ul>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not attempt to bypass access controls, scrape the database, or interfere with the service.</li>
          <li>Do not submit content you do not have the right to share.</li>
        </ul>
      </section>
      <section>
        <h2>Intellectual property</h2>
        <p>
          The {site.name} software, placeholder map artwork and original text are ours. Game names and trademarks belong to their respective owners
          and are used for identification only. Rights holders may contact {site.contactEmail} with any concerns.
        </p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>The service is provided “as is”. To the extent permitted by law, our total liability is limited to the amount you paid us.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about these terms: {site.contactEmail}.</p>
      </section>
    </LegalPage>
  );
}
