import { publicEnv } from "@/lib/env";

export const site = {
  name: "ViceCityMap",
  tagline: "The independent GTA 6 discovery map",
  description:
    "ViceCityMap is an independent, fan-made interactive discovery map for GTA 6 — locations, collectibles, missions, Easter eggs and hidden discoveries, verified as the community confirms them. Not affiliated with Rockstar Games.",
  url: publicEnv.siteUrl,
  disclaimer:
    "ViceCityMap is an independent fan project. It is not affiliated with, endorsed by, or sponsored by Rockstar Games or Take-Two Interactive. All trademarks belong to their respective owners.",
  contactEmail: "support@vicecitymap.example",
} as const;

export const nav = [
  { href: "/map", label: "Map" },
  { href: "/premium", label: "Premium" },
  { href: "/#faq", label: "FAQ" },
] as const;
