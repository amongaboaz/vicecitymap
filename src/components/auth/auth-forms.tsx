"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthFormState,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";

function Status({ state }: { state: AuthFormState }) {
  if (state?.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state?.message) return <Alert tone="neon">{state.message}</Alert>;
  return null;
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Status state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-muted hover:text-fg">
          Forgot password?
        </Link>
      </div>
      <Submit pending={pending}>Sign in</Submit>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.message) return <Alert tone="neon" title="Almost there">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Status state={state} />
      <Field label="Display name" htmlFor="displayName">
        <Input id="displayName" name="displayName" autoComplete="nickname" required minLength={2} maxLength={40} defaultValue={state?.fields?.displayName} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters. A passphrase works well.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-[#5cf28b]" />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-fg underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-fg underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <Submit pending={pending}>Create account</Submit>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Status state={state} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Submit pending={pending}>Send reset link</Submit>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Status state={state} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Submit pending={pending}>Update password</Submit>
    </form>
  );
}
