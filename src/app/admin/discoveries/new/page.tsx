import { requireAdmin } from "@/lib/auth/viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/table";
import { DiscoveryForm } from "@/components/admin/discovery-form";
import { Card } from "@/components/ui/primitives";

export default async function NewDiscoveryPage() {
  await requireAdmin();
  const supabase = (await createSupabaseServerClient())!;
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");

  return (
    <>
      <PageHeader title="New discovery" />
      <Card className="max-w-3xl p-6">
        <DiscoveryForm
          categories={categories ?? []}
          initial={{
            title: "",
            slug: "",
            summary: "",
            description: "",
            premiumDetails: "",
            categoryId: "",
            mapX: "",
            mapY: "",
            accessLevel: "free",
            verificationStatus: "unverified",
            isPublished: false,
            sourceNote: "",
          }}
        />
      </Card>
    </>
  );
}
