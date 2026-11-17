/**
 * Pure entitlement rules. No I/O — shared by server code, demo mode and tests.
 * The database enforces the same rules through RLS (see migrations); this
 * module decides what the UI and API layer expose.
 */
import type { AccessLevel } from "@/types/database";

export const LIFETIME_PRODUCT = {
  code: "lifetime",
  name: "ViceCityMap Lifetime Access",
  amountCents: 1000,
  currency: "usd",
} as const;

export type EntitlementRecord = {
  product_code: string;
  revoked_at: string | null;
};

export type Viewer = {
  userId: string | null;
  email: string | null;
  isPremium: boolean;
  isAdmin: boolean;
};

export const ANONYMOUS_VIEWER: Viewer = { userId: null, email: null, isPremium: false, isAdmin: false };

export type PremiumFeature =
  | "premium_discoveries"
  | "premium_details"
  | "hidden_discoveries"
  | "advanced_filters"
  | "saved_locations"
  | "progress_tracking";

/** A user has lifetime access when an unrevoked entitlement for the lifetime product exists. */
export function hasLifetimeAccess(entitlements: readonly EntitlementRecord[]): boolean {
  return entitlements.some((e) => e.product_code === LIFETIME_PRODUCT.code && e.revoked_at === null);
}

/** Every premium feature is part of the single lifetime product today. */
const LIFETIME_FEATURES: ReadonlySet<PremiumFeature> = new Set<PremiumFeature>([
  "premium_discoveries",
  "premium_details",
  "hidden_discoveries",
  "advanced_filters",
  "saved_locations",
  "progress_tracking",
]);

/** Admins can use every feature so they can review premium content. */
export function canUseFeature(viewer: Viewer, feature: PremiumFeature): boolean {
  if (viewer.isAdmin) return true;
  return viewer.userId !== null && viewer.isPremium && LIFETIME_FEATURES.has(feature);
}

export type VisibilityInput = {
  access_level: AccessLevel;
  is_published: boolean;
  categoryIsPremium?: boolean;
};

/** Mirrors the `discoveries: visible by access level` RLS policy. */
export function canViewDiscovery(viewer: Viewer, d: VisibilityInput): boolean {
  if (viewer.isAdmin) return true;
  if (!d.is_published) return false;
  const premium = d.access_level === "premium" || d.categoryIsPremium === true;
  return !premium || canUseFeature(viewer, "premium_discoveries");
}

export type CheckoutEligibility =
  | { ok: true }
  | { ok: false; reason: "not_signed_in" | "already_member" | "payments_unavailable" };

export function checkoutEligibility(viewer: Viewer, paymentsConfigured: boolean): CheckoutEligibility {
  if (!viewer.userId) return { ok: false, reason: "not_signed_in" };
  if (viewer.isPremium) return { ok: false, reason: "already_member" };
  if (!paymentsConfigured) return { ok: false, reason: "payments_unavailable" };
  return { ok: true };
}
