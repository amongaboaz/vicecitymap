"use client";

import { useActionState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadDiscoveryImage, type ActionState } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Alert, Input } from "@/components/ui/primitives";

export function ImageUploader({ discoveryId }: { discoveryId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await uploadDiscoveryImage(prev, fd);
    if (result?.ok) formRef.current?.reset();
    return result;
  }, undefined);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="discoveryId" value={discoveryId} />
      <input
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp"
        required
        aria-label="Image file"
        className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-2 file:text-sm file:text-fg hover:file:bg-ink-600"
      />
      <Input name="alt" placeholder="Alt text (describe the image)" maxLength={200} aria-label="Alt text" />
      <p className="text-xs text-subtle">JPEG, PNG or WebP up to 5 MB. Only upload images you own or are licensed to use.</p>
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="neon">{state.ok}</Alert> : null}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Upload image
      </Button>
    </form>
  );
}
