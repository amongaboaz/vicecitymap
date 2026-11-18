"use client";

import { useMemo, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import { MapCanvas, type MapCanvasHandle, type MarkerCollection } from "@/components/map/map-canvas";

const EMPTY: MarkerCollection = { type: "FeatureCollection", features: [] };

/** Click on the map to set a discovery's coordinates (map units, 0–1000). */
export function CoordinatePicker({
  x,
  y,
  onPick,
}: {
  x: number | null;
  y: number | null;
  onPick(x: number, y: number): void;
}) {
  const ref = useRef<MapCanvasHandle>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const selected = useMemo(() => (x !== null && y !== null ? { x, y } : null), [x, y]);

  return (
    <div>
      <div className="relative h-72 overflow-hidden rounded-xl border border-line bg-ink-950">
        <MapCanvas
          ref={ref}
          markers={EMPTY}
          selected={selected}
          onViewportChange={() => undefined}
          onSelect={() => undefined}
          onCursor={setCursor}
          onMapClick={([px, py]) => onPick(Math.round(px * 10) / 10, Math.round(py * 10) / 10)}
          onReady={() => {
            if (selected) ref.current?.focus(selected.x, selected.y, 3);
          }}
        />
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-line bg-ink-950/85 px-2 py-1 font-mono text-[10px] text-muted">
          {cursor ? `x ${cursor[0].toFixed(1)} · y ${cursor[1].toFixed(1)}` : "Click the map to set the position"}
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => ref.current?.focus(selected.x, selected.y, 4)}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-ink-950/85 px-2 py-1 text-[11px] text-muted hover:text-fg"
          >
            <Crosshair className="size-3" aria-hidden /> Centre on pin
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs text-subtle">Click the map to fill in X/Y, or type exact values below.</p>
    </div>
  );
}
