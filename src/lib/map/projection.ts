/**
 * Map-unit ↔ Web-Mercator projection.
 *
 * Discoveries are stored in abstract map units (0–1000 on both axes, origin
 * top-left). The whole 1000×1000 square is mapped onto the full Web-Mercator
 * world square, so a single square map image cut into standard XYZ tiles
 * (z0 = the whole image) lines up exactly at every zoom level.
 */
export const MAP_SIZE = 1000;
const MAX_LAT = 85.0511287798066;

export function mapToLngLat(x: number, y: number): [number, number] {
  const nx = x / MAP_SIZE;
  const ny = y / MAP_SIZE;
  const lng = nx * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * ny))) * 180) / Math.PI;
  return [lng, lat];
}

export function lngLatToMap(lng: number, lat: number): [number, number] {
  const clampedLat = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const nx = (lng + 180) / 360;
  const rad = (clampedLat * Math.PI) / 180;
  const ny = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
  return [clamp(nx * MAP_SIZE), clamp(ny * MAP_SIZE)];
}

function clamp(v: number) {
  return Math.max(0, Math.min(MAP_SIZE, v));
}

/** Snap a bbox outward to a grid so nearby viewports share cache keys. */
export function snapBBox(b: { minX: number; minY: number; maxX: number; maxY: number }, step = 50) {
  return {
    minX: clamp(Math.floor(b.minX / step) * step),
    minY: clamp(Math.floor(b.minY / step) * step),
    maxX: clamp(Math.ceil(b.maxX / step) * step),
    maxY: clamp(Math.ceil(b.maxY / step) * step),
  };
}
