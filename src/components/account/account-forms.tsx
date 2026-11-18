"use client";

import { useActionState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteAccount, updateProfile, type AccountState } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";

function Status({ state }: { state: AccountState }) {
  if (state?.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state?.ok) return <Alert tone="neon">{state.ok}</Alert>;
  return null;
}

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Status state={state} />
      <Field label="Display name" htmlFor="displayName">
        <Input id="displayName" name="displayName" defaultValue={displayName} required minLength={2} maxLength={40} autoComplete="nickname" />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null} Save profile
      </Button>
    </form>
  );
}

export function DeleteAccountForm({ isPremium }: { isPremium: boolean }) {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Status state={state} />
      <p className="text-sm leading-relaxed text-muted">
        This permanently deletes your account, progress and saved locations.
        {isPremium ? " Your lifetime Premium access will be lost and cannot be restored to a new account." : ""} Purchase records are
        kept for accounting but no longer linked to you. This cannot be undone.
      </p>
      <Field label='Type "DELETE" to confirm' htmlFor="confirm">
        <Input id="confirm" name="confirm" autoComplete="off" required className="max-w-xs" />
      </Field>
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete my account
      </Button>
    </form>
  );
}
