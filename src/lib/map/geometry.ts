/**
 * Builds the ORIGINAL placeholder map from `placeholder-geometry.json`.
 * Output is plain map-unit geometry consumed by both the MapLibre style
 * (as GeoJSON) and the homepage SVG preview.
 */
import raw from "./placeholder-geometry.json";
import { mapToLngLat } from "./projection";

export type Pt = [number, number];
type Ring = Pt[];

/** Chaikin corner-cutting for organic coastlines. */
export function smooth(points: Ring, iterations = 2): Ring {
  let pts = points;
  for (let i = 0; i < iterations; i++) {
    const next: Ring = [];
    for (let j = 0; j < pts.length; j++) {
      const [x0, y0] = pts[j];
      const [x1, y1] = pts[(j + 1) % pts.length];
      next.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
    }
    pts = next;
  }
  return pts;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 40): Ring {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * (1 + 0.06 * Math.sin(a * 3)), cy + Math.sin(a) * ry] as Pt;
  });
}

const asRing = (p: number[][]) => p.map(([x, y]) => [x, y] as Pt);

/** Chaikin smoothing for an open polyline (endpoints preserved). */
export function smoothOpen(points: Pt[], iterations = 2): Pt[] {
  let pts = points;
  for (let i = 0; i < iterations; i++) {
    const next: Pt[] = [pts[0]];
    for (let j = 0; j < pts.length - 1; j++) {
      const [x0, y0] = pts[j];
      const [x1, y1] = pts[j + 1];
      next.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

// The mainland touches the map edges: keep the corner at the origin sharp and smooth only the coastline.
function mainland(points: Ring): Ring {
  return [points[0], ...smoothOpen(points.slice(1), 2)];
}

export type PlaceholderMap = {
  land: Ring[];
  lakes: Ring[];
  wetlands: Ring[];
  parks: Ring[];
  airport: Ring;
  runways: Pt[][];
  highways: Pt[][];
  streets: Pt[][];
  districts: { name: string; x: number; y: number }[];
};

function buildStreets(): Pt[][] {
  const { x0, y0, x1, y1, step } = raw.streets.grid;
  const lines: Pt[][] = [];
  for (let x = x0; x <= x1; x += step) lines.push([[x, y0], [x + 6, y1]]);
  for (let y = y0; y <= y1; y += step) lines.push([[x0, y], [x1, y - 4]]);
  return lines;
}

export const placeholderMap: PlaceholderMap = {
  land: raw.land.map((l) => (l.id === "mainland" ? mainland(asRing(l.points)) : smooth(asRing(l.points), l.points.length <= 4 ? 3 : 2))),
  lakes: raw.lakes.map((l) => ellipse(l.cx, l.cy, l.rx, l.ry)),
  wetlands: raw.wetlands.map((w) => smooth(asRing(w.points), 3)),
  parks: raw.parks.map((p) => smooth(asRing(p.points), 2)),
  airport: asRing(raw.airport.points),
  runways: raw.runways.map(asRing),
  highways: raw.highways.map(asRing),
  streets: buildStreets(),
  districts: raw.districts,
};

// ── GeoJSON for MapLibre ─────────────────────────────────────────────
type Feature = GeoJSON.Feature<GeoJSON.Geometry, { kind: string; name?: string }>;

const project = (ring: Pt[]) => ring.map(([x, y]) => mapToLngLat(x, y));
const closed = (ring: Pt[]) => [...project(ring), mapToLngLat(ring[0][0], ring[0][1])];

export function placeholderGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.Geometry, { kind: string; name?: string }> {
  const polys = (kind: string, rings: Ring[]): Feature[] =>
    rings.map((r) => ({ type: "Feature", properties: { kind }, geometry: { type: "Polygon", coordinates: [closed(r)] } }));
  const lines = (kind: string, ls: Pt[][]): Feature[] =>
    ls.map((l) => ({ type: "Feature", properties: { kind }, geometry: { type: "LineString", coordinates: project(l) } }));

  return {
    type: "FeatureCollection",
    features: [
      ...polys("land", placeholderMap.land),
      ...polys("wetland", placeholderMap.wetlands),
      ...polys("park", placeholderMap.parks),
      ...polys("airport", [placeholderMap.airport]),
      ...polys("lake", placeholderMap.lakes),
      ...lines("street", placeholderMap.streets),
      ...lines("runway", placeholderMap.runways),
      ...lines("highway", placeholderMap.highways),
    ],
  };
}

// ── SVG paths for static previews ────────────────────────────────────
export function svgPath(ring: Pt[], close = true): string {
  return ring.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + (close ? "Z" : "");
}
