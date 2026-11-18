import { requireAdmin } from "@/lib/auth/viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DataTable, PageHeader, StatCard, Td } from "@/components/admin/table";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

const PAGE_SIZE = 50;

function revenueSince(rows: { amount_cents: number; paid_at: string | null }[], days: number) {
  const since = Date.now() - days * 24 * 3600 * 1000;
  return rows.filter((p) => p.paid_at && new Date(p.paid_at).getTime() >= since).reduce((n, p) => n + p.amount_cents, 0);
}

export default async function AdminPurchasesPage({ searchParams }: PageProps<"/admin/purchases">) {
  await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = (await createSupabaseServerClient())!;

  const [{ data: purchases, count }, { data: paid }, { count: refunded }] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, user_id, provider, provider_reference, amount_cents, currency, status, created_at, paid_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("purchases").select("amount_cents, paid_at").eq("status", "paid"),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "refunded"),
  ]);

  const revenue = (paid ?? []).reduce((n, p) => n + p.amount_cents, 0);
  const last30 = revenueSince(paid ?? [], 30);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Purchases & revenue" />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross revenue" value={formatCurrency(revenue)} hint="All time, before provider fees" />
        <StatCard label="Last 30 days" value={formatCurrency(last30)} />
        <StatCard label="Paid / refunded" value={`${paid?.length ?? 0} / ${refunded ?? 0}`} />
      </div>
      {purchases?.length ? (
        <DataTable caption="Purchases" head={["Created", "User", "Provider ref", "Amount", "Status", "Paid"]}>
          {purchases.map((p) => (
            <tr key={p.id}>
              <Td className="text-xs text-muted">{formatDateTime(p.created_at)}</Td>
              <Td className="font-mono text-[11px] text-muted">{p.user_id ? `${p.user_id.slice(0, 8)}…` : "deleted user"}</Td>
              <Td className="font-mono text-[11px] text-muted">
                {p.provider}:{p.provider_reference ? `${p.provider_reference.slice(0, 18)}…` : "—"}
              </Td>
              <Td className="font-mono">{formatCurrency(p.amount_cents, p.currency)}</Td>
              <Td>
                <Badge tone={p.status === "paid" ? "neon" : p.status === "refunded" ? "ember" : p.status === "failed" ? "danger" : "neutral"}>
                  {p.status}
                </Badge>
              </Td>
              <Td className="text-xs text-muted">{p.paid_at ? formatDateTime(p.paid_at) : "—"}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No purchases yet">Purchases appear here when users start checkout.</EmptyState>
      )}
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex justify-end gap-2">
          {page > 1 ? <ButtonLink href={`?page=${page - 1}`} size="sm" variant="outline">Previous</ButtonLink> : null}
          {page < pages ? <ButtonLink href={`?page=${page + 1}`} size="sm" variant="outline">Next</ButtonLink> : null}
        </nav>
      ) : null}
    </>
  );
}
