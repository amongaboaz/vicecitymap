/* eslint-disable @next/next/no-img-element -- short-lived signed URLs */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/viewer";
import { deleteDiscovery, deleteDiscoveryImage } from "@/lib/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/table";
import { DiscoveryForm } from "@/components/admin/discovery-form";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Alert, Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default async function EditDiscoveryPage({ params, searchParams }: PageProps<"/admin/discoveries/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = (await createSupabaseServerClient())!;

  const [{ data: d }, { data: categories }, { data: premium }, { data: images }] = await Promise.all([
    supabase.from("discoveries").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("discovery_premium_details").select("details").eq("discovery_id", id).maybeSingle(),
    supabase.from("discovery_images").select("id, storage_path, alt").eq("discovery_id", id).order("sort_order"),
  ]);
  if (!d) notFound();

  const signed = images?.length
    ? (await supabase.storage.from("discovery-images").createSignedUrls(images.map((i) => i.storage_path), 600)).data
    : [];

  return (
    <>
      <PageHeader title={d.title}>
        {d.is_published ? (
          <Link href={`/map?d=${d.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
            View on map <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </PageHeader>
      {sp.created ? <Alert tone="neon" className="mb-4">Discovery created. Add images below.</Alert> : null}
      {d.is_demo ? (
        <Alert tone="ember" className="mb-4">
          This is demonstration seed data — not real game information.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-6">
          <DiscoveryForm
            categories={categories ?? []}
            initial={{
              id: d.id,
              title: d.title,
              slug: d.slug,
              summary: d.summary,
              description: d.description,
              premiumDetails: premium?.details ?? "",
              categoryId: d.category_id,
              mapX: d.map_x,
              mapY: d.map_y,
              accessLevel: d.access_level,
              verificationStatus: d.verification_status,
              isPublished: d.is_published,
              sourceNote: d.source_note ?? "",
            }}
          />
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Images</h2>
            {images?.length ? (
              <ul className="mb-5 grid grid-cols-2 gap-2">
                {images.map((img) => {
                  const url = signed?.find((s) => s.path === img.storage_path)?.signedUrl;
                  return (
                    <li key={img.id} className="group relative overflow-hidden rounded-lg border border-line">
                      {url ? <img src={url} alt={img.alt} className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-ink-800" />}
                      <form action={deleteDiscoveryImage} className="absolute right-1 top-1">
                        <input type="hidden" name="imageId" value={img.id} />
                        <button type="submit" aria-label="Delete image" className="grid size-7 place-items-center rounded-md bg-ink-950/80 text-danger opacity-80 hover:opacity-100">
                          <Trash2 className="size-3.5" />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mb-5">
                <EmptyState title="No images yet" />
              </div>
            )}
            <ImageUploader discoveryId={d.id} />
          </Card>

          <Card className="border-danger/25 p-5">
            <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
            <p className="mt-1 text-xs text-muted">Permanently deletes this discovery, its images and all user progress/saves for it.</p>
            <form action={deleteDiscovery} className="mt-4">
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variant="danger" size="sm">
                <Trash2 /> Delete discovery
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
