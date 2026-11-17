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

const securityHeaders = [
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
