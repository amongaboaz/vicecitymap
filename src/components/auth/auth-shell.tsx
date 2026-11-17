import type { ReactNode } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert, Card } from "@/components/ui/primitives";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-16">
      <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative w-full max-w-md">
        <Card className="p-7 shadow-[var(--shadow-panel)] sm:p-9">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
          {!isSupabaseConfigured ? (
            <Alert tone="ember" title="Demo mode" className="mt-6">
              Supabase is not configured, so accounts are disabled. Add your Supabase keys to <code>.env.local</code> — see README.
            </Alert>
          ) : null}
          <div className="mt-7">{children}</div>
        </Card>
        {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
      </div>
    </div>
  );
}
