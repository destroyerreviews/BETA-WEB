create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  whatsapp text,
  google_maps_url text not null,
  notes text,
  management_mode text,
  currency text not null default 'EUR',
  total_cents integer not null,
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint orders_currency_check check (currency = 'EUR'),
  constraint orders_total_cents_check check (total_cents > 0),
  constraint orders_status_check check (status in ('pending', 'review', 'in_progress', 'completed', 'cancelled')),
  constraint orders_payment_status_check check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  pack_slug text,
  pack_name text not null,
  reviews_count integer,
  quantity integer not null,
  unit_price_cents integer not null,
  subtotal_cents integer not null,
  created_at timestamptz default now(),
  constraint order_items_reviews_count_check check (reviews_count is null or reviews_count >= 0),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_unit_price_cents_check check (unit_price_cents > 0),
  constraint order_items_subtotal_cents_check check (subtotal_cents > 0),
  constraint order_items_subtotal_matches_check check (subtotal_cents = unit_price_cents * quantity)
);

create index if not exists orders_user_id_created_at_idx
on public.orders (user_id, created_at desc);

create index if not exists order_items_order_id_idx
on public.order_items (order_id);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;

create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders from anon;
revoke all on public.order_items from anon;

grant usage on schema public to authenticated;
revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

drop policy if exists "Users can view their own orders" on public.orders;
drop policy if exists "Users can create their own orders" on public.orders;
drop policy if exists "Users can view items from their own orders" on public.order_items;
drop policy if exists "Users can create items for their own orders" on public.order_items;

create policy "Users can view their own orders"
on public.orders
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own orders"
on public.orders
for insert
to authenticated
with check (
  user_id = auth.uid()
  and customer_email = (auth.jwt() ->> 'email')
  and currency = 'EUR'
  and status = 'pending'
  and payment_status = 'unpaid'
);

create policy "Users can view items from their own orders"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

create policy "Users can create items for their own orders"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop function if exists public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
);

drop function if exists public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
);

create or replace function public.create_order_with_items(
  p_customer_name text,
  p_whatsapp text,
  p_google_maps_url text,
  p_notes text,
  p_management_mode text,
  p_currency text,
  p_total_cents integer,
  p_items jsonb
)
returns table (
  id uuid,
  short_id text,
  status text,
  payment_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_item_count integer;
  v_items_total_cents integer;
  v_auth_email text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  v_auth_email := nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '');

  if v_auth_email is null then
    raise exception 'Authenticated email is required' using errcode = '23514';
  end if;

  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Customer name is required' using errcode = '23514';
  end if;

  if coalesce(trim(p_google_maps_url), '') = '' then
    raise exception 'Google Maps URL is required' using errcode = '23514';
  end if;

  if p_total_cents is null or p_total_cents <= 0 then
    raise exception 'Total cents must be greater than zero' using errcode = '23514';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Order items must be an array' using errcode = '23514';
  end if;

  v_item_count := jsonb_array_length(p_items);

  if v_item_count < 1 then
    raise exception 'Order must include at least one item' using errcode = '23514';
  end if;

  if coalesce(nullif(trim(coalesce(p_currency, '')), ''), 'EUR') <> 'EUR' then
    raise exception 'Only EUR currency is supported' using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(
      pack_slug text,
      pack_name text,
      reviews_count integer,
      quantity integer,
      unit_price_cents integer,
      subtotal_cents integer
    )
    where nullif(trim(coalesce(item.pack_name, '')), '') is null
      or item.quantity is null
      or item.quantity <= 0
      or item.unit_price_cents is null
      or item.unit_price_cents <= 0
      or item.subtotal_cents is null
      or item.subtotal_cents <= 0
      or item.subtotal_cents <> item.unit_price_cents * item.quantity
      or item.reviews_count < 0
  ) then
    raise exception 'Order items contain invalid values' using errcode = '23514';
  end if;

  select coalesce(sum(item.subtotal_cents), 0)
  into v_items_total_cents
  from jsonb_to_recordset(p_items) as item(
    pack_slug text,
    pack_name text,
    reviews_count integer,
    quantity integer,
    unit_price_cents integer,
    subtotal_cents integer
  );

  if v_items_total_cents <> p_total_cents then
    raise exception 'Order total does not match item subtotals' using errcode = '23514';
  end if;

  insert into public.orders as created_order (
    user_id,
    customer_name,
    customer_email,
    whatsapp,
    google_maps_url,
    notes,
    management_mode,
    currency,
    total_cents,
    status,
    payment_status
  )
  values (
    v_user_id,
    trim(p_customer_name),
    v_auth_email,
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    trim(p_google_maps_url),
    nullif(trim(coalesce(p_notes, '')), ''),
    nullif(trim(coalesce(p_management_mode, '')), ''),
    'EUR',
    p_total_cents,
    'pending',
    'unpaid'
  )
  returning created_order.id into v_order_id;

  insert into public.order_items (
    order_id,
    pack_slug,
    pack_name,
    reviews_count,
    quantity,
    unit_price_cents,
    subtotal_cents
  )
  select
    v_order_id,
    nullif(trim(coalesce(item.pack_slug, '')), ''),
    nullif(trim(coalesce(item.pack_name, '')), ''),
    item.reviews_count,
    item.quantity,
    item.unit_price_cents,
    item.subtotal_cents
  from jsonb_to_recordset(p_items) as item(
    pack_slug text,
    pack_name text,
    reviews_count integer,
    quantity integer,
    unit_price_cents integer,
    subtotal_cents integer
  );

  return query
  select
    created_order.id,
    upper(substr(replace(created_order.id::text, '-', ''), 1, 8)),
    created_order.status,
    created_order.payment_status,
    created_order.created_at
  from public.orders as created_order
  where created_order.id = v_order_id;
end;
$$;

revoke execute on function public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) from public;

revoke execute on function public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) from anon;

grant execute on function public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) to authenticated;
