import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/account"];

/**
 * Refreshes the Supabase session cookie on every navigation and performs an
 * optimistic redirect for signed-out visitors on protected routes.
 * Authorisation (incl. admin role checks) is ALWAYS re-done on the server
 * in layouts, route handlers and server actions — this is not the gate.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        if (headers) for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, images and the payment webhook (which must receive the raw body untouched).
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|vendor/|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml|mjs)$).*)",
  ],
};
