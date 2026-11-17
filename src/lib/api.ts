import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientIp, rateLimit, type LimiterName } from "@/lib/rate-limit";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function limitOrNull(request: Request, name: LimiterName, key?: string) {
  const result = rateLimit(name, key ?? clientIp(request.headers));
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
  );
}

export function parseSearchParams<T extends z.ZodType>(schema: T, url: string) {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  return schema.safeParse(params);
}

export async function parseJsonBody<T extends z.ZodType>(schema: T, request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { success: false as const, error: null };
  }
  return schema.safeParse(body);
}

/** Basic CSRF defence for cookie-authenticated JSON endpoints. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers / server calls
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
