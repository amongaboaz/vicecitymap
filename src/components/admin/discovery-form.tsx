"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveDiscovery, type ActionState } from "@/lib/admin/actions";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { CoordinatePicker } from "./coordinate-picker";

export type DiscoveryFormValues = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  premiumDetails: string;
  categoryId: string;
  mapX: number | "";
  mapY: number | "";
  accessLevel: "free" | "premium";
  verificationStatus: "unverified" | "community" | "verified";
  isPublished: boolean;
  sourceNote: string;
};

export function DiscoveryForm({ initial, categories }: { initial: DiscoveryFormValues; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveDiscovery, undefined);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [mapX, setMapX] = useState<string>(initial.mapX === "" ? "" : String(initial.mapX));
  const [mapY, setMapY] = useState<string>(initial.mapY === "" ? "" : String(initial.mapY));
  const numX = mapX === "" || Number.isNaN(Number(mapX)) ? null : Number(mapX);
  const numY = mapY === "" || Number.isNaN(Number(mapY)) ? null : Number(mapY);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="neon">{state.ok}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={fe.title}>
          <Input
            id="title"
            name="title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug (URL)" htmlFor="slug" error={fe.slug} hint="Used in /map?d=… links.">
          <Input
            id="slug"
            name="slug"
            required
            maxLength={100}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="categoryId" error={fe.categoryId}>
          <Select id="categoryId" name="categoryId" defaultValue={initial.categoryId} required>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Access level" htmlFor="accessLevel">
          <Select id="accessLevel" name="accessLevel" defaultValue={initial.accessLevel}>
            <option value="free">Free (public)</option>
            <option value="premium">Premium only</option>
          </Select>
        </Field>
        <Field label="Verification" htmlFor="verificationStatus">
          <Select id="verificationStatus" name="verificationStatus" defaultValue={initial.verificationStatus}>
            <option value="unverified">Unverified</option>
            <option value="community">Community confirmed</option>
            <option value="verified">Verified</option>
          </Select>
        </Field>
      </div>

      <CoordinatePicker
        x={numX}
        y={numY}
        onPick={(x, y) => {
          setMapX(String(x));
          setMapY(String(y));
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Map X (0–1000)" htmlFor="mapX" error={fe.mapX}>
          <Input id="mapX" name="mapX" type="number" step="0.1" min={0} max={1000} required value={mapX} onChange={(e) => setMapX(e.target.value)} />
        </Field>
        <Field label="Map Y (0–1000)" htmlFor="mapY" error={fe.mapY}>
          <Input id="mapY" name="mapY" type="number" step="0.1" min={0} max={1000} required value={mapY} onChange={(e) => setMapY(e.target.value)} />
        </Field>
      </div>

      <Field label="Summary" htmlFor="summary" error={fe.summary} hint="Shown to everyone who can see the discovery. Max 280 characters.">
        <Input id="summary" name="summary" maxLength={280} defaultValue={initial.summary} />
      </Field>
      <Field label="Description" htmlFor="description" error={fe.description}>
        <Textarea id="description" name="description" rows={5} maxLength={5000} defaultValue={initial.description} />
      </Field>
      <Field label="Premium details" htmlFor="premiumDetails" error={fe.premiumDetails} hint="Only visible to lifetime members (enforced by RLS).">
        <Textarea id="premiumDetails" name="premiumDetails" rows={4} maxLength={10000} defaultValue={initial.premiumDetails} />
      </Field>
      <Field label="Source / evidence note" htmlFor="sourceNote" error={fe.sourceNote} hint="Where this was confirmed. Required practice before marking Verified.">
        <Input id="sourceNote" name="sourceNote" maxLength={500} defaultValue={initial.sourceNote} />
      </Field>

      <label className="flex items-center gap-2.5 text-sm text-fg">
        <input type="checkbox" name="isPublished" defaultChecked={initial.isPublished} className="size-4 accent-[#5cf28b]" />
        Published (visible on the map according to access level)
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {initial.id ? "Save changes" : "Create discovery"}
      </Button>
    </form>
  );
}
