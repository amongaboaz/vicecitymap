import { z } from "zod";

const coord = z.number().finite().min(0).max(1000);

export const bboxSchema = z
  .string()
  .max(200)
  .transform((s) => s.split(",").map((v) => Number(v)))
  .pipe(z.tuple([coord, coord, coord, coord]))
  .transform(([minX, minY, maxX, maxY]) => ({
    minX: Math.min(minX, maxX),
    minY: Math.min(minY, maxY),
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
  }));

const idList = z
  .string()
  .max(2000)
  .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
  .pipe(z.array(z.string().min(1).max(100)).max(50));

export const markerQuerySchema = z.object({
  bbox: bboxSchema.optional(),
  categories: idList.optional(),
  verification: z.enum(["unverified", "community", "verified"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(25).default(12),
});

export const progressBodySchema = z.object({
  discoveryId: z.string().min(1).max(100),
  status: z.enum(["found", "completed"]).nullable(),
});

export const savedBodySchema = z.object({
  discoveryId: z.string().min(1).max(100),
  saved: z.boolean(),
});

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

export const discoveryFormSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug,
  summary: z.string().trim().max(280).default(""),
  description: z.string().trim().max(5000).default(""),
  premiumDetails: z.string().trim().max(10000).default(""),
  categoryId: z.uuid({ error: "Choose a category" }),
  mapX: z.coerce.number().finite().min(0).max(1000),
  mapY: z.coerce.number().finite().min(0).max(1000),
  accessLevel: z.enum(["free", "premium"]),
  verificationStatus: z.enum(["unverified", "community", "verified"]),
  isPublished: z.boolean(),
  sourceNote: z.string().trim().max(500).default(""),
});
export type DiscoveryFormInput = z.infer<typeof discoveryFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: slug.max(60),
  description: z.string().trim().max(500).default(""),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #5CF28B"),
  icon: z.string().trim().min(1).max(40).default("map-pin"),
  isPremium: z.boolean(),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
});

export const IMAGE_UPLOAD = {
  maxBytes: 5 * 1024 * 1024,
  types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>,
};
