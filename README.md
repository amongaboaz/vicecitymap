# ViceCityMap

An independent, unofficial interactive discovery map for GTA 6. Free public map, plus a **$10 one-time lifetime Premium** membership.

> **Not affiliated with Rockstar Games or Take-Two Interactive.** The bundled map is an **original placeholder** drawn for this project, and the bundled markers are **clearly labelled demonstration data** — not game information. Replace them with verified, legally usable content only.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, strict TypeScript |
| Styling | Tailwind CSS v4, hand-rolled shadcn-style primitives (`src/components/ui`) |
| Map | MapLibre GL JS 6 — GeoJSON clustering, HTML cluster markers, viewport-based loading |
| Data/Auth/Files | Supabase Postgres + RLS, Supabase Auth (email/password), Supabase Storage (private bucket + signed URLs) |
| Payments | Provider abstraction, Stripe Checkout first (one-time USD 10, webhook-verified) |
| Tests | Vitest (entitlements, payment fulfilment, Stripe signature verification, validation, rate limiting) |
| Hosting | Vercel |

## Quick start (demo mode — no credentials needed)

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. With no Supabase keys the app runs in **demo mode**: the map works with 140 bundled demo markers on the placeholder map; sign-in, dashboard, admin and checkout are disabled and say so.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (copies the MapLibre worker into `public/vendor` first) |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
| `npm run typecheck` | Generates Next route types, then `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run check` | All of the above in sequence |
| `npm run demo-data` | Regenerates `supabase/demo/demo-data.json` and `supabase/seed.sql` |

## Project structure

```
src/
  app/
    (site)/            marketing + account pages with header/footer (home, premium, auth, dashboard, legal)
    map/               full-screen interactive map
    admin/             admin area (server-side role gate in layout + every action)
    api/               route handlers: discoveries (bbox/search/detail), me, progress, saved, checkout, webhooks/stripe
    auth/callback/     Supabase email-link handler (PKCE code + token_hash)
  components/          ui primitives, site chrome, home sections, map, admin, auth, premium
  lib/
    entitlements/      PURE access rules (shared by API, demo mode, tests; mirrors RLS)
    payments/          provider interface, Stripe provider, pure fulfilment logic, Supabase store, checkout
    discoveries/       repository (Supabase or demo), DTO types, zod validation
    map/               map-unit projection, placeholder geometry
    supabase/          server (RLS, user session), browser, admin (service role, server-only) clients
    auth/              viewer DAL (getViewer/requireUser/requireAdmin), auth server actions
    admin/             admin server actions
  proxy.ts             session refresh + optimistic redirects (Next 16 "proxy" = middleware)
  types/database.ts    typed schema for supabase-js
supabase/
  migrations/          schema, RLS, storage policies, payment SQL functions
  seed.sql             DEMONSTRATION categories + markers (is_demo = true)
tests/                 vitest suites
```

## 1. Supabase setup

1. Create a project at https://supabase.com.
2. **Apply the migration.** Either paste `supabase/migrations/20261117000000_initial_schema.sql` into the SQL editor and run it, or with the CLI:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
   ```bash
   npx supabase db push
   ```
3. **(Optional) load demo data** — run `supabase/seed.sql` in the SQL editor. Every row is flagged `is_demo = true`; remove later with `delete from public.discoveries where is_demo;`.
4. **Auth settings** (Authentication → URL Configuration): set *Site URL* to your domain and add `https://<domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to *Redirect URLs*.
5. Copy keys into `.env.local` (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable/anon key)
   - `SUPABASE_SECRET_KEY` (secret/service-role key — **server only**, used by the webhook, checkout purchase creation and admin user list)
6. **Make yourself an admin** after registering an account (SQL editor):
   ```sql
   insert into public.admin_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```
   Admin roles can only be granted via SQL/service role — there is no client path to escalate.

### What the database enforces (RLS)

- `discoveries`: published **free** rows are public; **premium** rows require `has_lifetime_access()`; drafts and all writes are admin-only.
- `discovery_premium_details`: members (and admins) only. `discovery_images` + the private `discovery-images` storage bucket follow their discovery's visibility.
- `user_progress`, `saved_locations`: owner-only reads; writes require ownership **and** lifetime access.
- `purchases`, `entitlements`: owner/admin read only; **no client writes**. Fulfilment happens only in `fulfill_purchase()` / `refund_purchase()` (SECURITY DEFINER, executable by `service_role` only).
- `payment_events`: unique `(provider, event_id)` → webhook idempotency + audit trail.

## 2. Stripe setup (payments)

Stripe is the initial provider, subject to your Stripe account's eligibility. Without these variables checkout is **disabled** — there is no simulated/fake success path.

1. Set `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_test_…`.
2. Create a webhook endpoint at `https://<domain>/api/webhooks/stripe` subscribed to:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Optional: `STRIPE_PRICE_ID` for a pre-made one-time USD 10.00 price. Otherwise the price is defined inline. Either way the webhook re-checks amount (1000), currency (usd) and product.
4. Local testing with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Use the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET`, then pay with test card `4242 4242 4242 4242`.

**Payment flow:** `POST /api/checkout` (signed-in, rate-limited, same-origin) → inserts a `pending` purchase → creates a Checkout Session (idempotency key = purchase id, metadata = purchase/user/product) → user pays → Stripe calls the webhook → signature verified on the raw body → event normalised → validated against the stored purchase (user, provider reference, product, amount, currency) → `fulfill_purchase()` atomically records the event, marks the purchase paid and grants the permanent entitlement. The `/premium/success` page only *polls* `/api/me`; it never grants access. Full refunds revoke the entitlement (row kept, `revoked_at` set).

**Adding M-Pesa (or another provider) later:** implement `PaymentProvider` in `src/lib/payments/<provider>.ts`, register it in `src/lib/payments/index.ts`, add a webhook/callback route that calls `provider.parseWebhook` and `handlePaymentEvent`. The `purchases.provider` check constraint already allows `'mpesa'`.

## 3. Replacing the placeholder map

Coordinates are stored in abstract **map units**: 0–1000 on each axis, origin top-left. The whole square maps onto the Web-Mercator world, so a single **square** map image cut into standard XYZ tiles lines up exactly (tile z0 = whole image).

1. Obtain a map image you are **legally allowed** to use.
2. Cut it into XYZ tiles (e.g. `gdal2tiles.py --xyz -p raster image.png tiles/`, or any "image to XYZ tiles" tool) and host them (Supabase Storage, S3, R2…).
3. Set `NEXT_PUBLIC_MAP_TILES_URL=https://…/{z}/{x}/{y}.png`, `NEXT_PUBLIC_MAP_TILES_ATTRIBUTION`, and `NEXT_PUBLIC_MAP_MAX_ZOOM` to your deepest tile level.
4. Re-position discoveries against the new artwork (admins see live `x/y` under the cursor on `/map`).

The placeholder geometry lives in `src/lib/map/placeholder-geometry.json` and is entirely original.

## 4. Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel (framework preset: Next.js; Node ≥ 20.9).
2. Add all variables from `.env.example` in *Project → Settings → Environment Variables*. Set `NEXT_PUBLIC_SITE_URL` to the production URL.
3. Deploy. Then update the Supabase redirect URLs and the Stripe webhook URL to the production domain.
4. Use Stripe **live** keys only once your account is approved; the server logs a warning if a test key is used in production.

## Security notes

- All inputs validated server-side with zod; admin pages and every admin server action call `requireAdmin()`; RLS enforces the same rules again in Postgres.
- Webhook signature verified against the raw body; idempotent on event id; amount/currency/product/user/reference validated.
- Service-role key is only imported in `server-only` modules.
- JSON mutation endpoints reject cross-origin requests; auth actions return generic messages (no account enumeration); open-redirects blocked.
- Rate limiting (`src/lib/rate-limit.ts`) is **in-memory per instance** — abuse damping only on serverless. Swap the store for Redis/Upstash for strict global limits.
- Image uploads: type allow-list, magic-byte check, 5 MB cap, private bucket served via short-lived signed URLs.
- Security headers set in `next.config.ts`. A Content-Security-Policy is not yet configured (MapLibre needs `worker-src 'self' blob:`); add one before launch if required.

## Verification status

| Area | Status |
| --- | --- |
| Lint, typecheck, unit tests (48), production build | ✅ passing locally |
| Homepage, premium, legal, auth pages render | ✅ checked in browser |
| Map: placeholder basemap, clustering, viewport loading, filters, search, detail panel, premium locks, deep links, mobile layout | ✅ checked in browser (demo mode) |
| API access control in demo mode (no premium leakage, 404 on premium detail, 400 on bad input, CSRF/auth guards) | ✅ checked with curl |
| Supabase migration, RLS policies, auth emails, dashboard & admin with real data | ⚠️ **not yet verified** — needs a Supabase project |
| Stripe checkout + live webhook round-trip | ⚠️ **not yet verified** — needs Stripe keys (signature verification and fulfilment logic are unit-tested) |
