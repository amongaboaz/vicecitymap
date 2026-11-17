import Link from "next/link";
import { requireAdmin } from "@/lib/auth/viewer";
import { setDiscoveryFlags } from "@/lib/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { DataTable, PageHeader, Td } from "@/components/admin/table";
import { Alert, Badge, EmptyState, Input, Select } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";

const PAGE_SIZE = 50;

export default async function AdminDiscoveriesPage({ searchParams }: PageProps<"/admin/discoveries">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const status = typeof sp.status === "string" ? sp.status : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = (await createSupabaseServerClient())!;

  let query = supabase
    .from("discoveries")
    .select("id, slug, title, access_level, verification_status, is_published, is_demo, updated_at, category:categories(name, color)", { count: "exact" });
  if (q) query = query.ilike("title", `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
  if (status === "draft") query = query.eq("is_published", false);
  if (status === "published") query = query.eq("is_published", true);
  if (status === "unverified") query = query.neq("verification_status", "verified");
  if (status === "premium") query = query.eq("access_level", "premium");
  if (status === "demo") query = query.eq("is_demo", true);

  const { data, count, error } = await query.order("updated_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  type Row = NonNullable<typeof data>[number] & { category: { name: string; color: string } | null };
  const rows = (data ?? []) as Row[];
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), status, page: String(p) })}`;

  return (
    <>
      <PageHeader title="Discoveries">
        <ButtonLink href="/admin/discoveries/new" size="sm">
          New discovery
        </ButtonLink>
      </PageHeader>
      {sp.deleted ? <Alert tone="neon" className="mb-4">Discovery deleted.</Alert> : null}
      {error ? <Alert tone="danger" className="mb-4">{error.message}</Alert> : null}

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by title…" className="max-w-xs" aria-label="Search discoveries" />
        <Select name="status" defaultValue={status} className="w-44" aria-label="Filter">
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="unverified">Not verified</option>
          <option value="premium">Premium</option>
          <option value="demo">Demo data</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {rows.length ? (
        <DataTable caption="Discoveries" head={["Title", "Category", "Access", "Verification", "Status", "Updated", ""]}>
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-white/[0.02]">
              <Td>
                <Link href={`/admin/discoveries/${d.id}`} className="font-medium text-fg hover:text-neon">
                  {d.title}
                </Link>
                {d.is_demo ? <Badge tone="ember" className="ml-2">demo</Badge> : null}
              </Td>
              <Td>
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="size-2 rounded-full" style={{ background: d.category?.color }} />
                  {d.category?.name}
                </span>
              </Td>
              <Td>
                <Badge tone={d.access_level === "premium" ? "neon" : "neutral"}>{d.access_level}</Badge>
              </Td>
              <Td>
                <Badge tone={d.verification_status === "verified" ? "neon" : d.verification_status === "community" ? "ember" : "neutral"}>
                  {d.verification_status}
                </Badge>
              </Td>
              <Td className="text-xs text-muted">{d.is_published ? "Published" : "Draft"}</Td>
              <Td className="text-xs text-muted">{formatDate(d.updated_at)}</Td>
              <Td>
                <div className="flex justify-end gap-1">
                  {d.verification_status !== "verified" ? (
                    <form action={setDiscoveryFlags}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="field" value="verify" />
                      <Button type="submit" size="sm" variant="ghost">
                        Verify
                      </Button>
                    </form>
                  ) : null}
                  <form action={setDiscoveryFlags}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="field" value={d.is_published ? "unpublish" : "publish"} />
                    <Button type="submit" size="sm" variant="ghost">
                      {d.is_published ? "Unpublish" : "Publish"}
                    </Button>
                  </form>
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No discoveries found">Create one, or load the demo seed (see README).</EmptyState>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {pages} · {count} total
          </span>
          <div className="flex gap-2">
            {page > 1 ? <ButtonLink href={qs(page - 1)} size="sm" variant="outline">Previous</ButtonLink> : null}
            {page < pages ? <ButtonLink href={qs(page + 1)} size="sm" variant="outline">Next</ButtonLink> : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
