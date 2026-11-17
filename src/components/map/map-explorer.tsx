"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Crosshair, Loader2, Minus, PanelLeftClose, PanelLeftOpen, Plus, SlidersHorizontal } from "lucide-react";
import type { BBox, CategoryDTO, MarkerDTO, MarkerPage } from "@/lib/discoveries/types";
import type { ProgressStatus } from "@/types/database";
import { mapToLngLat as toLngLat, snapBBox } from "@/lib/map/projection";
import { cn } from "@/lib/utils";
import { MapCanvas, type MapCanvasHandle, type MarkerCollection } from "./map-canvas";
import { MapSidebar, type MapFilters } from "./map-sidebar";
import { DiscoveryPanel, type PanelState } from "./discovery-panel";
import { usingPlaceholderMap } from "./map-style";

export type MapViewer = { signedIn: boolean; isPremium: boolean; isAdmin: boolean };

type Props = {
  viewer: MapViewer;
  categories: CategoryDTO[];
  initialSlug: string | null;
  demoMode: boolean;
};

type Region = BBox & { truncated: boolean };

const contains = (outer: BBox, inner: BBox) =>
  outer.minX <= inner.minX && outer.minY <= inner.minY && outer.maxX >= inner.maxX && outer.maxY >= inner.maxY;

function pad(b: BBox, ratio = 0.25): BBox {
  const w = (b.maxX - b.minX) * ratio;
  const h = (b.maxY - b.minY) * ratio;
  return { minX: b.minX - w, minY: b.minY - h, maxX: b.maxX + w, maxY: b.maxY + h };
}

export function MapExplorer({ viewer, categories, initialSlug, demoMode }: Props) {
  const canvasRef = useRef<MapCanvasHandle>(null);
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // ── Marker cache with viewport-based loading ───────────────────────
  const cacheRef = useRef(new Map<string, MarkerDTO>());
  const regionsRef = useRef<Region[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const loadViewport = useCallback(async (bbox: BBox) => {
    const target = snapBBox(pad(bbox));
    const covering = regionsRef.current.find((r) => contains(r, target));
    if (covering && !covering.truncated) {
      setTruncated(false);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setLoadError(null);
    try {
      const qs = `bbox=${[target.minX, target.minY, target.maxX, target.maxY].map((v) => v.toFixed(0)).join(",")}&limit=1000`;
      const res = await fetch(`/api/discoveries?${qs}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not load discoveries.");
      const page = (await res.json()) as MarkerPage;
      for (const m of page.items) cacheRef.current.set(m.id, m);
      regionsRef.current = [...regionsRef.current.filter((r) => !contains(target, r)), { ...target, truncated: page.truncated }].slice(-40);
      setTruncated(page.truncated);
      setCacheVersion((v) => v + 1);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setLoadError((err as Error).message);
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, []);

  // ── Personal state (premium) ───────────────────────────────────────
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, ProgressStatus>>({});
  useEffect(() => {
    if (!viewer.isPremium) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { saved: string[]; progress: Record<string, ProgressStatus> } | null) => {
        if (!data) return;
        setSaved(new Set(data.saved));
        setProgress(data.progress);
      })
      .catch(() => undefined);
  }, [viewer.isPremium]);

  // ── Filters ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<MapFilters>(() => ({
    categories: new Set(categories.filter((c) => viewer.isPremium || !c.isPremium).map((c) => c.id)),
    verification: "all",
    hideFound: false,
    onlySaved: false,
  }));

  const visible = useMemo(() => {
    void cacheVersion;
    return [...cacheRef.current.values()].filter((m) => {
      if (!filters.categories.has(m.categoryId)) return false;
      if (viewer.isPremium) {
        if (filters.verification !== "all" && m.verification !== filters.verification) return false;
        if (filters.hideFound && progress[m.id]) return false;
        if (filters.onlySaved && !saved.has(m.id)) return false;
      }
      return true;
    });
  }, [cacheVersion, filters, viewer.isPremium, progress, saved]);

  const collection = useMemo<MarkerCollection>(
    () => ({
      type: "FeatureCollection",
      features: visible.map((m) => {
        return {
          type: "Feature",
          properties: {
            id: m.id,
            title: m.title,
            color: categoryById.get(m.categoryId)?.color ?? "#5CF28B",
            found: Boolean(progress[m.id]),
            saved: saved.has(m.id),
          },
          geometry: { type: "Point", coordinates: toLngLat(m.x, m.y) },
        };
      }),
    }),
    [visible, categoryById, progress, saved],
  );

  // ── Search ─────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarkerDTO[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearchError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/discoveries/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Search failed.");
        setResults(((await res.json()) as { items: MarkerDTO[] }).items);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSearchError((err as Error).message);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // ── Selection / detail panel ───────────────────────────────────────
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);

  const openDiscovery = useCallback(async (id: string, focus = false) => {
    setPanel({ status: "loading", id });
    const cached = cacheRef.current.get(id);
    if (cached) setSelectedPos({ x: cached.x, y: cached.y });
    try {
      const res = await fetch(`/api/discoveries/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not load discovery.");
      const data = await res.json();
      setPanel((p) => (p?.id === id ? { status: "ready", id, data } : p));
      setSelectedPos({ x: data.x, y: data.y });
      if (focus) canvasRef.current?.focus(data.x, data.y);
      const url = new URL(window.location.href);
      url.searchParams.set("d", data.slug);
      window.history.replaceState(null, "", url);
    } catch (err) {
      setPanel((p) => (p?.id === id ? { status: "error", id, message: (err as Error).message } : p));
    }
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedPos(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("d");
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel]);

  const [mapReady, setMapReady] = useState(false);
  const initialHandled = useRef(false);
  useEffect(() => {
    if (mapReady && initialSlug && !initialHandled.current) {
      initialHandled.current = true;
      void openDiscovery(initialSlug, true);
    }
  }, [mapReady, initialSlug, openDiscovery]);

  // ── Mutations ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const currentId = panel?.status === "ready" ? panel.data.id : null;

  const toggleSave = useCallback(async () => {
    if (!currentId) return;
    const next = !saved.has(currentId);
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discoveryId: currentId, saved: next }),
    });
    if (!res.ok) return setToast((await res.json().catch(() => null))?.error ?? "Could not update saved locations.");
    setSaved((s) => {
      const n = new Set(s);
      if (next) n.add(currentId);
      else n.delete(currentId);
      return n;
    });
  }, [currentId, saved]);

  const setProgressFor = useCallback(
    async (status: ProgressStatus | null) => {
      if (!currentId) return;
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discoveryId: currentId, status }),
      });
      if (!res.ok) return setToast((await res.json().catch(() => null))?.error ?? "Could not update progress.");
      setProgress((p) => {
        const n = { ...p };
        if (status) n[currentId] = status;
        else delete n[currentId];
        return n;
      });
    },
    [currentId],
  );

  // ── Layout state ───────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const sidebar = (onClose?: () => void) => (
    <MapSidebar
      categories={categories}
      filters={filters}
      onFiltersChange={setFilters}
      isPremium={viewer.isPremium}
      visibleCount={visible.length}
      query={query}
      onQueryChange={setQuery}
      searching={searching}
      results={results}
      searchError={searchError}
      categoryById={categoryById}
      onPickResult={(m) => {
        setMobileFilters(false);
        canvasRef.current?.focus(m.x, m.y, 4.8);
        void openDiscovery(m.id);
      }}
      onClose={onClose}
    />
  );

  const panelCategory = panel?.status === "ready" ? categoryById.get(panel.data.categoryId) : undefined;

  return (
    <div className="relative flex-1 overflow-hidden">
      {mapError ? (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="max-w-sm text-center">
            <AlertTriangle className="mx-auto size-6 text-ember" aria-hidden />
            <p className="mt-3 text-sm text-fg">The map could not start.</p>
            <p className="mt-1 text-xs text-muted">{mapError}</p>
          </div>
        </div>
      ) : (
        <MapCanvas
          ref={canvasRef}
          markers={collection}
          selected={selectedPos}
          onViewportChange={(b) => void loadViewport(b)}
          onSelect={(id) => void openDiscovery(id)}
          onCursor={setCursor}
          onReady={() => setMapReady(true)}
          onError={setMapError}
        />
      )}

      {!mapReady && !mapError ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-ink-950" role="status">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin text-neon" aria-hidden /> Loading map…
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        aria-label="Map filters"
        className={cn(
          "absolute bottom-3 left-3 top-3 z-10 hidden w-[320px] overflow-hidden rounded-2xl border border-line bg-ink-900/92 shadow-[var(--shadow-panel)] backdrop-blur-xl transition-transform duration-300 lg:block",
          !sidebarOpen && "-translate-x-[calc(100%+24px)]",
        )}
      >
        {sidebar()}
      </aside>
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        className={cn(
          "absolute top-3 z-20 hidden size-9 place-items-center rounded-lg border border-line bg-ink-900/90 text-muted backdrop-blur transition-[left] duration-300 hover:text-fg lg:grid",
          sidebarOpen ? "left-[340px]" : "left-3",
        )}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
      </button>

      {/* Mobile controls */}
      <div className="absolute inset-x-3 top-3 z-10 flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileFilters(true)}
          className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-line bg-ink-900/92 px-3 text-left text-sm text-muted shadow-lg backdrop-blur"
        >
          <SlidersHorizontal className="size-4 text-neon" aria-hidden />
          Search & filters
          <span className="ml-auto font-mono text-[11px] text-subtle">{visible.length}</span>
        </button>
      </div>
      {mobileFilters ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/60" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-sm border-r border-line bg-ink-900 shadow-2xl animate-fade-up">
            {sidebar(() => setMobileFilters(false))}
          </div>
        </div>
      ) : null}

      {/* Detail panel: right card on desktop, bottom sheet on mobile */}
      {panel ? (
        <div
          className={cn(
            "absolute z-20 overflow-hidden border border-line bg-ink-900/95 shadow-[var(--shadow-panel)] backdrop-blur-xl animate-fade-up",
            "inset-x-0 bottom-0 max-h-[72vh] rounded-t-2xl",
            "lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:max-h-none lg:w-[380px] lg:rounded-2xl",
          )}
        >
          <DiscoveryPanel
            state={panel}
            category={panelCategory}
            signedIn={viewer.signedIn}
            isPremium={viewer.isPremium}
            saved={currentId ? saved.has(currentId) : false}
            progress={currentId ? (progress[currentId] ?? null) : null}
            onClose={closePanel}
            onToggleSave={toggleSave}
            onSetProgress={setProgressFor}
          />
        </div>
      ) : null}

      {/* Zoom controls */}
      <div
        className={cn(
          "absolute bottom-6 z-10 flex flex-col overflow-hidden rounded-xl border border-line bg-ink-900/92 shadow-lg backdrop-blur transition-[right] duration-300",
          panel ? "right-3 max-lg:hidden lg:right-[400px]" : "right-3",
        )}
      >
        <MapButton label="Zoom in" onClick={() => canvasRef.current?.zoomIn()}>
          <Plus className="size-4" />
        </MapButton>
        <MapButton label="Zoom out" onClick={() => canvasRef.current?.zoomOut()}>
          <Minus className="size-4" />
        </MapButton>
        <MapButton label="Reset view" onClick={() => canvasRef.current?.resetView()}>
          <Crosshair className="size-4" />
        </MapButton>
      </div>

      {/* Status strip */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-6 z-10 flex flex-col items-start gap-2 transition-[left] duration-300",
          sidebarOpen ? "left-3 lg:left-[340px]" : "left-3",
          panel && "max-lg:hidden",
        )}
      >
        {loading ? (
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/90 px-2.5 py-1 text-[11px] text-muted backdrop-blur" role="status">
            <Loader2 className="size-3 animate-spin text-neon" aria-hidden /> Loading discoveries…
          </span>
        ) : null}
        {loadError ? (
          <span className="pointer-events-auto rounded-lg border border-danger/30 bg-ink-900/90 px-2.5 py-1 text-[11px] text-danger" role="alert">
            {loadError}
          </span>
        ) : null}
        {truncated ? (
          <span className="rounded-lg border border-line bg-ink-900/90 px-2.5 py-1 text-[11px] text-muted">Zoom in to load every marker in this area.</span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {usingPlaceholderMap ? (
            <span className="rounded-md border border-ember/30 bg-ink-950/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ember">
              Original placeholder map{demoMode ? " · demo data" : ""}
            </span>
          ) : null}
          {cursor && viewer.isAdmin ? (
            <span className="hidden rounded-md border border-line bg-ink-950/85 px-2 py-1 font-mono text-[10px] text-muted lg:inline">
              x {cursor[0].toFixed(1)} · y {cursor[1].toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-lg border border-line bg-ink-900 px-4 py-2 text-sm text-fg shadow-xl" role="status">
          {toast}{" "}
          {!viewer.isPremium ? (
            <Link href="/premium" className="text-neon underline-offset-2 hover:underline">
              Upgrade
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center border-b border-line text-muted transition-colors last:border-0 hover:bg-white/[0.05] hover:text-fg"
    >
      {children}
    </button>
  );
}
