import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/rate-limit";
import { lngLatToMap, mapToLngLat, snapBBox } from "@/lib/map/projection";
import { bboxSchema, discoveryFormSchema, markerQuerySchema } from "@/lib/discoveries/validation";
import { safeRedirectPath, slugify } from "@/lib/utils";

describe("projection", () => {
  it("round-trips map units through lng/lat", () => {
    for (const [x, y] of [[0, 0], [500, 500], [123.4, 876.5], [1000, 1000]]) {
      const [lng, lat] = mapToLngLat(x, y);
      const [x2, y2] = lngLatToMap(lng, lat);
      expect(x2).toBeCloseTo(x, 6);
      expect(y2).toBeCloseTo(y, 6);
    }
  });
  it("maps the centre to 0,0", () => {
    const [lng, lat] = mapToLngLat(500, 500);
    expect(lng).toBeCloseTo(0);
    expect(lat).toBeCloseTo(0);
  });
  it("snaps bboxes outward and clamps to the map", () => {
    expect(snapBBox({ minX: -20, minY: 12, maxX: 1012, maxY: 61 })).toEqual({ minX: 0, minY: 0, maxX: 1000, maxY: 100 });
  });
});

describe("validation", () => {
  it("parses and normalises a bbox", () => {
    expect(bboxSchema.parse("400,300,100,50")).toEqual({ minX: 100, minY: 50, maxX: 400, maxY: 300 });
  });
  it("rejects out-of-range or malformed bboxes", () => {
    expect(bboxSchema.safeParse("0,0,2000,10").success).toBe(false);
    expect(bboxSchema.safeParse("a,b,c,d").success).toBe(false);
    expect(bboxSchema.safeParse("1,2,3").success).toBe(false);
  });
  it("caps marker page size", () => {
    expect(markerQuerySchema.safeParse({ limit: "5000" }).success).toBe(false);
    expect(markerQuerySchema.parse({}).limit).toBe(500);
  });
  it("rejects bad discovery input", () => {
    const r = discoveryFormSchema.safeParse({
      title: "x",
      slug: "Bad Slug!",
      categoryId: "nope",
      mapX: 1200,
      mapY: -1,
      accessLevel: "vip",
      verificationStatus: "verified",
      isPublished: true,
    });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["title", "slug", "categoryId", "mapX", "mapY", "accessLevel"]));
  });
});

describe("safeRedirectPath", () => {
  it("allows same-origin paths only", () => {
    expect(safeRedirectPath("/premium")).toBe("/premium");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("  Café Overlook #2! ")).toBe("cafe-overlook-2");
  });
});

describe("MemoryRateLimiter", () => {
  it("blocks after the limit and resets after the window", () => {
    let now = 0;
    const rl = new MemoryRateLimiter(2, 1000, () => now);
    expect(rl.check("k").ok).toBe(true);
    expect(rl.check("k").ok).toBe(true);
    expect(rl.check("k").ok).toBe(false);
    expect(rl.check("other").ok).toBe(true);
    now = 1001;
    expect(rl.check("k").ok).toBe(true);
  });
});
