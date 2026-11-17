import { Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/viewer";
import { deleteCategory } from "@/lib/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/table";
import { CategoryForm } from "@/components/admin/category-form";
import { Alert, Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const { error } = await searchParams;
  const supabase = (await createSupabaseServerClient())!;
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order").order("name");

  return (
    <>
      <PageHeader title="Categories" />
      {typeof error === "string" ? <Alert tone="danger" className="mb-4">{error}</Alert> : null}
      <Card className="mb-8 p-5">
        <h2 className="mb-4 text-sm font-semibold">Add category</h2>
        <CategoryForm compact initial={{ name: "", slug: "", description: "", color: "#5CF28B", icon: "map-pin", isPremium: false, sortOrder: 100 }} />
      </Card>
      <div className="space-y-3">
        {categories?.length ? (
          categories.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: c.color }} /> {c.name}
                </p>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label={`Delete ${c.name}`}>
                    <Trash2 /> Delete
                  </Button>
                </form>
              </div>
              <CategoryForm
                compact
                initial={{
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  description: c.description ?? "",
                  color: c.color,
                  icon: c.icon,
                  isPremium: c.is_premium,
                  sortOrder: c.sort_order,
                }}
              />
            </Card>
          ))
        ) : (
          <EmptyState title="No categories yet">Add one above, or run the demo seed.</EmptyState>
        )}
      </div>
    </>
  );
}
