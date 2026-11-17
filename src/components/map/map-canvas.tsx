"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GeoJSONSource, Map as MlMap, Marker, MapMouseEvent } from "maplibre-gl";
import { publicEnv } from "@/lib/env";
import { placeholderMap } from "@/lib/map/geometry";
import { lngLatToMap, mapToLngLat } from "@/lib/map/projection";
import type { BBox } from "@/lib/discoveries/types";
import { buildBaseStyle, usingPlaceholderMap } from "./map-style";

export type MarkerFeatureProps = {
  id: string;
  title: string;
  color: string;
  found: boolean;
  saved: boolean;
};

export type MarkerCollection = GeoJSON.FeatureCollection<GeoJSON.Point, MarkerFeatureProps>;

export type MapCanvasHandle = {
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  focus(x: number, y: number, zoom?: number): void;
};

type Props = {
  markers: MarkerCollection;
  selected: { x: number; y: number } | null;
  onViewportChange(bbox: BBox, zoom: number): void;
  onSelect(id: string): void;
  onCursor?(coords: [number, number] | null): void;
  onReady?(): void;
  onError?(message: string): void;
};

const EMPTY: MarkerCollection = { type: "FeatureCollection", features: [] };
function selectionData(selected: { x: number; y: number } | null): GeoJSON.FeatureCollection {
  return selected
    ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: mapToLngLat(selected.x, selected.y) } }] }
    : EMPTY;
}

/** Camera that fits the whole 1000×1000 map square (= the Web-Mercator world) in the container. */
function worldView(map: MlMap) {
  const el = map.getContainer();
  const size = Math.max(256, Math.min(el.clientWidth, el.clientHeight) - 48);
  return { center: [0, 0] as [number, number], zoom: Math.log2(size / 512) };
}

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  { markers, selected, onViewportChange, onSelect, onCursor, onReady, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const callbacks = useRef({ onViewportChange, onSelect, onCursor, onReady, onError });
  callbacks.current = { onViewportChange, onSelect, onCursor, onReady, onError };
  const latestMarkers = useRef(markers);
  latestMarkers.current = markers;
  const latestSelected = useRef(selected);
  latestSelected.current = selected;

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    resetView: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ ...worldView(map), duration: 600 });
    },
    focus: (x, y, zoom) => {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({ center: mapToLngLat(x, y), zoom: Math.max(map.getZoom(), zoom ?? 4.2), duration: 700 });
    },
  }));

  // ── Initialise MapLibre once ───────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let map: MlMap | null = null;
    const clusterMarkers = new Map<number, Marker>();
    const labelMarkers: Marker[] = [];
    const cleanups: (() => void)[] = [];

    const init = async () => {
      const maplibregl = await import("maplibre-gl");
      // MapLibre 6 resolves its worker via import.meta.url, which bundlers rewrite;
      // serve the self-contained worker module from /public instead (see scripts/copy-maplibre-worker.mjs).
      maplibregl.setWorkerUrl(new URL(`/vendor/maplibre-gl-worker.mjs?v=${maplibregl.getVersion()}`, window.location.origin).href);
      if (disposed || !containerRef.current) return;

      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style: buildBaseStyle(),
          center: [0, 0],
          zoom: 1,
          minZoom: 0.3,
          maxZoom: publicEnv.mapMaxZoom + 1,
          renderWorldCopies: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
      } catch (err) {
        callbacks.current.onError?.(err instanceof Error ? err.message : "Your browser could not start the map (WebGL required).");
        return;
      }
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __vcmMap?: MlMap }).__vcmMap = map;
      map.touchZoomRotate.disableRotation();
      // Keep the drawing buffer sharp when the window moves between displays (DPR change).
      const syncPixelRatio = () => {
        if (map && map.getPixelRatio() !== window.devicePixelRatio) map.setPixelRatio(window.devicePixelRatio);
      };
      window.addEventListener("resize", syncPixelRatio);
      cleanups.push(() => window.removeEventListener("resize", syncPixelRatio));
      map.keyboard.enable();

      const emitViewport = () => {
        if (!map) return;
        const b = map.getBounds();
        const [minX, minY] = lngLatToMap(b.getWest(), b.getNorth());
        const [maxX, maxY] = lngLatToMap(b.getEast(), b.getSouth());
        callbacks.current.onViewportChange({ minX, minY, maxX, maxY }, map.getZoom());
      };

      const updateClusters = () => {
        if (!map || !map.getSource("discoveries") || !map.isSourceLoaded("discoveries")) return;
        const features = map.querySourceFeatures("discoveries", { filter: ["has", "point_count"] });
        const seen = new Set<number>();
        for (const f of features) {
          const props = f.properties as { cluster_id: number; point_count: number };
          const id = props.cluster_id;
          if (seen.has(id)) continue;
          seen.add(id);
          let marker = clusterMarkers.get(id);
          if (!marker) {
            const el = document.createElement("button");
            el.type = "button";
            el.className = "vcm-cluster";
            const size = Math.round(28 + Math.min(26, Math.log2(props.point_count) * 5));
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.textContent = props.point_count >= 1000 ? `${Math.round(props.point_count / 100) / 10}k` : String(props.point_count);
            el.setAttribute("aria-label", `${props.point_count} discoveries — zoom in`);
            const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
            el.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const source = map?.getSource<GeoJSONSource>("discoveries");
              if (!source || !map) return;
              const zoom = await source.getClusterExpansionZoom(id);
              map.easeTo({ center: coords, zoom: zoom + 0.25, duration: 500 });
            });
            marker = new maplibregl.Marker({ element: el }).setLngLat(coords);
            clusterMarkers.set(id, marker);
          }
          marker.addTo(map);
        }
        for (const [id, marker] of clusterMarkers) {
          if (!seen.has(id)) {
            marker.remove();
            clusterMarkers.delete(id);
          }
        }
      };

      map.on("load", () => {
        if (!map) return;
        map.resize();
        map.jumpTo(worldView(map));
        map.addSource("discoveries", {
          type: "geojson",
          data: latestMarkers.current,
          cluster: true,
          clusterRadius: 46,
          clusterMaxZoom: 4,
        });
        map.addSource("selection", { type: "geojson", data: selectionData(latestSelected.current) });

        map.addLayer({
          id: "cluster-hit",
          type: "circle",
          source: "discoveries",
          filter: ["has", "point_count"],
          paint: { "circle-radius": 1, "circle-opacity": 0 },
        });
        map.addLayer({
          id: "discovery-halo",
          type: "circle",
          source: "discoveries",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["get", "color"],
            "circle-opacity": ["case", ["get", "found"], 0.05, 0.16],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 9, 7, 16],
            "circle-blur": 0.4,
          },
        });
        map.addLayer({
          id: "discovery-point",
          type: "circle",
          source: "discoveries",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["get", "color"],
            "circle-opacity": ["case", ["get", "found"], 0.35, 1],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4.5, 7, 8],
            "circle-stroke-color": ["case", ["get", "saved"], "#FF8A3D", "#050607"],
            "circle-stroke-width": ["case", ["get", "saved"], 2.5, 1.5],
          },
        });
        map.addLayer({
          id: "selection-ring",
          type: "circle",
          source: "selection",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 12, 7, 18],
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": "#5CF28B",
            "circle-stroke-width": 2,
          },
        });

        if (usingPlaceholderMap) {
          for (const d of placeholderMap.districts) {
            const el = document.createElement("div");
            el.className = "vcm-district";
            el.textContent = d.name;
            labelMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(mapToLngLat(d.x, d.y)).addTo(map));
          }
        }

        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "vcm-tooltip" });
        map.on("mouseenter", "discovery-point", (e) => {
          if (!map) return;
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (f) {
            popup
              .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
              .setText(String(f.properties.title))
              .addTo(map);
          }
        });
        map.on("mouseleave", "discovery-point", () => {
          if (!map) return;
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
        map.on("click", "discovery-point", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") callbacks.current.onSelect(id);
        });

        readyRef.current = true;
        emitViewport();
        callbacks.current.onReady?.();
      });

      map.on("moveend", emitViewport);
      map.on("render", updateClusters);
      map.on("mousemove", (e: MapMouseEvent) => callbacks.current.onCursor?.(lngLatToMap(e.lngLat.lng, e.lngLat.lat)));
      map.on("mouseout", () => callbacks.current.onCursor?.(null));
      map.on("error", (e) => console.warn("[map]", e.error?.message));
    };
    init().catch((err: unknown) => {
      console.error("[map] init failed", err);
      callbacks.current.onError?.(err instanceof Error ? err.message : "The map failed to initialise.");
    });

    return () => {
      disposed = true;
      for (const fn of cleanups) fn();
      for (const m of clusterMarkers.values()) m.remove();
      for (const m of labelMarkers) m.remove();
      map?.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // ── Data updates ───────────────────────────────────────────────────
  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>("discoveries");
    if (readyRef.current && source) source.setData(markers);
  }, [markers]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>("selection");
    if (!readyRef.current || !source) return;
    source.setData(selectionData(selected));
  }, [selected]);

  // MapLibre sets `position: relative` on its container, so size it from an absolutely positioned wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Interactive discovery map" />
    </div>
  );
});
