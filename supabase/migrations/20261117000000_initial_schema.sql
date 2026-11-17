-- ════════════════════════════════════════════════════════════════════
-- ViceCityMap — initial schema
-- Tables, constraints, indexes, helper functions, Row Level Security,
-- storage bucket policies and payment fulfilment functions.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm with schema extensions;

-- ── Enums ───────────────────────────────────────────────────────────
create type public.access_level as enum ('free', 'premium');
create type public.verification_status as enum ('unverified', 'community', 'verified');
create type public.progress_status as enum ('found', 'completed');
create type public.purchase_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded');
create type public.admin_role as enum ('admin', 'editor');

-- ── updated_at trigger helper ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  avatar_url text check (char_length(avatar_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 60))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── admin_roles ─────────────────────────────────────────────────────
create table public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'admin',
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── categories ──────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 500),
  color text not null default '#5CF28B' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'map-pin' check (char_length(icon) <= 40),
  is_premium boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_sort_idx on public.categories (sort_order, name);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ── discoveries ─────────────────────────────────────────────────────
-- Coordinates are stored in abstract "map units" (0–1000 on both axes,
-- origin top-left), independent of any particular map image or tile set.
create table public.discoveries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 2 and 120),
  summary text not null default '' check (char_length(summary) <= 280),
  description text not null default '' check (char_length(description) <= 5000),
  category_id uuid not null references public.categories (id) on delete restrict,
  map_x double precision not null check (map_x >= 0 and map_x <= 1000),
  map_y double precision not null check (map_y >= 0 and map_y <= 1000),
  access_level public.access_level not null default 'free',
  verification_status public.verification_status not null default 'unverified',
  is_published boolean not null default false,
  is_demo boolean not null default false,
  source_note text check (char_length(source_note) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index discoveries_category_idx on public.discoveries (category_id);
create index discoveries_coords_idx on public.discoveries (map_x, map_y);
create index discoveries_visibility_idx on public.discoveries (is_published, access_level);
create index discoveries_title_trgm_idx on public.discoveries using gin (title extensions.gin_trgm_ops);
create trigger discoveries_updated_at before update on public.discoveries
  for each row execute function public.set_updated_at();

-- Premium-only extended information for a discovery (tips, walkthroughs).
create table public.discovery_premium_details (
  discovery_id uuid primary key references public.discoveries (id) on delete cascade,
  details text not null default '' check (char_length(details) <= 10000),
  updated_at timestamptz not null default now()
);
create trigger discovery_premium_details_updated_at before update on public.discovery_premium_details
  for each row execute function public.set_updated_at();

-- ── discovery_images ────────────────────────────────────────────────
create table public.discovery_images (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  alt text not null default '' check (char_length(alt) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index discovery_images_discovery_idx on public.discovery_images (discovery_id, sort_order);

-- ── user_progress ───────────────────────────────────────────────────
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,
  status public.progress_status not null default 'found',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, discovery_id)
);
create index user_progress_user_idx on public.user_progress (user_id, updated_at desc);
create trigger user_progress_updated_at before update on public.user_progress
  for each row execute function public.set_updated_at();

-- ── saved_locations ─────────────────────────────────────────────────
create table public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  discovery_id uuid references public.discoveries (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  note text check (char_length(note) <= 500),
  map_x double precision not null check (map_x >= 0 and map_x <= 1000),
  map_y double precision not null check (map_y >= 0 and map_y <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, discovery_id)
);
create index saved_locations_user_idx on public.saved_locations (user_id, created_at desc);

-- ── purchases ───────────────────────────────────────────────────────
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null check (provider in ('stripe', 'mpesa')),
  provider_reference text,            -- e.g. Stripe Checkout Session id
  provider_payment_id text,           -- e.g. Stripe PaymentIntent id
  product_code text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status public.purchase_status not null default 'pending',
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference),
  unique (provider, provider_payment_id)
);
create index purchases_user_idx on public.purchases (user_id, created_at desc);
create index purchases_status_idx on public.purchases (status, paid_at desc);
create trigger purchases_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();

-- ── entitlements ────────────────────────────────────────────────────
-- Permanent record of access granted. Revocation (e.g. refund) sets
-- revoked_at instead of deleting the row.
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_code text not null,
  purchase_id uuid references public.purchases (id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  unique (user_id, product_code)
);
create index entitlements_purchase_idx on public.entitlements (purchase_id);

-- ── payment_events (webhook idempotency + audit log) ───────────────
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  purchase_id uuid references public.purchases (id) on delete set null,
  outcome text not null,
  detail text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);
create index payment_events_purchase_idx on public.payment_events (purchase_id);

-- ════════════════════════════════════════════════════════════════════
-- Helper functions (SECURITY DEFINER so they can be used inside RLS
-- without recursive policy evaluation). search_path is pinned.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select uid is not null and exists (select 1 from public.admin_roles ar where ar.user_id = uid);
$$;

create or replace function public.has_lifetime_access(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select uid is not null and exists (
    select 1 from public.entitlements e
    where e.user_id = uid and e.product_code = 'lifetime' and e.revoked_at is null
  );
$$;

-- Aggregate counts per category (published only). Lets free users see how
-- much premium content exists without exposing the rows themselves.
create or replace function public.discovery_counts()
returns table (category_id uuid, access_level public.access_level, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select d.category_id, d.access_level, count(*)::bigint
  from public.discoveries d
  where d.is_published
  group by d.category_id, d.access_level;
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.has_lifetime_access(uuid) from public;
revoke all on function public.discovery_counts() from public;
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.has_lifetime_access(uuid) to anon, authenticated, service_role;
grant execute on function public.discovery_counts() to anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════
-- Payment fulfilment — called ONLY by the server webhook handler with the
-- service role, after the provider signature has been verified and the
-- payload validated. Atomic and idempotent.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.fulfill_purchase(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_purchase_id uuid,
  p_user_id uuid,
  p_provider_reference text,
  p_provider_payment_id text,
  p_product_code text,
  p_amount_cents integer,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.purchases%rowtype;
  v_inserted integer;
begin
  insert into public.payment_events (provider, event_id, event_type, purchase_id, outcome)
  values (p_provider, p_event_id, p_event_type, p_purchase_id, 'fulfilled')
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate_event';
  end if;

  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'purchase % not found', p_purchase_id;
  end if;
  if v_purchase.user_id <> p_user_id
     or v_purchase.provider <> p_provider
     or v_purchase.product_code <> p_product_code
     or v_purchase.amount_cents <> p_amount_cents
     or v_purchase.currency <> p_currency
     or (v_purchase.provider_reference is not null and v_purchase.provider_reference <> p_provider_reference) then
    raise exception 'purchase % does not match payment event', p_purchase_id;
  end if;

  if v_purchase.status = 'paid' then
    return 'already_paid';
  end if;
  if v_purchase.status = 'refunded' then
    return 'already_refunded';
  end if;

  update public.purchases
     set status = 'paid',
         paid_at = now(),
         provider_reference = coalesce(provider_reference, p_provider_reference),
         provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id)
   where id = p_purchase_id;

  insert into public.entitlements (user_id, product_code, purchase_id)
  values (p_user_id, p_product_code, p_purchase_id)
  on conflict (user_id, product_code)
  do update set revoked_at = null, revoke_reason = null, purchase_id = excluded.purchase_id, granted_at = now()
  where public.entitlements.revoked_at is not null;

  return 'fulfilled';
end;
$$;

create or replace function public.refund_purchase(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_provider_payment_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.purchases%rowtype;
  v_inserted integer;
begin
  select * into v_purchase from public.purchases
   where provider = p_provider and provider_payment_id = p_provider_payment_id
   for update;

  insert into public.payment_events (provider, event_id, event_type, purchase_id, outcome)
  values (p_provider, p_event_id, p_event_type, v_purchase.id, case when v_purchase.id is null then 'not_found' else 'refunded' end)
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate_event';
  end if;
  if v_purchase.id is null then
    return 'not_found';
  end if;

  update public.purchases set status = 'refunded', refunded_at = now() where id = v_purchase.id;
  update public.entitlements
     set revoked_at = now(), revoke_reason = 'refunded'
   where purchase_id = v_purchase.id and revoked_at is null;
  return 'refunded';
end;
$$;

create or replace function public.record_payment_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_purchase_id uuid,
  p_outcome text,
  p_detail text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  insert into public.payment_events (provider, event_id, event_type, purchase_id, outcome, detail)
  values (p_provider, p_event_id, p_event_type, p_purchase_id, p_outcome, left(p_detail, 500))
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate_event';
  end if;
  if p_purchase_id is not null and p_outcome in ('failed', 'expired') then
    update public.purchases
       set status = p_outcome::public.purchase_status
     where id = p_purchase_id and status = 'pending';
  end if;
  return 'recorded';
end;
$$;

revoke all on function public.fulfill_purchase(text, text, text, uuid, uuid, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.refund_purchase(text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_payment_event(text, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.fulfill_purchase(text, text, text, uuid, uuid, text, text, text, integer, text) to service_role;
grant execute on function public.refund_purchase(text, text, text, text) to service_role;
grant execute on function public.record_payment_event(text, text, text, uuid, text, text) to service_role;

-- ════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.categories enable row level security;
alter table public.discoveries enable row level security;
alter table public.discovery_premium_details enable row level security;
alter table public.discovery_images enable row level security;
alter table public.user_progress enable row level security;
alter table public.saved_locations enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;
alter table public.payment_events enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- admin_roles (managed via SQL / service role only)
create policy "admin_roles: read own or admin" on public.admin_roles
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- categories
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: admin insert" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "categories: admin update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories: admin delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- discoveries: free published rows are public; premium rows need the
-- lifetime entitlement; admins see everything including drafts.
create policy "discoveries: visible by access level" on public.discoveries
  for select to anon, authenticated using (
    (is_published and (access_level = 'free' or public.has_lifetime_access()))
    or public.is_admin()
  );
create policy "discoveries: admin insert" on public.discoveries
  for insert to authenticated with check (public.is_admin());
create policy "discoveries: admin update" on public.discoveries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "discoveries: admin delete" on public.discoveries
  for delete to authenticated using (public.is_admin());

-- premium details: lifetime members (for visible discoveries) and admins
create policy "premium details: members" on public.discovery_premium_details
  for select to authenticated using (
    public.is_admin()
    or (public.has_lifetime_access() and exists (
      select 1 from public.discoveries d where d.id = discovery_id and d.is_published
    ))
  );
create policy "premium details: admin write" on public.discovery_premium_details
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- images follow the visibility of their discovery (subquery is RLS-checked)
create policy "images: follow discovery visibility" on public.discovery_images
  for select to anon, authenticated using (
    exists (select 1 from public.discoveries d where d.id = discovery_id)
  );
create policy "images: admin write" on public.discovery_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- user_progress: own rows only; writing requires lifetime access
create policy "progress: read own" on public.user_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "progress: insert own (members)" on public.user_progress
  for insert to authenticated with check (user_id = (select auth.uid()) and public.has_lifetime_access());
create policy "progress: update own (members)" on public.user_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_lifetime_access());
create policy "progress: delete own" on public.user_progress
  for delete to authenticated using (user_id = (select auth.uid()));

-- saved_locations: own rows only; writing requires lifetime access
create policy "saved: read own" on public.saved_locations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved: insert own (members)" on public.saved_locations
  for insert to authenticated with check (user_id = (select auth.uid()) and public.has_lifetime_access());
create policy "saved: update own (members)" on public.saved_locations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_lifetime_access());
create policy "saved: delete own" on public.saved_locations
  for delete to authenticated using (user_id = (select auth.uid()));

-- purchases / entitlements: read own (admins read all). No client writes —
-- rows are created by the server and fulfilled only by the webhook.
create policy "purchases: read own or admin" on public.purchases
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "entitlements: read own or admin" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "payment_events: admin read" on public.payment_events
  for select to authenticated using (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- Storage: private bucket for discovery images. Read access mirrors the
-- discovery's visibility (served through short-lived signed URLs).
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('discovery-images', 'discovery-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "discovery images: read when discovery visible" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'discovery-images'
    and exists (select 1 from public.discovery_images di where di.storage_path = objects.name)
  );
create policy "discovery images: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'discovery-images' and public.is_admin());
create policy "discovery images: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'discovery-images' and public.is_admin());
create policy "discovery images: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'discovery-images' and public.is_admin());
