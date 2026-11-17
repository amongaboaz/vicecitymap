import type { AccessLevel, ProgressStatus, VerificationStatus } from "@/types/database";

export type CategoryDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isPremium: boolean;
  sortOrder: number;
  freeCount: number;
  premiumCount: number;
};

/** Lightweight marker payload for the map (no long text). */
export type MarkerDTO = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  x: number;
  y: number;
  accessLevel: AccessLevel;
  verification: VerificationStatus;
};

export type DiscoveryImageDTO = { id: string; url: string; alt: string };

export type DiscoveryDetailDTO = MarkerDTO & {
  summary: string;
  description: string;
  sourceNote: string | null;
  isDemo: boolean;
  updatedAt: string;
  images: DiscoveryImageDTO[];
  /** Premium-only extended info; null when locked or absent. */
  premiumDetails: string | null;
  premiumLocked: boolean;
  userState: { saved: boolean; progress: ProgressStatus | null } | null;
};

export type MarkerPage = { items: MarkerDTO[]; truncated: boolean };

export type UserMapState = {
  saved: string[];
  progress: Record<string, ProgressStatus>;
};

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };
