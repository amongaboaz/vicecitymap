import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumLock({
  title = "Premium feature",
  body,
  className,
  compact = false,
}: {
  title?: string;
  body?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-neon/20 bg-neon/[0.04]", compact ? "p-3" : "p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-neon/25 bg-ink-950 text-neon">
          <Lock className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">{title}</p>
          {body ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p> : null}
          <Link
            href="/premium"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-neon underline-offset-4 hover:underline"
          >
            Unlock lifetime Premium — $10 once →
          </Link>
        </div>
      </div>
    </div>
  );
}
