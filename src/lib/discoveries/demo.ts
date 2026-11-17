/**
 * DEMO MODE data source — used only when Supabase is not configured.
 * Fictional markers on the original placeholder map (see supabase/demo).
 */
import demo from "../../../supabase/demo/demo-data.json";
import type { AccessLevel, VerificationStatus } from "@/types/database";

export type DemoCategory = {
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_premium: boolean;
  sort_order: number;
};

export type DemoDiscovery = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category_slug: string;
  map_x: number;
  map_y: number;
  access_level: AccessLevel;
  verification_status: VerificationStatus;
  premium_details: string | null;
};

export const demoCategories = demo.categories as DemoCategory[];
export const demoDiscoveries = demo.discoveries as DemoDiscovery[];
