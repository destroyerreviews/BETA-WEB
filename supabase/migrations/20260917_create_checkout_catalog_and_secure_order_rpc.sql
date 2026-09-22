create extension if not exists pgcrypto;

create table if not exists public.checkout_catalog_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kind text not null,
  display_name text not null,
  reviews_per_unit integer not null,
  unit_price_cents integer not null,
  currency text not null default 'EUR',
  max_quantity_per_order integer not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint checkout_catalog_items_kind_check check (kind in ('pack', 'addon')),
  constraint checkout_catalog_items_reviews_per_unit_check check (reviews_per_unit >= 0),
  constraint checkout_catalog_items_unit_price_cents_check check (unit_price_cents > 0),
  constraint checkout_catalog_items_currency_check check (currency = 'EUR'),
  constraint checkout_catalog_items_max_quantity_per_order_check check (max_quantity_per_order > 0)
);

insert into public.checkout_catalog_items (
  slug,
  kind,
  display_name,
  reviews_per_unit,
  unit_price_cents,
  currency,
  max_quantity_per_order,
  is_active,
  display_order
)
values
  ('ambar', 'pack', 'Ámbar', 1, 400, 'EUR', 4, true, 10),
  ('amatista', 'pack', 'Amatista', 10, 3700, 'EUR', 4, true, 20),
  ('diamante', 'pack', 'Diamante', 25, 8700, 'EUR', 4, true, 30),
  ('rubi', 'pack', 'Rubí', 50, 16600, 'EUR', 4, true, 40),
  ('personalizacion-resenas', 'addon', 'Personalización de reseñas', 0, 100, 'EUR', 200, true, 50)
on conflict (slug) do nothing;

create or replace function public.set_checkout_catalog_items_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_checkout_catalog_items_updated_at on public.checkout_catalog_items;

create trigger set_checkout_catalog_items_updated_at
before update on public.checkout_catalog_items
for each row
execute function public.set_checkout_catalog_items_updated_at();

alter table public.checkout_catalog_items enable row level security;

revoke all on table public.checkout_catalog_items from public;
revoke all on table public.checkout_catalog_items from anon;
revoke all on table public.checkout_catalog_items from authenticated;

revoke execute on function public.set_checkout_catalog_items_updated_at() from public;
revoke execute on function public.set_checkout_catalog_items_updated_at() from anon;
revoke execute on function public.set_checkout_catalog_items_updated_at() from authenticated;

create or replace function public.get_checkout_catalog()
returns table (
  slug text,
  kind text,
  display_name text,
  reviews_per_unit integer,
  unit_price_cents integer,
  currency text,
  max_quantity_per_order integer,
  display_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    catalog_item.slug,
    catalog_item.kind,
    catalog_item.display_name,
    catalog_item.reviews_per_unit,
    catalog_item.unit_price_cents,
    catalog_item.currency,
    catalog_item.max_quantity_per_order,
    catalog_item.display_order
  from public.checkout_catalog_items as catalog_item
  where catalog_item.is_active = true
  order by catalog_item.display_order, catalog_item.slug;
$$;

revoke execute on function public.get_checkout_catalog() from public;
revoke execute on function public.get_checkout_catalog() from anon;
grant execute on function public.get_checkout_catalog() to authenticated;

alter table public.orders
  add column if not exists idempotency_key uuid,
  add column if not exists request_fingerprint text,
  add column if not exists creation_version smallint not null default 1;

alter table public.orders
  alter column creation_version set default 1,
  alter column creation_version set not null;

create unique index if not exists orders_user_id_idempotency_key_uidx
on public.orders (user_id, idempotency_key)
where idempotency_key is not null;

alter table public.order_items
  add column if not exists catalog_item_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.order_items'::pg_catalog.regclass
      and constraint_row.conname = 'order_items_catalog_item_id_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_catalog_item_id_fkey
      foreign key (catalog_item_id)
      references public.checkout_catalog_items(id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists order_items_catalog_item_id_idx
on public.order_items (catalog_item_id);

revoke truncate, references, trigger on table public.orders from authenticated;
revoke truncate, references, trigger on table public.order_items from authenticated;

create or replace function public.create_order_from_catalog(
  p_customer_name text,
  p_whatsapp text,
  p_google_maps_url text,
  p_notes text,
  p_management_mode text,
  p_items jsonb,
  p_idempotency_key uuid
)
returns table (
  id uuid,
  short_id text,
  status text,
  payment_status text,
  currency text,
  total_cents integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_auth_email text;
  v_customer_name text;
  v_whatsapp text;
  v_google_maps_url text;
  v_notes text;
  v_management_mode text;
  v_normalized_items jsonb;
  v_request_fingerprint text;
  v_existing_order public.orders%rowtype;
  v_item_count integer;
  v_total_units bigint;
  v_total_reviews bigint;
  v_pack_total_cents bigint;
  v_total_cents_bigint bigint;
  v_addon_id uuid;
  v_addon_display_name text;
  v_addon_unit_price_cents integer;
  v_addon_currency text;
  v_addon_max_quantity integer;
  v_orders_last_ten_minutes bigint;
  v_orders_last_day bigint;
  v_order_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  v_auth_email := nullif(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')), '');

  if v_auth_email is null then
    raise exception 'authenticated_email_required' using errcode = '23514';
  end if;

  v_customer_name := nullif(pg_catalog.btrim(coalesce(p_customer_name, '')), '');
  v_whatsapp := nullif(pg_catalog.btrim(coalesce(p_whatsapp, '')), '');
  v_google_maps_url := nullif(pg_catalog.btrim(coalesce(p_google_maps_url, '')), '');
  v_notes := nullif(pg_catalog.btrim(coalesce(p_notes, '')), '');
  v_management_mode := pg_catalog.lower(pg_catalog.btrim(coalesce(p_management_mode, '')));

  if v_customer_name is null then
    raise exception 'customer_name_required' using errcode = '23514';
  end if;

  if pg_catalog.char_length(v_customer_name) > 120 then
    raise exception 'customer_name_too_long' using errcode = '23514';
  end if;

  if v_whatsapp is not null and pg_catalog.char_length(v_whatsapp) > 32 then
    raise exception 'whatsapp_too_long' using errcode = '23514';
  end if;

  if v_google_maps_url is null then
    raise exception 'google_maps_url_required' using errcode = '23514';
  end if;

  if pg_catalog.char_length(v_google_maps_url) > 2048 then
    raise exception 'google_maps_url_too_long' using errcode = '23514';
  end if;

  if v_notes is not null and pg_catalog.char_length(v_notes) > 2000 then
    raise exception 'notes_too_long' using errcode = '23514';
  end if;

  if v_management_mode not in ('manual', 'team') then
    raise exception 'invalid_management_mode' using errcode = '23514';
  end if;

  if p_idempotency_key is null then
    raise exception 'idempotency_key_required' using errcode = '23514';
  end if;

  if p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_must_be_an_array' using errcode = '23514';
  end if;

  if pg_catalog.octet_length(p_items::text) > 8192 then
    raise exception 'items_payload_too_large' using errcode = '23514';
  end if;

  v_item_count := pg_catalog.jsonb_array_length(p_items);

  if v_item_count < 1 then
    raise exception 'order_requires_items' using errcode = '23514';
  end if;

  if v_item_count > 4 then
    raise exception 'too_many_pack_lines' using errcode = '23514';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or item.value - array['slug', 'quantity']::text[] <> '{}'::jsonb
      or not (item.value ? 'slug')
      or not (item.value ? 'quantity')
      or pg_catalog.jsonb_typeof(item.value -> 'slug') <> 'string'
      or nullif(pg_catalog.btrim(item.value ->> 'slug'), '') is null
      or pg_catalog.char_length(pg_catalog.btrim(item.value ->> 'slug')) > 100
      or pg_catalog.jsonb_typeof(item.value -> 'quantity') <> 'number'
      or (item.value ->> 'quantity') !~ '^[1-9][0-9]{0,8}$'
  ) then
    raise exception 'invalid_item_shape' using errcode = '23514';
  end if;

  select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'slug', pg_catalog.lower(pg_catalog.btrim(item.value ->> 'slug')),
      'quantity', (item.value ->> 'quantity')::integer
    )
    order by pg_catalog.lower(pg_catalog.btrim(item.value ->> 'slug'))
  )
  into v_normalized_items
  from pg_catalog.jsonb_array_elements(p_items) as item(value);

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(v_normalized_items) as item(
      slug text,
      quantity integer
    )
    group by item.slug
    having pg_catalog.count(*) > 1
  ) then
    raise exception 'duplicate_pack_slug' using errcode = '23514';
  end if;

  v_request_fingerprint := pg_catalog.encode(
    pg_catalog.sha256(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'user_id', v_user_id::text,
          'customer_email', pg_catalog.lower(v_auth_email),
          'customer_name', v_customer_name,
          'whatsapp', coalesce(v_whatsapp, ''),
          'google_maps_url', v_google_maps_url,
          'notes', coalesce(v_notes, ''),
          'management_mode', v_management_mode,
          'items', v_normalized_items
        )::text,
        'UTF8'
      )
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('checkout-order:' || v_user_id::text, 0)
  );

  select existing_order.*
  into v_existing_order
  from public.orders as existing_order
  where existing_order.user_id = v_user_id
    and existing_order.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_order.request_fingerprint is distinct from v_request_fingerprint then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;

    return query
    select
      v_existing_order.id,
      pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(v_existing_order.id::text, '-', ''), 1, 8)),
      v_existing_order.status,
      v_existing_order.payment_status,
      v_existing_order.currency,
      v_existing_order.total_cents,
      v_existing_order.created_at;
    return;
  end if;

  lock table public.checkout_catalog_items in share mode;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(v_normalized_items) as item(
      slug text,
      quantity integer
    )
    left join public.checkout_catalog_items as catalog_item
      on catalog_item.slug = item.slug
     and catalog_item.kind = 'pack'
     and catalog_item.is_active = true
    where catalog_item.id is null
  ) then
    raise exception 'invalid_or_inactive_pack' using errcode = '23514';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(v_normalized_items) as item(
      slug text,
      quantity integer
    )
    join public.checkout_catalog_items as catalog_item
      on catalog_item.slug = item.slug
     and catalog_item.kind = 'pack'
     and catalog_item.is_active = true
    where item.quantity < 1
       or item.quantity > catalog_item.max_quantity_per_order
  ) then
    raise exception 'pack_quantity_out_of_range' using errcode = '23514';
  end if;

  select
    pg_catalog.sum(item.quantity::bigint),
    pg_catalog.sum(item.quantity::bigint * catalog_item.reviews_per_unit::bigint),
    pg_catalog.sum(item.quantity::bigint * catalog_item.unit_price_cents::bigint)
  into
    v_total_units,
    v_total_reviews,
    v_pack_total_cents
  from pg_catalog.jsonb_to_recordset(v_normalized_items) as item(
    slug text,
    quantity integer
  )
  join public.checkout_catalog_items as catalog_item
    on catalog_item.slug = item.slug
   and catalog_item.kind = 'pack'
   and catalog_item.is_active = true;

  if v_total_units > 8 then
    raise exception 'too_many_pack_units' using errcode = '23514';
  end if;

  if v_total_reviews is null or v_total_reviews < 1 then
    raise exception 'order_requires_reviews' using errcode = '23514';
  end if;

  if v_total_reviews > 200 then
    raise exception 'too_many_reviews' using errcode = '23514';
  end if;

  v_total_cents_bigint := v_pack_total_cents;

  if v_management_mode = 'manual' then
    select
      addon_item.id,
      addon_item.display_name,
      addon_item.unit_price_cents,
      addon_item.currency,
      addon_item.max_quantity_per_order
    into
      v_addon_id,
      v_addon_display_name,
      v_addon_unit_price_cents,
      v_addon_currency,
      v_addon_max_quantity
    from public.checkout_catalog_items as addon_item
    where addon_item.slug = 'personalizacion-resenas'
      and addon_item.kind = 'addon'
      and addon_item.is_active = true;

    if not found then
      raise exception 'personalization_addon_unavailable' using errcode = '23514';
    end if;

    if v_total_reviews > v_addon_max_quantity then
      raise exception 'personalization_quantity_out_of_range' using errcode = '23514';
    end if;

    if v_addon_currency <> 'EUR' then
      raise exception 'invalid_catalog_currency' using errcode = '23514';
    end if;

    v_total_cents_bigint := v_total_cents_bigint
      + v_total_reviews * v_addon_unit_price_cents::bigint;
  end if;

  if v_total_cents_bigint < 1 or v_total_cents_bigint > 2147483647 then
    raise exception 'calculated_total_out_of_range' using errcode = '23514';
  end if;

  select
    pg_catalog.count(*) filter (
      where created_order.created_at >= pg_catalog.now() - interval '10 minutes'
    ),
    pg_catalog.count(*) filter (
      where created_order.created_at >= pg_catalog.now() - interval '24 hours'
    )
  into
    v_orders_last_ten_minutes,
    v_orders_last_day
  from public.orders as created_order
  where created_order.user_id = v_user_id;

  if v_orders_last_ten_minutes >= 5 then
    raise exception 'order_rate_limit_10_minutes' using errcode = 'P0001';
  end if;

  if v_orders_last_day >= 20 then
    raise exception 'order_rate_limit_24_hours' using errcode = 'P0001';
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
    payment_status,
    idempotency_key,
    request_fingerprint,
    creation_version
  )
  values (
    v_user_id,
    v_customer_name,
    v_auth_email,
    v_whatsapp,
    v_google_maps_url,
    v_notes,
    v_management_mode,
    'EUR',
    v_total_cents_bigint::integer,
    'pending',
    'unpaid',
    p_idempotency_key,
    v_request_fingerprint,
    2
  )
  returning created_order.id into v_order_id;

  insert into public.order_items (
    order_id,
    catalog_item_id,
    pack_slug,
    pack_name,
    reviews_count,
    quantity,
    unit_price_cents,
    subtotal_cents
  )
  select
    v_order_id,
    catalog_item.id,
    catalog_item.slug,
    catalog_item.display_name,
    catalog_item.reviews_per_unit,
    item.quantity,
    catalog_item.unit_price_cents,
    (catalog_item.unit_price_cents::bigint * item.quantity::bigint)::integer
  from pg_catalog.jsonb_to_recordset(v_normalized_items) as item(
    slug text,
    quantity integer
  )
  join public.checkout_catalog_items as catalog_item
    on catalog_item.slug = item.slug
   and catalog_item.kind = 'pack'
   and catalog_item.is_active = true
  order by catalog_item.display_order, catalog_item.slug;

  if v_management_mode = 'manual' then
    insert into public.order_items (
      order_id,
      catalog_item_id,
      pack_slug,
      pack_name,
      reviews_count,
      quantity,
      unit_price_cents,
      subtotal_cents
    )
    values (
      v_order_id,
      v_addon_id,
      'personalizacion-resenas',
      v_addon_display_name,
      0,
      v_total_reviews::integer,
      v_addon_unit_price_cents,
      (v_total_reviews * v_addon_unit_price_cents::bigint)::integer
    );
  end if;

  insert into public.order_reviews (
    order_id,
    user_id,
    review_index,
    source,
    status
  )
  select
    v_order_id,
    v_user_id,
    review_series.review_index,
    case when v_management_mode = 'manual' then 'client' else 'team' end,
    case when v_management_mode = 'manual' then 'awaiting_client' else 'awaiting_team' end
  from pg_catalog.generate_series(1, v_total_reviews::integer) as review_series(review_index);

  return query
  select
    created_order.id,
    pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(created_order.id::text, '-', ''), 1, 8)),
    created_order.status,
    created_order.payment_status,
    created_order.currency,
    created_order.total_cents,
    created_order.created_at
  from public.orders as created_order
  where created_order.id = v_order_id;
end;
$$;

revoke execute on function public.create_order_from_catalog(
  text,
  text,
  text,
  text,
  text,
  jsonb,
  uuid
) from public;

revoke execute on function public.create_order_from_catalog(
  text,
  text,
  text,
  text,
  text,
  jsonb,
  uuid
) from anon;

grant execute on function public.create_order_from_catalog(
  text,
  text,
  text,
  text,
  text,
  jsonb,
  uuid
) to authenticated;
