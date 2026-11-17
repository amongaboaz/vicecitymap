import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataTable({ head, children, caption }: { head: ReactNode[]; children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-ink-900/60">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/60 p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
