"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveCategory, type ActionState } from "@/lib/admin/actions";
import { CATEGORY_ICON_NAMES } from "@/components/map/category-icon";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select } from "@/components/ui/primitives";

type Initial = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  isPremium: boolean;
  sortOrder: number;
};

export function CategoryForm({ initial, compact = false }: { initial: Initial; compact?: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCategory, undefined);
  const fe = state?.fieldErrors ?? {};
  const idp = initial.id ?? "new";
  return (
    <form action={action} className="space-y-3" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="neon">{state.ok}</Alert> : null}
      <div className={compact ? "grid gap-3 sm:grid-cols-6" : "grid gap-3 sm:grid-cols-2"}>
        <Field label="Name" htmlFor={`name-${idp}`} error={fe.name} className={compact ? "sm:col-span-2" : undefined}>
          <Input id={`name-${idp}`} name="name" defaultValue={initial.name} required maxLength={60} />
        </Field>
        <Field label="Slug" htmlFor={`slug-${idp}`} error={fe.slug} className={compact ? "sm:col-span-2" : undefined}>
          <Input id={`slug-${idp}`} name="slug" defaultValue={initial.slug} required maxLength={60} />
        </Field>
        <Field label="Colour" htmlFor={`color-${idp}`} error={fe.color}>
          <Input id={`color-${idp}`} name="color" type="color" defaultValue={initial.color} className="h-10 p-1" />
        </Field>
        <Field label="Order" htmlFor={`sort-${idp}`} error={fe.sortOrder}>
          <Input id={`sort-${idp}`} name="sortOrder" type="number" defaultValue={initial.sortOrder} />
        </Field>
        <Field label="Icon" htmlFor={`icon-${idp}`} className={compact ? "sm:col-span-2" : undefined}>
          <Select id={`icon-${idp}`} name="icon" defaultValue={initial.icon}>
            {CATEGORY_ICON_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor={`desc-${idp}`} error={fe.description} className={compact ? "sm:col-span-4" : undefined}>
          <Input id={`desc-${idp}`} name="description" defaultValue={initial.description} maxLength={500} />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" name="isPremium" defaultChecked={initial.isPremium} className="size-4 accent-[#5cf28b]" />
          Entire category is Premium-only
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {initial.id ? "Save" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
