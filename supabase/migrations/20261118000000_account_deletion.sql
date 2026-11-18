-- ════════════════════════════════════════════════════════════════════
-- Allow users to delete their account while retaining purchase records
-- for accounting: purchases are detached (user_id -> null) instead of
-- blocking deletion. Entitlements, progress, saves and profile cascade.
-- ════════════════════════════════════════════════════════════════════

alter table public.purchases alter column user_id drop not null;
alter table public.purchases drop constraint purchases_user_id_fkey;
alter table public.purchases
  add constraint purchases_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;

-- Entitlements cascade with the user, so the purchase reference must not block them.
alter table public.entitlements drop constraint entitlements_purchase_id_fkey;
alter table public.entitlements
  add constraint entitlements_purchase_id_fkey foreign key (purchase_id) references public.purchases (id) on delete set null;

-- Never fulfil a purchase whose account no longer exists.
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
  if v_purchase.user_id is null
     or v_purchase.user_id <> p_user_id
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

revoke all on function public.fulfill_purchase(text, text, text, uuid, uuid, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.fulfill_purchase(text, text, text, uuid, uuid, text, text, text, integer, text) to service_role;
