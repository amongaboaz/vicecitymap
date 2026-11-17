import { Plus } from "lucide-react";
import { faqs } from "@/lib/plans";

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-ink-900/60">
      {faqs.map((f) => (
        <details key={f.q} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-medium text-fg">
            {f.q}
            <Plus className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-45" aria-hidden />
          </summary>
          <p className="-mt-1 pb-5 pr-8 text-sm leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
