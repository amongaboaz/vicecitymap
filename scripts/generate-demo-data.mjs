#!/usr/bin/env node
/**
 * Generates DEMONSTRATION data for ViceCityMap.
 *
 *   node scripts/generate-demo-data.mjs
 *
 * Outputs:
 *   supabase/demo/demo-data.json  – used by the app in demo mode (no Supabase)
 *   supabase/seed.sql             – loads the same rows into Supabase
 *
 * Every generated marker is fictional and clearly labelled "Demo". Positions are
 * random points on the ORIGINAL placeholder map — they are not game coordinates.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const geometry = JSON.parse(readFileSync(resolve(root, "src/lib/map/placeholder-geometry.json"), "utf8"));

export const categories = [
  { slug: "locations", name: "Locations", singular: "Location", color: "#E6EAF0", icon: "map-pin", is_premium: false, sort_order: 10, description: "Notable places and landmarks." },
  { slug: "collectibles", name: "Collectibles", singular: "Collectible", color: "#5CF28B", icon: "gem", is_premium: false, sort_order: 20, description: "Items to find and track." },
  { slug: "missions", name: "Missions", singular: "Mission", color: "#FF8A3D", icon: "flag", is_premium: false, sort_order: 30, description: "Mission start points." },
  { slug: "easter-eggs", name: "Easter Eggs", singular: "Easter Egg", color: "#C9A7FF", icon: "sparkles", is_premium: false, sort_order: 40, description: "Secrets and references." },
  { slug: "businesses", name: "Businesses", singular: "Business", color: "#62C6F2", icon: "store", is_premium: false, sort_order: 50, description: "Shops and services." },
  { slug: "properties", name: "Properties", singular: "Property", color: "#F2C94C", icon: "home", is_premium: false, sort_order: 60, description: "Purchasable properties." },
  { slug: "vehicles", name: "Vehicles", singular: "Vehicle", color: "#F2665C", icon: "car", is_premium: false, sort_order: 70, description: "Vehicle spawn locations." },
  { slug: "hidden", name: "Hidden Discoveries", singular: "Hidden Discovery", color: "#9AA4FF", icon: "eye-off", is_premium: true, sort_order: 80, description: "Rare and hidden finds. Premium only." },
];

const counts = { locations: 22, collectibles: 34, missions: 14, "easter-eggs": 12, businesses: 18, properties: 12, vehicles: 14, hidden: 14 };
const premiumShare = { locations: 0.15, collectibles: 0.6, missions: 0.5, "easter-eggs": 0.6, businesses: 0.1, properties: 0.3, vehicles: 0.5, hidden: 1 };

// Deterministic PRNG (mulberry32) so regenerated data is stable.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261117);

function inPolygon([x, y], pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inLake([x, y]) {
  return geometry.lakes.some((l) => ((x - l.cx) / (l.rx + 8)) ** 2 + ((y - l.cy) / (l.ry + 8)) ** 2 <= 1);
}
function randomLandPoint() {
  for (;;) {
    const p = [10 + rand() * 960, 10 + rand() * 970];
    if (geometry.land.some((l) => inPolygon(p, l.points)) && !inLake(p)) {
      return p.map((v) => Math.round(v * 10) / 10);
    }
  }
}

const discoveries = [];
for (const cat of categories) {
  for (let i = 1; i <= counts[cat.slug]; i++) {
    const n = String(i).padStart(2, "0");
    const [x, y] = randomLandPoint();
    const premium = cat.is_premium || rand() < premiumShare[cat.slug];
    discoveries.push({
      slug: `demo-${cat.slug}-${n}`,
      title: `Demo ${cat.singular} ${n}`,
      summary: "Demonstration marker — placeholder data, not real game information.",
      description:
        `This is a sample ${cat.singular.toLowerCase()} used to demonstrate how ViceCityMap displays discoveries. ` +
        "Its name, position and details are invented for testing and do not describe anything in GTA 6.",
      category_slug: cat.slug,
      map_x: x,
      map_y: y,
      access_level: premium ? "premium" : "free",
      verification_status: "unverified",
      premium_details: premium || rand() < 0.5
        ? "Premium detail placeholder: verified walkthrough notes, requirements and screenshots will appear here once real information is confirmed."
        : null,
    });
  }
}

writeFileSync(
  resolve(root, "supabase/demo/demo-data.json"),
  JSON.stringify({ _notice: "DEMONSTRATION DATA — fictional markers on an original placeholder map. Not game information.", categories, discoveries }, null, 2) + "\n",
);

const q = (s) => (s === null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
let sql = `-- ════════════════════════════════════════════════════════════════════
-- ViceCityMap DEMONSTRATION seed data (generated by scripts/generate-demo-data.mjs)
-- All discoveries below are FICTIONAL demo markers (is_demo = true) placed on the
-- original placeholder map. They are not GTA 6 information. Delete them with:
--   delete from public.discoveries where is_demo;
-- ════════════════════════════════════════════════════════════════════

insert into public.categories (slug, name, description, color, icon, is_premium, sort_order) values
${categories.map((c) => `  (${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${q(c.color)}, ${q(c.icon)}, ${c.is_premium}, ${c.sort_order})`).join(",\n")}
on conflict (slug) do nothing;

insert into public.discoveries (slug, title, summary, description, category_id, map_x, map_y, access_level, verification_status, is_published, is_demo, source_note)
select v.slug, v.title, v.summary, v.description, c.id, v.map_x, v.map_y, v.access_level::public.access_level, v.verification_status::public.verification_status, true, true, 'Demonstration data'
from (values
${discoveries.map((d) => `  (${q(d.slug)}, ${q(d.title)}, ${q(d.summary)}, ${q(d.description)}, ${q(d.category_slug)}, ${d.map_x}, ${d.map_y}, ${q(d.access_level)}, ${q(d.verification_status)})`).join(",\n")}
) as v(slug, title, summary, description, category_slug, map_x, map_y, access_level, verification_status)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

insert into public.discovery_premium_details (discovery_id, details)
select d.id, v.details
from (values
${discoveries.filter((d) => d.premium_details).map((d) => `  (${q(d.slug)}, ${q(d.premium_details)})`).join(",\n")}
) as v(slug, details)
join public.discoveries d on d.slug = v.slug
on conflict (discovery_id) do nothing;
`;
writeFileSync(resolve(root, "supabase/seed.sql"), sql);
console.log(`Generated ${categories.length} categories and ${discoveries.length} demo discoveries.`);
