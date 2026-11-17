import { requireAdmin } from "@/lib/auth/viewer";
import { isServiceRoleConfigured } from "@/lib/env.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { DataTable, PageHeader, Td } from "@/components/admin/table";
import { Alert, Badge, EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

const PER_PAGE = 50;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  if (!isServiceRoleConfigured) {
    return (
      <>
        <PageHeader title="Users" />
        <Alert tone="ember">Set SUPABASE_SECRET_KEY to list users (emails are only readable with the service role, server-side).</Alert>
      </>
    );
  }

  // Service role is used only after requireAdmin() succeeded, and only on the server.
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
  const users = data?.users ?? [];
  const ids = users.map((u) => u.id);

  const supabase = (await createSupabaseServerClient())!;
  const [ents, roles, progress] = await Promise.all([
    ids.length ? supabase.from("entitlements").select("user_id, revoked_at").in("user_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("admin_roles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("user_progress").select("user_id").in("user_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const premium = new Set((ents.data ?? []).filter((e) => !e.revoked_at).map((e) => e.user_id));
  const roleBy = new Map((roles.data ?? []).map((r) => [r.user_id, r.role]));
  const progressCount = new Map<string, number>();
  for (const p of progress.data ?? []) progressCount.set(p.user_id, (progressCount.get(p.user_id) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Users" />
      {error ? <Alert tone="danger" className="mb-4">{error.message}</Alert> : null}
      {users.length ? (
        <DataTable caption="Users" head={["Email", "Joined", "Last sign-in", "Plan", "Role", "Progress"]}>
          {users.map((u) => (
            <tr key={u.id}>
              <Td className="font-medium">
                {u.email}
                {!u.email_confirmed_at ? <Badge className="ml-2">unconfirmed</Badge> : null}
              </Td>
              <Td className="text-xs text-muted">{formatDate(u.created_at)}</Td>
              <Td className="text-xs text-muted">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "—"}</Td>
              <Td>{premium.has(u.id) ? <Badge tone="neon">Lifetime</Badge> : <Badge>Free</Badge>}</Td>
              <Td>{roleBy.get(u.id) ? <Badge tone="ember">{roleBy.get(u.id)}</Badge> : <span className="text-xs text-subtle">—</span>}</Td>
              <Td className="font-mono text-xs text-muted">{progressCount.get(u.id) ?? 0}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No users yet" />
      )}
      <nav aria-label="Pagination" className="mt-4 flex justify-end gap-2">
        {page > 1 ? <ButtonLink href={`?page=${page - 1}`} size="sm" variant="outline">Previous</ButtonLink> : null}
        {users.length === PER_PAGE ? <ButtonLink href={`?page=${page + 1}`} size="sm" variant="outline">Next</ButtonLink> : null}
      </nav>
    </>
  );
}
