create extension if not exists pgcrypto;

create table if not exists public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  review_index integer not null,
  source text not null,
  rating integer,
  review_text text,
  review_notes text,
  status text not null default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint order_reviews_review_index_check check (review_index > 0),
  constraint order_reviews_source_check check (source in ('client', 'team')),
  constraint order_reviews_rating_check check (rating is null or rating between 3 and 5),
  constraint order_reviews_submitted_content_check check (
    status <> 'submitted'
    or (
      nullif(btrim(coalesce(review_text, '')), '') is not null
      and rating between 3 and 5
    )
  ),
  constraint order_reviews_status_check check (
    status in ('awaiting_client', 'draft', 'submitted', 'awaiting_team', 'prepared', 'approved', 'completed')
  ),
  constraint order_reviews_order_review_index_key unique (order_id, review_index)
);

create table if not exists public.review_media (
  id uuid primary key default gen_random_uuid(),
  order_review_id uuid not null references public.order_reviews(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  mime_type text not null,
  file_size_bytes integer not null,
  sort_order integer default 0,
  created_at timestamptz default now(),
  constraint review_media_file_path_key unique (file_path),
  constraint review_media_file_type_check check (file_type in ('image', 'video')),
  constraint review_media_sort_order_check check (sort_order >= 0),
  constraint review_media_size_positive_check check (file_size_bytes > 0),
  constraint review_media_type_mime_size_check check (
    (
      file_type = 'image'
      and mime_type in ('image/jpeg', 'image/png', 'image/webp')
      and file_size_bytes <= 5242880
    )
    or
    (
      file_type = 'video'
      and mime_type in ('video/mp4', 'video/quicktime', 'video/webm')
      and file_size_bytes <= 52428800
    )
  )
);

create index if not exists order_reviews_order_id_idx
on public.order_reviews (order_id);

create index if not exists order_reviews_user_id_order_id_idx
on public.order_reviews (user_id, order_id);

create index if not exists order_reviews_user_id_status_idx
on public.order_reviews (user_id, status);

create index if not exists review_media_order_review_id_idx
on public.review_media (order_review_id);

create index if not exists review_media_order_id_idx
on public.review_media (order_id);

create index if not exists review_media_user_id_idx
on public.review_media (user_id);

create or replace function public.set_order_reviews_updated_at()
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

drop trigger if exists set_order_reviews_updated_at on public.order_reviews;

create trigger set_order_reviews_updated_at
before update on public.order_reviews
for each row
execute function public.set_order_reviews_updated_at();

create or replace function public.enforce_review_media_rules()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_review public.order_reviews%rowtype;
  v_image_count integer;
  v_video_count integer;
begin
  select r.*
  into v_review
  from public.order_reviews as r
  join public.orders as o on o.id = r.order_id
  where r.id = new.order_review_id
    and r.user_id = auth.uid()
    and o.user_id = auth.uid();

  if not found then
    raise exception 'Review media must belong to an authenticated user review' using errcode = '42501';
  end if;

  if new.user_id <> auth.uid()
    or new.user_id <> v_review.user_id
    or new.order_id <> v_review.order_id then
    raise exception 'Review media ownership mismatch' using errcode = '42501';
  end if;

  if new.file_path not like new.user_id::text || '/' || new.order_id::text || '/' || new.order_review_id::text || '/%' then
    raise exception 'Invalid review media storage path' using errcode = '23514';
  end if;

  select count(*)
  into v_image_count
  from public.review_media
  where order_review_id = new.order_review_id
    and file_type = 'image'
    and id is distinct from new.id;

  select count(*)
  into v_video_count
  from public.review_media
  where order_review_id = new.order_review_id
    and file_type = 'video'
    and id is distinct from new.id;

  if new.file_type = 'image' and v_image_count >= 5 then
    raise exception 'Maximum 5 images per review' using errcode = '23514';
  end if;

  if new.file_type = 'video' and v_video_count >= 1 then
    raise exception 'Maximum 1 video per review' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_review_media_rules on public.review_media;

create trigger enforce_review_media_rules
before insert or update on public.review_media
for each row
execute function public.enforce_review_media_rules();

alter table public.order_reviews enable row level security;
alter table public.review_media enable row level security;

revoke all on public.order_reviews from anon;
revoke all on public.order_reviews from authenticated;
revoke all on public.review_media from anon;
revoke all on public.review_media from authenticated;

grant usage on schema public to authenticated;
grant select on public.order_reviews to authenticated;
grant update (review_text, review_notes, rating, status) on public.order_reviews to authenticated;
grant select, insert, delete on public.review_media to authenticated;

drop policy if exists "Users can view their own order reviews" on public.order_reviews;
drop policy if exists "Clients can update editable fields on manual reviews" on public.order_reviews;
drop policy if exists "Users can view their own review media" on public.review_media;
drop policy if exists "Users can insert media for own manual reviews" on public.review_media;
drop policy if exists "Users can delete own manual review media" on public.review_media;

create policy "Users can view their own order reviews"
on public.order_reviews
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.orders
    where orders.id = order_reviews.order_id
      and orders.user_id = auth.uid()
  )
);

create policy "Clients can update editable fields on manual reviews"
on public.order_reviews
for update
to authenticated
using (
  user_id = auth.uid()
  and source = 'client'
  and status in ('awaiting_client', 'draft', 'submitted')
  and exists (
    select 1
    from public.orders
    where orders.id = order_reviews.order_id
      and orders.user_id = auth.uid()
      and orders.management_mode = 'manual'
  )
)
with check (
  user_id = auth.uid()
  and source = 'client'
  and status in ('awaiting_client', 'draft', 'submitted')
  and exists (
    select 1
    from public.orders
    where orders.id = order_reviews.order_id
      and orders.user_id = auth.uid()
      and orders.management_mode = 'manual'
  )
);

create policy "Users can view their own review media"
on public.review_media
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.order_reviews as r
    join public.orders as o on o.id = r.order_id
    where r.id = review_media.order_review_id
      and r.order_id = review_media.order_id
      and r.user_id = auth.uid()
      and o.user_id = auth.uid()
  )
);

create policy "Users can insert media for own manual reviews"
on public.review_media
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.order_reviews as r
    join public.orders as o on o.id = r.order_id
    where r.id = review_media.order_review_id
      and r.order_id = review_media.order_id
      and r.user_id = auth.uid()
      and o.user_id = auth.uid()
      and r.source = 'client'
      and o.management_mode = 'manual'
  )
);

create policy "Users can delete own manual review media"
on public.review_media
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.order_reviews as r
    join public.orders as o on o.id = r.order_id
    where r.id = review_media.order_review_id
      and r.order_id = review_media.order_id
      and r.user_id = auth.uid()
      and o.user_id = auth.uid()
      and r.source = 'client'
      and o.management_mode = 'manual'
  )
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'buckets'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'storage'
        and table_name = 'buckets'
        and column_name = 'file_size_limit'
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'storage'
        and table_name = 'buckets'
        and column_name = 'allowed_mime_types'
    ) then
      execute $sql$
        insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values (
          'review-media',
          'review-media',
          false,
          52428800,
          array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
        )
        on conflict (id) do update
        set public = false,
            file_size_limit = 52428800,
            allowed_mime_types = excluded.allowed_mime_types
      $sql$;
    else
      execute $sql$
        insert into storage.buckets (id, name, public)
        values ('review-media', 'review-media', false)
        on conflict (id) do update
        set public = false
      $sql$;

      raise notice 'Configure Storage bucket review-media manually: private bucket, global file size limit 52428800, allowed MIME types image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm.';
    end if;
  end if;
end;
$$;

drop policy if exists "Users can view own review media objects" on storage.objects;
drop policy if exists "Users can upload own review media objects" on storage.objects;
drop policy if exists "Users can delete own review media objects" on storage.objects;

create policy "Users can view own review media objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'review-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.orders as o
    join public.order_reviews as r on r.order_id = o.id
    where o.id::text = (storage.foldername(name))[2]
      and r.id::text = (storage.foldername(name))[3]
      and o.user_id = auth.uid()
      and r.user_id = auth.uid()
      and r.order_id = o.id
  )
);

create policy "Users can upload own review media objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'review-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.orders as o
    join public.order_reviews as r on r.order_id = o.id
    where o.id::text = (storage.foldername(name))[2]
      and r.id::text = (storage.foldername(name))[3]
      and o.user_id = auth.uid()
      and r.user_id = auth.uid()
      and r.order_id = o.id
      and r.source = 'client'
      and o.management_mode = 'manual'
  )
);

create policy "Users can delete own review media objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'review-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.orders as o
    join public.order_reviews as r on r.order_id = o.id
    where o.id::text = (storage.foldername(name))[2]
      and r.id::text = (storage.foldername(name))[3]
      and o.user_id = auth.uid()
      and r.user_id = auth.uid()
      and r.order_id = o.id
      and r.source = 'client'
      and o.management_mode = 'manual'
  )
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
  v_management_mode text;
  v_review_total integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  v_auth_email := nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '');

  if v_auth_email is null then
    raise exception 'Authenticated email is required' using errcode = '23514';
  end if;

  v_management_mode := nullif(trim(coalesce(p_management_mode, '')), '');

  if v_management_mode not in ('manual', 'team') then
    raise exception 'Invalid management mode' using errcode = '23514';
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
      or (
        nullif(trim(coalesce(item.pack_slug, '')), '') is distinct from 'personalizacion-resenas'
        and coalesce(item.reviews_count, 0) <= 0
      )
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

  select coalesce(sum(item.reviews_count * item.quantity), 0)
  into v_review_total
  from jsonb_to_recordset(p_items) as item(
    pack_slug text,
    pack_name text,
    reviews_count integer,
    quantity integer,
    unit_price_cents integer,
    subtotal_cents integer
  )
  where nullif(trim(coalesce(item.pack_slug, '')), '') is distinct from 'personalizacion-resenas';

  if v_review_total <= 0 then
    raise exception 'Order must include at least one real review' using errcode = '23514';
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
    v_management_mode,
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
    series.review_index,
    case when v_management_mode = 'manual' then 'client' else 'team' end,
    case when v_management_mode = 'manual' then 'awaiting_client' else 'awaiting_team' end
  from generate_series(1, v_review_total) as series(review_index);

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
