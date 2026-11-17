import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_VIEWER,
  canUseFeature,
  canViewDiscovery,
  checkoutEligibility,
  hasLifetimeAccess,
  LIFETIME_PRODUCT,
  type Viewer,
} from "@/lib/entitlements";

const free: Viewer = { userId: "u1", email: "a@b.c", isPremium: false, isAdmin: false };
const member: Viewer = { ...free, isPremium: true };
const admin: Viewer = { ...free, isAdmin: true };

describe("lifetime product", () => {
  it("is a $10 USD one-time product", () => {
    expect(LIFETIME_PRODUCT).toMatchObject({ code: "lifetime", amountCents: 1000, currency: "usd" });
  });
});

describe("hasLifetimeAccess", () => {
  it("is false with no entitlements", () => {
    expect(hasLifetimeAccess([])).toBe(false);
  });
  it("is true with an active lifetime entitlement", () => {
    expect(hasLifetimeAccess([{ product_code: "lifetime", revoked_at: null }])).toBe(true);
  });
  it("is false when the entitlement was revoked (e.g. refund)", () => {
    expect(hasLifetimeAccess([{ product_code: "lifetime", revoked_at: "2026-01-01T00:00:00Z" }])).toBe(false);
  });
  it("ignores other products", () => {
    expect(hasLifetimeAccess([{ product_code: "something-else", revoked_at: null }])).toBe(false);
  });
});

describe("canViewDiscovery", () => {
  const freeD = { access_level: "free" as const, is_published: true };
  const premiumD = { access_level: "premium" as const, is_published: true };
  const draft = { access_level: "free" as const, is_published: false };

  it("lets everyone see published free discoveries", () => {
    expect(canViewDiscovery(ANONYMOUS_VIEWER, freeD)).toBe(true);
    expect(canViewDiscovery(free, freeD)).toBe(true);
  });
  it("hides premium discoveries from anonymous and free users", () => {
    expect(canViewDiscovery(ANONYMOUS_VIEWER, premiumD)).toBe(false);
    expect(canViewDiscovery(free, premiumD)).toBe(false);
  });
  it("hides free discoveries in a premium-only category", () => {
    expect(canViewDiscovery(free, { ...freeD, categoryIsPremium: true })).toBe(false);
    expect(canViewDiscovery(member, { ...freeD, categoryIsPremium: true })).toBe(true);
  });
  it("shows premium discoveries to members and admins", () => {
    expect(canViewDiscovery(member, premiumD)).toBe(true);
    expect(canViewDiscovery(admin, premiumD)).toBe(true);
  });
  it("hides drafts from everyone except admins", () => {
    expect(canViewDiscovery(member, draft)).toBe(false);
    expect(canViewDiscovery(admin, draft)).toBe(true);
  });
  it("never grants premium to a signed-out viewer even if flagged premium", () => {
    expect(canViewDiscovery({ ...ANONYMOUS_VIEWER, isPremium: true }, premiumD)).toBe(false);
  });
});

describe("canUseFeature", () => {
  it("gates personal features behind premium", () => {
    for (const f of ["saved_locations", "progress_tracking", "advanced_filters", "hidden_discoveries"] as const) {
      expect(canUseFeature(free, f)).toBe(false);
      expect(canUseFeature(member, f)).toBe(true);
    }
  });
});

describe("checkoutEligibility", () => {
  it("requires sign in", () => {
    expect(checkoutEligibility(ANONYMOUS_VIEWER, true)).toEqual({ ok: false, reason: "not_signed_in" });
  });
  it("prevents buying twice", () => {
    expect(checkoutEligibility(member, true)).toEqual({ ok: false, reason: "already_member" });
  });
  it("refuses when no payment provider is configured", () => {
    expect(checkoutEligibility(free, false)).toEqual({ ok: false, reason: "payments_unavailable" });
  });
  it("allows a signed-in free user", () => {
    expect(checkoutEligibility(free, true)).toEqual({ ok: true });
  });
});
