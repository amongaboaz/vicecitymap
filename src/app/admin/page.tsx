import Link from "next/link";
import { requireAdmin } from "@/lib/auth/viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DataTable, PageHeader, StatCard, Td } from "@/components/admin/table";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = (await createSupabaseServerClient())!;

  const [profiles, paid, published, drafts, premium, events, members] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("purchases").select("amount_cents, currency").eq("status", "paid"),
    supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("is_published", false),
    supabase.from("discoveries").select("id", { count: "exact", head: true }).eq("access_level", "premium"),
    supabase.from("payment_events").select("id, event_type, outcome, detail, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("entitlements").select("id", { count: "exact", head: true }).is("revoked_at", null),
  ]);

  const revenueCents = (paid.data ?? []).reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <>
      <PageHeader title="Overview">
        <ButtonLink href="/admin/discoveries/new" size="sm">
          New discovery
        </ButtonLink>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={profiles.count ?? 0} />
        <StatCard label="Lifetime members" value={members.count ?? 0} />
        <StatCard label="Gross revenue" value={formatCurrency(revenueCents)} hint={`${paid.data?.length ?? 0} paid purchases · before provider fees`} />
        <StatCard label="Discoveries" value={published.count ?? 0} hint={`${drafts.count ?? 0} drafts · ${premium.count ?? 0} premium`} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold">Recent payment events</h2>
      {events.data?.length ? (
        <DataTable caption="Recent payment webhook events" head={["Event", "Outcome", "Detail", "Received"]}>
          {events.data.map((e) => (
            <tr key={e.id}>
              <Td className="font-mono text-xs">{e.event_type}</Td>
              <Td>
                <Badge tone={e.outcome === "fulfilled" ? "neon" : e.outcome === "rejected" ? "danger" : "neutral"}>{e.outcome}</Badge>
              </Td>
              <Td className="text-xs text-muted">{e.detail ?? "—"}</Td>
              <Td className="text-xs text-muted">{formatDateTime(e.created_at)}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No payment events yet">
          Events appear once the Stripe webhook is configured. See <Link href="/admin/purchases" className="underline">Purchases</Link>.
        </EmptyState>
      )}
    </>
  );
}
