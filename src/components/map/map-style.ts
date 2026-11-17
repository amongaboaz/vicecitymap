import type { StyleSpecification } from "maplibre-gl";
import { publicEnv } from "@/lib/env";
import { placeholderGeoJSON } from "@/lib/map/geometry";

export const usingPlaceholderMap = !publicEnv.mapTilesUrl;

/**
 * Builds the base map style. To switch from the placeholder to real, licensed
 * artwork, set NEXT_PUBLIC_MAP_TILES_URL to an XYZ template whose z0 tile is
 * the entire 1000×1000 map-unit square (see README → "Replacing the map").
 */
export function buildBaseStyle(): StyleSpecification {
  if (publicEnv.mapTilesUrl) {
    return {
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: [publicEnv.mapTilesUrl],
          tileSize: 256,
          maxzoom: publicEnv.mapMaxZoom,
          attribution: publicEnv.mapTilesAttribution ?? "",
        },
      },
      layers: [
        { id: "background", type: "background", paint: { "background-color": "#06080b" } },
        { id: "basemap", type: "raster", source: "basemap" },
      ],
    };
  }

  return {
    version: 8,
    sources: {
      placeholder: {
        type: "geojson",
        data: placeholderGeoJSON(),
        attribution: "Original placeholder map — not the official game map",
      },
    },
    layers: [
      { id: "water", type: "background", paint: { "background-color": "#06090d" } },
      {
        id: "coast-glow",
        type: "line",
        source: "placeholder",
        filter: ["==", ["get", "kind"], "land"],
        paint: { "line-color": "#5CF28B", "line-opacity": 0.12, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 4, 6, 16], "line-blur": 8 },
      },
      { id: "land", type: "fill", source: "placeholder", filter: ["==", ["get", "kind"], "land"], paint: { "fill-color": "#121519" } },
      { id: "wetland", type: "fill", source: "placeholder", filter: ["==", ["get", "kind"], "wetland"], paint: { "fill-color": "#0f1913", "fill-opacity": 0.95 } },
      { id: "park", type: "fill", source: "placeholder", filter: ["==", ["get", "kind"], "park"], paint: { "fill-color": "#11211a" } },
      { id: "airport", type: "fill", source: "placeholder", filter: ["==", ["get", "kind"], "airport"], paint: { "fill-color": "#181c21" } },
      { id: "lake", type: "fill", source: "placeholder", filter: ["==", ["get", "kind"], "lake"], paint: { "fill-color": "#06090d", "fill-outline-color": "#1d242c" } },
      {
        id: "coastline",
        type: "line",
        source: "placeholder",
        filter: ["==", ["get", "kind"], "land"],
        paint: { "line-color": "#5CF28B", "line-opacity": 0.32, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 1.6] },
      },
      {
        id: "street",
        type: "line",
        source: "placeholder",
        filter: ["==", ["get", "kind"], "street"],
        minzoom: 2.5,
        paint: { "line-color": "#ffffff", "line-opacity": 0.07, "line-width": ["interpolate", ["linear"], ["zoom"], 2.5, 0.5, 7, 3] },
      },
      {
        id: "runway",
        type: "line",
        source: "placeholder",
        filter: ["==", ["get", "kind"], "runway"],
        paint: { "line-color": "#ffffff", "line-opacity": 0.14, "line-width": ["interpolate", ["exponential", 2], ["zoom"], 1, 1.5, 7, 40] },
      },
      {
        id: "highway",
        type: "line",
        source: "placeholder",
        filter: ["==", ["get", "kind"], "highway"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#FF8A3D", "line-opacity": 0.42, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 7, 5] },
      },
    ],
  };
}
