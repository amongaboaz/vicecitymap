import { placeholderMap, svgPath } from "@/lib/map/geometry";
import { demoCategories, demoDiscoveries } from "@/lib/discoveries/demo";
import { cn } from "@/lib/utils";

const colorBySlug = new Map(demoCategories.map((c) => [c.slug, c.color]));

/**
 * Static SVG rendering of the ORIGINAL placeholder map with demo markers.
 * Rendered on the server — zero client JS, crisp at any size.
 */
export function MapPreview({ className, markers = 60 }: { className?: string; markers?: number }) {
  const m = placeholderMap;
  const points = demoDiscoveries.filter((d) => d.access_level === "free").slice(0, markers);

  return (
    <svg viewBox="0 0 1000 1000" role="img" aria-label="Preview of the original placeholder map with demo markers" className={cn("block h-full w-full", className)}>
      <defs>
        <radialGradient id="mp-vignette" cx="50%" cy="45%" r="70%">
          <stop offset="60%" stopColor="#050607" stopOpacity="0" />
          <stop offset="100%" stopColor="#050607" stopOpacity="0.85" />
        </radialGradient>
        <pattern id="mp-grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
        </pattern>
        <filter id="mp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width="1000" height="1000" fill="#070a0e" />
      <rect width="1000" height="1000" fill="url(#mp-grid)" />
      {m.land.map((r, i) => (
        <path key={`glow-${i}`} d={svgPath(r)} fill="none" stroke="#5CF28B" strokeOpacity="0.18" strokeWidth="6" filter="url(#mp-glow)" />
      ))}
      {m.land.map((r, i) => (
        <path key={`land-${i}`} d={svgPath(r)} fill="#121519" stroke="rgba(92,242,139,0.35)" strokeWidth="1.2" />
      ))}
      {m.wetlands.map((r, i) => (
        <path key={`wet-${i}`} d={svgPath(r)} fill="#0f1a14" opacity="0.9" />
      ))}
      {m.parks.map((r, i) => (
        <path key={`park-${i}`} d={svgPath(r)} fill="#122219" />
      ))}
      <path d={svgPath(m.airport)} fill="#171b20" />
      {m.lakes.map((r, i) => (
        <path key={`lake-${i}`} d={svgPath(r)} fill="#070a0e" stroke="rgba(255,255,255,0.08)" />
      ))}
      {m.streets.map((l, i) => (
        <path key={`st-${i}`} d={svgPath(l, false)} stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" fill="none" />
      ))}
      {m.highways.map((l, i) => (
        <path key={`hw-${i}`} d={svgPath(l, false)} stroke="rgba(255,138,61,0.45)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ))}
      {m.runways.map((l, i) => (
        <path key={`rw-${i}`} d={svgPath(l, false)} stroke="rgba(255,255,255,0.18)" strokeWidth="5" fill="none" />
      ))}
      {m.districts.map((d) => (
        <text
          key={d.name}
          x={d.x}
          y={d.y}
          textAnchor="middle"
          fill="rgba(242,244,246,0.3)"
          fontSize="13"
          letterSpacing="3"
          style={{ fontFamily: "var(--font-geist-mono)", textTransform: "uppercase" }}
        >
          {d.name.toUpperCase()}
        </text>
      ))}
      {points.map((p) => (
        <g key={p.slug}>
          <circle cx={p.map_x} cy={p.map_y} r="9" fill={colorBySlug.get(p.category_slug)} opacity="0.15" />
          <circle cx={p.map_x} cy={p.map_y} r="4.2" fill={colorBySlug.get(p.category_slug)} stroke="#050607" strokeWidth="1.5" />
        </g>
      ))}
      <rect width="1000" height="1000" fill="url(#mp-vignette)" />
    </svg>
  );
}
