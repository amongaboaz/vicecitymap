import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-subtle">Last updated {updated}</p>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-muted [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
      <p className="mt-12 rounded-xl border border-line bg-ink-900/60 p-4 text-xs text-subtle">
        This template is provided for convenience and is not legal advice. Have it reviewed for your jurisdiction before launch.
      </p>
    </article>
  );
}
