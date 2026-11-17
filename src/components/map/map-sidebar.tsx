"use client";

import { Check, Loader2, Lock, Search, X } from "lucide-react";
import type { CategoryDTO, MarkerDTO } from "@/lib/discoveries/types";
import type { VerificationStatus } from "@/types/database";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { PremiumLock } from "./premium-lock";

export type MapFilters = {
  categories: Set<string>;
  verification: VerificationStatus | "all";
  hideFound: boolean;
  onlySaved: boolean;
};

type Props = {
  categories: CategoryDTO[];
  filters: MapFilters;
  onFiltersChange(next: MapFilters): void;
  isPremium: boolean;
  visibleCount: number;
  query: string;
  onQueryChange(q: string): void;
  searching: boolean;
  results: MarkerDTO[] | null;
  searchError: string | null;
  onPickResult(m: MarkerDTO): void;
  categoryById: Map<string, CategoryDTO>;
  onClose?(): void;
};

export function MapSidebar({
  categories,
  filters,
  onFiltersChange,
  isPremium,
  visibleCount,
  query,
  onQueryChange,
  searching,
  results,
  searchError,
  onPickResult,
  categoryById,
  onClose,
}: Props) {
  const toggleCategory = (id: string) => {
    const next = new Set(filters.categories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onFiltersChange({ ...filters, categories: next });
  };
  const unlocked = categories.filter((c) => isPremium || !c.isPremium);
  const allOn = unlocked.every((c) => filters.categories.has(c.id));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search discoveries…"
              aria-label="Search discoveries"
              className="h-10 w-full rounded-lg border border-line bg-ink-950 pl-9 pr-9 text-sm text-fg placeholder:text-subtle focus:border-neon/50 focus:outline-none focus:ring-2 focus:ring-neon/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-subtle hover:text-fg"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-fg"
              aria-label="Close filters"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {query.trim().length >= 2 ? (
          <section aria-label="Search results" aria-live="polite">
            <p className="eyebrow mb-2 flex items-center gap-2 px-1">
              Results {searching ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
            </p>
            {searchError ? <p className="px-1 text-xs text-danger">{searchError}</p> : null}
            {results && results.length === 0 && !searching ? (
              <p className="px-1 py-6 text-center text-sm text-muted">No discoveries match “{query.trim()}”.</p>
            ) : null}
            <ul className="space-y-1">
              {results?.map((m) => {
                const cat = categoryById.get(m.categoryId);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onPickResult(m)}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.05]"
                    >
                      <CategoryIcon name={cat?.icon ?? "map-pin"} color={cat?.color} className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{m.title}</span>
                        <span className="block text-[11px] text-subtle">{cat?.name}</span>
                      </span>
                      {m.accessLevel === "premium" ? <span className="text-[10px] text-neon">PRO</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!isPremium ? (
              <p className="mt-3 px-1 text-[11px] text-subtle">Premium discoveries are hidden from search on the free plan.</p>
            ) : null}
          </section>
        ) : (
          <>
            <section aria-labelledby="cat-heading">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 id="cat-heading" className="eyebrow">
                  Categories
                </h2>
                <button
                  type="button"
                  className="text-[11px] text-muted hover:text-fg"
                  onClick={() =>
                    onFiltersChange({ ...filters, categories: allOn ? new Set() : new Set(unlocked.map((c) => c.id)) })
                  }
                >
                  {allOn ? "Hide all" : "Show all"}
                </button>
              </div>
              <ul className="space-y-0.5">
                {categories.map((c) => {
                  const locked = c.isPremium && !isPremium;
                  const on = filters.categories.has(c.id);
                  const count = isPremium ? c.freeCount + c.premiumCount : c.freeCount;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on && !locked}
                        disabled={locked}
                        onClick={() => toggleCategory(c.id)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed",
                          !on && !locked && "opacity-55",
                        )}
                      >
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-ink-950"
                          style={on && !locked ? { borderColor: `${c.color}55`, boxShadow: `inset 0 0 12px ${c.color}22` } : undefined}
                        >
                          <CategoryIcon name={c.icon} color={locked ? "#6b737d" : c.color} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm", locked ? "text-subtle" : "text-fg")}>{c.name}</span>
                          {!isPremium && c.premiumCount > 0 ? (
                            <span className="block text-[11px] text-subtle">
                              {locked ? `${c.premiumCount} premium` : `+${c.premiumCount} premium`}
                            </span>
                          ) : null}
                        </span>
                        {locked ? (
                          <Lock className="size-3.5 text-neon/80" aria-label="Premium" />
                        ) : (
                          <span className="font-mono text-[11px] text-subtle">{count}</span>
                        )}
                        {!locked ? (
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-4 place-items-center rounded border",
                              on ? "border-neon/60 bg-neon text-ink-950" : "border-line-strong",
                            )}
                          >
                            {on ? <Check className="size-3" strokeWidth={3} /> : null}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="adv-heading" className="mt-5">
              <h2 id="adv-heading" className="eyebrow mb-2 px-1">
                Advanced filters
              </h2>
              {isPremium ? (
                <div className="space-y-3 rounded-xl border border-line bg-ink-950/60 p-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs text-muted">Verification</span>
                    <select
                      value={filters.verification}
                      onChange={(e) => onFiltersChange({ ...filters, verification: e.target.value as MapFilters["verification"] })}
                      className="h-9 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-sm text-fg focus:border-neon/50 focus:outline-none"
                    >
                      <option value="all">All statuses</option>
                      <option value="verified">Verified only</option>
                      <option value="community">Community</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </label>
                  <Toggle label="Hide found / completed" checked={filters.hideFound} onChange={(v) => onFiltersChange({ ...filters, hideFound: v })} />
                  <Toggle label="Only saved locations" checked={filters.onlySaved} onChange={(v) => onFiltersChange({ ...filters, onlySaved: v })} />
                </div>
              ) : (
                <PremiumLock
                  compact
                  title="Verification, found & saved filters"
                  body="Filter by verification status, hide what you’ve found and focus on your saved spots."
                />
              )}
            </section>
          </>
        )}
      </div>

      <div className="border-t border-line px-4 py-2.5 text-[11px] text-subtle">
        <span className="font-mono text-muted">{visibleCount}</span> discoveries loaded in view
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left text-sm text-fg"
    >
      {label}
      <span className={cn("relative h-5 w-9 rounded-full border transition-colors", checked ? "border-neon/50 bg-neon/80" : "border-line-strong bg-ink-800")}>
        <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  );
}
