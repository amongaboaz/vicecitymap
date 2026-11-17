"use client";

/* eslint-disable @next/next/no-img-element -- signed Supabase URLs are short-lived; next/image caching would outlive them */
import Link from "next/link";
import { AlertTriangle, Bookmark, BookmarkCheck, CheckCircle2, Circle, Copy, Loader2, X } from "lucide-react";
import { useState } from "react";
import type { CategoryDTO, DiscoveryDetailDTO } from "@/lib/discoveries/types";
import type { ProgressStatus } from "@/types/database";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { PremiumLock } from "./premium-lock";

export type PanelState =
  | { status: "loading"; id: string }
  | { status: "error"; id: string; message: string }
  | { status: "ready"; id: string; data: DiscoveryDetailDTO };

const verificationTone = { verified: "neon", community: "ember", unverified: "neutral" } as const;
const verificationLabel = { verified: "Verified", community: "Community", unverified: "Unverified" } as const;

type Props = {
  state: PanelState;
  category?: CategoryDTO;
  signedIn: boolean;
  isPremium: boolean;
  saved: boolean;
  progress: ProgressStatus | null;
  onClose(): void;
  onToggleSave(): Promise<void>;
  onSetProgress(status: ProgressStatus | null): Promise<void>;
};

export function DiscoveryPanel({ state, category, signedIn, isPremium, saved, progress, onClose, onToggleSave, onSetProgress }: Props) {
  const [busy, setBusy] = useState<"save" | "progress" | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (kind: "save" | "progress", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex max-h-full flex-col" role="dialog" aria-label="Discovery details" aria-modal="false">
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        {state.status === "ready" ? (
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <CategoryIcon name={category?.icon ?? "map-pin"} color={category?.color} className="size-3.5" />
              {category?.name ?? "Discovery"}
            </div>
            <h2 className="mt-1.5 text-lg font-semibold leading-snug text-fg">{state.data.title}</h2>
          </div>
        ) : (
          <div className="h-12 flex-1" />
        )}
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg"
          aria-label="Close details"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {state.status === "loading" ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading discovery…
          </div>
        ) : state.status === "error" ? (
          <div className="space-y-3 py-4">
            <p className="flex items-center gap-2 text-sm text-danger">
              <AlertTriangle className="size-4" aria-hidden /> {state.message}
            </p>
            {!isPremium ? <PremiumLock compact title="This may be a Premium discovery" /> : null}
          </div>
        ) : (
          <Detail
            d={state.data}
            isPremium={isPremium}
            onCopy={async () => {
              await navigator.clipboard?.writeText(`${window.location.origin}/map?d=${state.data.slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            copied={copied}
          />
        )}
      </div>

      {state.status === "ready" ? (
        <div className="border-t border-line p-3">
          {isPremium ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run("save", onToggleSave)}
                aria-pressed={saved}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm transition-colors disabled:opacity-60",
                  saved ? "border-ember/40 bg-ember/10 text-ember" : "border-line text-fg hover:bg-white/[0.04]",
                )}
              >
                {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                {saved ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run("progress", () => onSetProgress(progress ? null : "found"))}
                aria-pressed={Boolean(progress)}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm transition-colors disabled:opacity-60",
                  progress ? "border-neon/40 bg-neon/10 text-neon" : "border-line text-fg hover:bg-white/[0.04]",
                )}
              >
                {busy === "progress" ? <Loader2 className="size-4 animate-spin" /> : progress ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                {progress ? "Found" : "Mark found"}
              </button>
            </div>
          ) : (
            <PremiumLock
              compact
              title={signedIn ? "Track progress & save locations" : "Track your progress"}
              body={signedIn ? undefined : "Premium members can mark discoveries found and save locations."}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function Detail({ d, isPremium, onCopy, copied }: { d: DiscoveryDetailDTO; isPremium: boolean; onCopy(): void; copied: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={verificationTone[d.verification]}>{verificationLabel[d.verification]}</Badge>
        <Badge tone={d.accessLevel === "premium" ? "neon" : "neutral"}>{d.accessLevel === "premium" ? "Premium" : "Free"}</Badge>
        {d.isDemo ? <Badge tone="ember">Demo data</Badge> : null}
      </div>

      {d.isDemo ? (
        <p className="rounded-lg border border-ember/25 bg-ember/[0.06] px-3 py-2 text-xs leading-relaxed text-ember">
          Demonstration marker on a placeholder map. Not real GTA 6 information.
        </p>
      ) : d.verification === "unverified" ? (
        <p className="rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-muted">
          Unverified report — treat with caution until confirmed.
        </p>
      ) : null}

      {d.images.length ? (
        <div className="grid grid-cols-2 gap-2">
          {d.images.map((img, i) => (
            <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className={cn("overflow-hidden rounded-lg border border-line", i === 0 && "col-span-2")}>
              <img src={img.url} alt={img.alt || d.title} loading="lazy" className="aspect-video w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {d.summary ? <p className="text-sm font-medium leading-relaxed text-fg/90">{d.summary}</p> : null}
      {d.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{d.description}</p> : null}

      <section aria-label="Premium details">
        <h3 className="eyebrow mb-2">Full details</h3>
        {d.premiumLocked ? (
          <PremiumLock compact title="Walkthrough notes & requirements" body="Premium members see full details, tips and requirements for every discovery." />
        ) : d.premiumDetails ? (
          <p className="whitespace-pre-line rounded-lg border border-neon/15 bg-neon/[0.03] p-3 text-sm leading-relaxed text-fg/85">{d.premiumDetails}</p>
        ) : (
          <p className="text-xs text-subtle">No extended details yet.</p>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-ink-950/60 p-3 text-xs">
        <div>
          <dt className="text-subtle">Map position</dt>
          <dd className="mt-0.5 font-mono text-muted">
            {d.x.toFixed(1)}, {d.y.toFixed(1)}
          </dd>
        </div>
        <div>
          <dt className="text-subtle">Source</dt>
          <dd className="mt-0.5 truncate text-muted">{d.sourceNote ?? "—"}</dd>
        </div>
      </dl>

      <button type="button" onClick={onCopy} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <Copy className="size-3.5" aria-hidden /> {copied ? "Link copied" : "Copy link to this discovery"}
      </button>
      {!isPremium ? null : (
        <p className="text-[11px] text-subtle">
          Spotted an error? <Link href="mailto:support@vicecitymap.example" className="underline underline-offset-2">Report it</Link>.
        </p>
      )}
    </div>
  );
}
