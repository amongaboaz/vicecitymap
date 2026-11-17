"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-8 text-ember" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          An unexpected error occurred. Please try again.{error.digest ? ` (Reference: ${error.digest})` : ""}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="outline">
            Home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
