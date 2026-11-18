import type { NextConfig } from "next";

function supabaseImageHost(): { protocol: "https"; hostname: string }[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    return [{ protocol: "https", hostname: new URL(url).hostname }];
  } catch {
    return [];
  }
}

function origin(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    // Tile templates contain {z}/{x}/{y}; only the origin matters.
    return new URL(url.trim().replace(/[{}]/g, "")).origin;
  } catch {
    return null;
  }
}

/**
 * Static CSP (no nonces, so pages can stay statically rendered).
 * - Supabase origin: REST/Auth/Storage fetches, signed image URLs, realtime websocket.
 * - Map tile origin: MapLibre fetches tiles with fetch() and draws them as images.
 * - worker-src blob: MapLibre bootstraps its worker module via a blob URL.
 * Stripe Checkout is a full-page redirect, so it needs no CSP allowance.
 */
function contentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const tiles = origin(process.env.NEXT_PUBLIC_MAP_TILES_URL);
  const remote = [supabase, tiles].filter(Boolean).join(" ");
  const ws = supabase ? supabase.replace(/^http/, "ws") : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${remote}`,
    "font-src 'self'",
    `connect-src 'self' ${remote} ${ws}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .map((d) => d.replace(/\s+/g, " ").trim())
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Admin image uploads go through a Server Action (images are capped at 5 MB in validation).
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: supabaseImageHost(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
