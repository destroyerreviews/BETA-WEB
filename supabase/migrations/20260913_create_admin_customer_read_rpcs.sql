-- Admin customers: read-only overview, paginated list, and bounded detail.
-- These functions expose no direct table access and do not modify application data.

create or replace function public.admin_get_customers_overview()
returns table (
  total_customers integer,
  customers_with_orders integer,
  customers_with_open_trial integer,
  customers_with_open_support integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  with customer_ids as (
    select user_profile.user_id
    from public.user_profiles as user_profile

    union

    select customer_order.user_id
    from public.orders as customer_order

    union

    select free_trial_request.user_id
    from public.free_trial_requests as free_trial_request

    union

    select support_thread.user_id
    from public.support_threads as support_thread
  ),
  order_customers as (
    select customer_order.user_id
    from public.orders as customer_order
    group by customer_order.user_id
  ),
  open_trial_customers as (
    select free_trial_request.user_id
    from public.free_trial_requests as free_trial_request
    where free_trial_request.status in ('pending', 'review', 'active')
    group by free_trial_request.user_id
  ),
  open_support_customers as (
    select support_thread.user_id
    from public.support_threads as support_thread
    where support_thread.status <> 'closed'
    group by support_thread.user_id
  )
  select
    count(*)::integer as total_customers,
    (count(*) filter (where order_customer.user_id is not null))::integer as customers_with_orders,
    (count(*) filter (where open_trial_customer.user_id is not null))::integer as customers_with_open_trial,
    (count(*) filter (where open_support_customer.user_id is not null))::integer as customers_with_open_support
  from customer_ids as customer
  left join order_customers as order_customer
    on order_customer.user_id = customer.user_id
  left join open_trial_customers as open_trial_customer
    on open_trial_customer.user_id = customer.user_id
  left join open_support_customers as open_support_customer
    on open_support_customer.user_id = customer.user_id;
end;
$$;

create or replace function public.admin_list_customers(
  p_search text default null,
  p_limit integer default 50,
  p_before_activity_at timestamptz default null,
  p_before_user_id uuid default null
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  whatsapp text,
  registered_at timestamptz,
  order_count integer,
  active_order_count integer,
  completed_order_count integer,
  order_value_cents bigint,
  recorded_paid_total_cents bigint,
  recorded_pending_total_cents bigint,
  currency text,
  free_trial_status text,
  support_thread_count integer,
  open_support_thread_count integer,
  last_activity_at timestamptz,
  last_activity_type text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text;
  v_search_pattern text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid_limit' using errcode = '23514';
  end if;

  v_search := nullif(btrim(coalesce(p_search, '')), '');

  if v_search is not null and char_length(v_search) > 120 then
    raise exception 'search_too_long' using errcode = '23514';
  end if;

  if (p_before_activity_at is null and p_before_user_id is not null)
    or (p_before_activity_at is not null and p_before_user_id is null) then
    raise exception 'invalid_customer_cursor' using errcode = '23514';
  end if;

  if v_search is not null then
    v_search_pattern := '%'
      || replace(
        replace(
          replace(v_search, E'\\', E'\\\\'),
          '%',
          E'\\%'
        ),
        '_',
        E'\\_'
      )
      || '%';
  end if;

  return query
  with customer_ids as (
    select user_profile.user_id
    from public.user_profiles as user_profile

    union

    select customer_order.user_id
    from public.orders as customer_order

    union

    select free_trial_request.user_id
    from public.free_trial_requests as free_trial_request

    union

    select support_thread.user_id
    from public.support_threads as support_thread
  ),
  profile_summary as (
    select
      user_profile.user_id,
      nullif(btrim(user_profile.full_name), '') as full_name,
      nullif(btrim(user_profile.whatsapp), '') as whatsapp,
      greatest(user_profile.created_at, user_profile.updated_at) as activity_at
    from public.user_profiles as user_profile
  ),
  order_summary as (
    select
      customer_order.user_id,
      count(*)::integer as order_count,
      (count(*) filter (
        where customer_order.status in ('pending', 'review', 'in_progress')
      ))::integer as active_order_count,
      (count(*) filter (
        where customer_order.status = 'completed'
      ))::integer as completed_order_count,
      coalesce(sum(customer_order.total_cents) filter (
        where customer_order.status <> 'cancelled'
      ), 0)::bigint as order_value_cents,
      coalesce(sum(customer_order.total_cents) filter (
        where customer_order.payment_status = 'paid'
      ), 0)::bigint as recorded_paid_total_cents,
      coalesce(sum(customer_order.total_cents) filter (
        where customer_order.payment_status in ('unpaid', 'pending')
          and customer_order.status <> 'cancelled'
      ), 0)::bigint as recorded_pending_total_cents,
      max(greatest(customer_order.created_at, customer_order.updated_at)) as activity_at
    from public.orders as customer_order
    group by customer_order.user_id
  ),
  latest_order_identity as (
    select distinct on (customer_order.user_id)
      customer_order.user_id,
      nullif(btrim(customer_order.customer_name), '') as customer_name,
      nullif(btrim(customer_order.whatsapp), '') as whatsapp
    from public.orders as customer_order
    order by customer_order.user_id, customer_order.created_at desc, customer_order.id desc
  ),
  review_summary as (
    select
      customer_review.user_id,
      max(greatest(customer_review.created_at, customer_review.updated_at)) as activity_at
    from public.order_reviews as customer_review
    group by customer_review.user_id
  ),
  free_trial_summary as (
    select
      free_trial_request.user_id,
      free_trial_request.status,
      greatest(free_trial_request.created_at, free_trial_request.updated_at) as activity_at
    from public.free_trial_requests as free_trial_request
  ),
  support_summary as (
    select
      support_thread.user_id,
      count(*)::integer as support_thread_count,
      (count(*) filter (
        where support_thread.status <> 'closed'
      ))::integer as open_support_thread_count,
      max(greatest(
        support_thread.created_at,
        support_thread.updated_at,
        support_thread.last_message_at
      )) as activity_at
    from public.support_threads as support_thread
    group by support_thread.user_id
  ),
  customer_rows as (
    select
      customer.user_id,
      coalesce(profile.full_name, latest_order.customer_name) as full_name,
      auth_user.email::text as email,
      coalesce(profile.whatsapp, latest_order.whatsapp) as whatsapp,
      auth_user.created_at as registered_at,
      coalesce(customer_orders.order_count, 0)::integer as order_count,
      coalesce(customer_orders.active_order_count, 0)::integer as active_order_count,
      coalesce(customer_orders.completed_order_count, 0)::integer as completed_order_count,
      coalesce(customer_orders.order_value_cents, 0)::bigint as order_value_cents,
      coalesce(customer_orders.recorded_paid_total_cents, 0)::bigint as recorded_paid_total_cents,
      coalesce(customer_orders.recorded_pending_total_cents, 0)::bigint as recorded_pending_total_cents,
      'EUR'::text as currency,
      free_trial.status as free_trial_status,
      coalesce(customer_support.support_thread_count, 0)::integer as support_thread_count,
      coalesce(customer_support.open_support_thread_count, 0)::integer as open_support_thread_count,
      latest_activity.activity_at as last_activity_at,
      latest_activity.activity_type as last_activity_type
    from customer_ids as customer
    join auth.users as auth_user
      on auth_user.id = customer.user_id
    left join profile_summary as profile
      on profile.user_id = customer.user_id
    left join order_summary as customer_orders
      on customer_orders.user_id = customer.user_id
    left join latest_order_identity as latest_order
      on latest_order.user_id = customer.user_id
    left join review_summary as customer_reviews
      on customer_reviews.user_id = customer.user_id
    left join free_trial_summary as free_trial
      on free_trial.user_id = customer.user_id
    left join support_summary as customer_support
      on customer_support.user_id = customer.user_id
    left join lateral (
      select activity.activity_at, activity.activity_type
      from (
        values
          (profile.activity_at, 'profile'::text, 1),
          (customer_orders.activity_at, 'order'::text, 3),
          (customer_reviews.activity_at, 'review'::text, 4),
          (free_trial.activity_at, 'free_trial'::text, 2),
          (customer_support.activity_at, 'support'::text, 5),
          (auth_user.created_at, 'unknown'::text, 0)
      ) as activity(activity_at, activity_type, priority)
      where activity.activity_at is not null
      order by activity.activity_at desc, activity.priority desc
      limit 1
    ) as latest_activity on true
  )
  select
    customer_row.user_id,
    customer_row.full_name,
    customer_row.email,
    customer_row.whatsapp,
    customer_row.registered_at,
    customer_row.order_count,
    customer_row.active_order_count,
    customer_row.completed_order_count,
    customer_row.order_value_cents,
    customer_row.recorded_paid_total_cents,
    customer_row.recorded_pending_total_cents,
    customer_row.currency,
    customer_row.free_trial_status,
    customer_row.support_thread_count,
    customer_row.open_support_thread_count,
    customer_row.last_activity_at,
    customer_row.last_activity_type
  from customer_rows as customer_row
  where (
      v_search is null
      or coalesce(customer_row.full_name, '') ilike v_search_pattern escape E'\\'
      or coalesce(customer_row.email, '') ilike v_search_pattern escape E'\\'
      or coalesce(customer_row.whatsapp, '') ilike v_search_pattern escape E'\\'
      or exists (
        select 1
        from public.orders as searched_order
        where searched_order.user_id = customer_row.user_id
          and (
            searched_order.id::text ilike v_search_pattern escape E'\\'
            or ('#' || upper(substr(replace(searched_order.id::text, '-', ''), 1, 8)))
              ilike v_search_pattern escape E'\\'
          )
      )
      or exists (
        select 1
        from public.support_threads as searched_thread
        where searched_thread.user_id = customer_row.user_id
          and searched_thread.reference_code ilike v_search_pattern escape E'\\'
      )
    )
    and (
      p_before_activity_at is null
      or customer_row.last_activity_at < p_before_activity_at
      or (
        customer_row.last_activity_at = p_before_activity_at
        and customer_row.user_id < p_before_user_id
      )
    )
  order by customer_row.last_activity_at desc nulls last, customer_row.user_id desc
  limit p_limit;
end;
$$;

create or replace function public.admin_get_customer_detail(
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_registered_at timestamptz;
  v_profile_name text;
  v_profile_whatsapp text;
  v_profile_activity_at timestamptz;
  v_order_name text;
  v_order_whatsapp text;
  v_full_name text;
  v_whatsapp text;
  v_order_count integer := 0;
  v_active_order_count integer := 0;
  v_completed_order_count integer := 0;
  v_order_value_cents bigint := 0;
  v_recorded_paid_total_cents bigint := 0;
  v_recorded_pending_total_cents bigint := 0;
  v_order_activity_at timestamptz;
  v_review_count integer := 0;
  v_review_activity_at timestamptz;
  v_free_trial_status text;
  v_free_trial_activity_at timestamptz;
  v_support_thread_count integer := 0;
  v_open_support_thread_count integer := 0;
  v_support_activity_at timestamptz;
  v_last_activity_at timestamptz;
  v_last_activity_type text;
  v_orders jsonb;
  v_reviews jsonb;
  v_free_trial jsonb;
  v_support_threads jsonb;
  v_timeline jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'customer_id_required' using errcode = '23514';
  end if;

  if not (
    exists (
      select 1
      from public.user_profiles as user_profile
      where user_profile.user_id = p_user_id
    )
    or exists (
      select 1
      from public.orders as customer_order
      where customer_order.user_id = p_user_id
    )
    or exists (
      select 1
      from public.free_trial_requests as free_trial_request
      where free_trial_request.user_id = p_user_id
    )
    or exists (
      select 1
      from public.support_threads as support_thread
      where support_thread.user_id = p_user_id
    )
  ) then
    raise exception 'customer_not_available' using errcode = 'P0002';
  end if;

  select
    auth_user.email::text,
    auth_user.created_at
  into
    v_email,
    v_registered_at
  from auth.users as auth_user
  where auth_user.id = p_user_id;

  select
    nullif(btrim(user_profile.full_name), ''),
    nullif(btrim(user_profile.whatsapp), ''),
    greatest(user_profile.created_at, user_profile.updated_at)
  into
    v_profile_name,
    v_profile_whatsapp,
    v_profile_activity_at
  from public.user_profiles as user_profile
  where user_profile.user_id = p_user_id;

  select
    nullif(btrim(customer_order.customer_name), ''),
    nullif(btrim(customer_order.whatsapp), '')
  into
    v_order_name,
    v_order_whatsapp
  from public.orders as customer_order
  where customer_order.user_id = p_user_id
  order by customer_order.created_at desc, customer_order.id desc
  limit 1;

  v_full_name := coalesce(v_profile_name, v_order_name);
  v_whatsapp := coalesce(v_profile_whatsapp, v_order_whatsapp);

  select
    count(*)::integer,
    (count(*) filter (
      where customer_order.status in ('pending', 'review', 'in_progress')
    ))::integer,
    (count(*) filter (
      where customer_order.status = 'completed'
    ))::integer,
    coalesce(sum(customer_order.total_cents) filter (
      where customer_order.status <> 'cancelled'
    ), 0)::bigint,
    coalesce(sum(customer_order.total_cents) filter (
      where customer_order.payment_status = 'paid'
    ), 0)::bigint,
    coalesce(sum(customer_order.total_cents) filter (
      where customer_order.payment_status in ('unpaid', 'pending')
        and customer_order.status <> 'cancelled'
    ), 0)::bigint,
    max(greatest(customer_order.created_at, customer_order.updated_at))
  into
    v_order_count,
    v_active_order_count,
    v_completed_order_count,
    v_order_value_cents,
    v_recorded_paid_total_cents,
    v_recorded_pending_total_cents,
    v_order_activity_at
  from public.orders as customer_order
  where customer_order.user_id = p_user_id;

  select
    count(*)::integer,
    max(greatest(customer_review.created_at, customer_review.updated_at))
  into
    v_review_count,
    v_review_activity_at
  from public.order_reviews as customer_review
  where customer_review.user_id = p_user_id;

  select
    free_trial_request.status,
    greatest(free_trial_request.created_at, free_trial_request.updated_at)
  into
    v_free_trial_status,
    v_free_trial_activity_at
  from public.free_trial_requests as free_trial_request
  where free_trial_request.user_id = p_user_id;

  select
    count(*)::integer,
    (count(*) filter (
      where support_thread.status <> 'closed'
    ))::integer,
    max(greatest(
      support_thread.created_at,
      support_thread.updated_at,
      support_thread.last_message_at
    ))
  into
    v_support_thread_count,
    v_open_support_thread_count,
    v_support_activity_at
  from public.support_threads as support_thread
  where support_thread.user_id = p_user_id;

  select activity.activity_at, activity.activity_type
  into v_last_activity_at, v_last_activity_type
  from (
    values
      (v_profile_activity_at, 'profile'::text, 1),
      (v_order_activity_at, 'order'::text, 3),
      (v_review_activity_at, 'review'::text, 4),
      (v_free_trial_activity_at, 'free_trial'::text, 2),
      (v_support_activity_at, 'support'::text, 5),
      (v_registered_at, 'unknown'::text, 0)
  ) as activity(activity_at, activity_type, priority)
  where activity.activity_at is not null
  order by activity.activity_at desc, activity.priority desc
  limit 1;

  with recent_orders as (
    select
      customer_order.id,
      customer_order.created_at,
      customer_order.updated_at,
      customer_order.status,
      customer_order.payment_status,
      customer_order.total_cents,
      customer_order.currency,
      customer_order.management_mode,
      customer_order.google_maps_url,
      customer_order.notes
    from public.orders as customer_order
    where customer_order.user_id = p_user_id
    order by customer_order.created_at desc, customer_order.id desc
    limit 25
  )
  select jsonb_build_object(
    'total_count', v_order_count,
    'has_more', v_order_count > 25,
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', recent_order.id,
          'reference', '#' || upper(substr(replace(recent_order.id::text, '-', ''), 1, 8)),
          'created_at', recent_order.created_at,
          'updated_at', recent_order.updated_at,
          'status', recent_order.status,
          'payment_status', recent_order.payment_status,
          'total_cents', recent_order.total_cents,
          'currency', recent_order.currency,
          'management_mode', recent_order.management_mode,
          'google_maps_url', recent_order.google_maps_url,
          'notes', recent_order.notes
        )
        order by recent_order.created_at desc, recent_order.id desc
      ),
      '[]'::jsonb
    )
  )
  into v_orders
  from recent_orders as recent_order;

  with recent_reviews as (
    select
      customer_review.id,
      customer_review.order_id,
      customer_review.review_index,
      customer_review.source,
      customer_review.status,
      customer_review.rating,
      customer_review.review_text,
      customer_review.review_notes,
      customer_review.created_at,
      customer_review.updated_at
    from public.order_reviews as customer_review
    where customer_review.user_id = p_user_id
    order by greatest(customer_review.created_at, customer_review.updated_at) desc,
      customer_review.id desc
    limit 25
  ),
  reviews_with_media_counts as (
    select
      recent_review.*,
      coalesce(media_counts.media_count, 0)::integer as media_count,
      coalesce(media_counts.image_count, 0)::integer as image_count,
      coalesce(media_counts.video_count, 0)::integer as video_count
    from recent_reviews as recent_review
    left join lateral (
      select
        count(*)::integer as media_count,
        (count(*) filter (
          where review_medium.file_type = 'image'
        ))::integer as image_count,
        (count(*) filter (
          where review_medium.file_type = 'video'
        ))::integer as video_count
      from public.review_media as review_medium
      where review_medium.order_review_id = recent_review.id
        and review_medium.user_id = p_user_id
    ) as media_counts on true
  )
  select jsonb_build_object(
    'total_count', v_review_count,
    'has_more', v_review_count > 25,
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', review_row.id,
          'order_id', review_row.order_id,
          'review_index', review_row.review_index,
          'source', review_row.source,
          'status', review_row.status,
          'rating', review_row.rating,
          'review_text', review_row.review_text,
          'review_notes', review_row.review_notes,
          'media_count', review_row.media_count,
          'image_count', review_row.image_count,
          'video_count', review_row.video_count,
          'created_at', review_row.created_at,
          'updated_at', review_row.updated_at
        )
        order by greatest(review_row.created_at, review_row.updated_at) desc,
          review_row.id desc
      ),
      '[]'::jsonb
    )
  )
  into v_reviews
  from reviews_with_media_counts as review_row;

  select jsonb_build_object(
    'id', free_trial_request.id,
    'status', free_trial_request.status,
    'google_maps_url', free_trial_request.google_maps_url,
    'note', free_trial_request.note,
    'review_text', free_trial_request.review_text,
    'created_at', free_trial_request.created_at,
    'updated_at', free_trial_request.updated_at
  )
  into v_free_trial
  from public.free_trial_requests as free_trial_request
  where free_trial_request.user_id = p_user_id;

  with recent_support_threads as (
    select
      support_thread.id,
      support_thread.reference_code,
      support_thread.subject,
      support_thread.status,
      support_thread.order_id,
      support_thread.created_at,
      support_thread.updated_at,
      support_thread.last_message_at,
      support_thread.last_client_message_at,
      support_thread.last_admin_reply_at,
      support_thread.closed_at
    from public.support_threads as support_thread
    where support_thread.user_id = p_user_id
    order by support_thread.last_message_at desc, support_thread.id desc
    limit 25
  )
  select jsonb_build_object(
    'total_count', v_support_thread_count,
    'has_more', v_support_thread_count > 25,
    'items', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', recent_thread.id,
          'reference_code', recent_thread.reference_code,
          'subject', recent_thread.subject,
          'status', recent_thread.status,
          'order_id', recent_thread.order_id,
          'created_at', recent_thread.created_at,
          'updated_at', recent_thread.updated_at,
          'last_message_at', recent_thread.last_message_at,
          'last_client_message_at', recent_thread.last_client_message_at,
          'last_admin_reply_at', recent_thread.last_admin_reply_at,
          'closed_at', recent_thread.closed_at
        )
        order by recent_thread.last_message_at desc, recent_thread.id desc
      ),
      '[]'::jsonb
    )
  )
  into v_support_threads
  from recent_support_threads as recent_thread;

  with timeline_events as (
    select
      greatest(user_profile.created_at, user_profile.updated_at) as event_at,
      'profile'::text as event_type,
      user_profile.id as related_id,
      case
        when user_profile.updated_at > user_profile.created_at then 'Perfil actualizado'
        else 'Perfil creado'
      end::text as label
    from public.user_profiles as user_profile
    where user_profile.user_id = p_user_id

    union all

    select
      greatest(customer_order.created_at, customer_order.updated_at) as event_at,
      'order'::text as event_type,
      customer_order.id as related_id,
      ('Pedido #'
        || upper(substr(replace(customer_order.id::text, '-', ''), 1, 8))
        || ' · '
        || customer_order.status)::text as label
    from public.orders as customer_order
    where customer_order.user_id = p_user_id

    union all

    select
      greatest(customer_review.created_at, customer_review.updated_at) as event_at,
      'review'::text as event_type,
      customer_review.id as related_id,
      ('Reseña '
        || customer_review.review_index::text
        || ' · '
        || customer_review.status)::text as label
    from public.order_reviews as customer_review
    where customer_review.user_id = p_user_id

    union all

    select
      greatest(free_trial_request.created_at, free_trial_request.updated_at) as event_at,
      'free_trial'::text as event_type,
      free_trial_request.id as related_id,
      ('Prueba gratuita · ' || free_trial_request.status)::text as label
    from public.free_trial_requests as free_trial_request
    where free_trial_request.user_id = p_user_id

    union all

    select
      greatest(
        support_thread.created_at,
        support_thread.updated_at,
        support_thread.last_message_at
      ) as event_at,
      'support'::text as event_type,
      support_thread.id as related_id,
      ('Soporte ' || support_thread.reference_code || ' · ' || support_thread.status)::text as label
    from public.support_threads as support_thread
    where support_thread.user_id = p_user_id
  ),
  recent_timeline_events as (
    select
      timeline_event.event_at,
      timeline_event.event_type,
      timeline_event.related_id,
      timeline_event.label
    from timeline_events as timeline_event
    where timeline_event.event_at is not null
    order by timeline_event.event_at desc, timeline_event.event_type, timeline_event.related_id desc
    limit 40
  )
  select jsonb_build_object(
    'is_audit', false,
    'total_count', (
      select count(*)::integer
      from timeline_events as counted_event
      where counted_event.event_at is not null
    ),
    'has_more', (
      select count(*) > 40
      from timeline_events as counted_event
      where counted_event.event_at is not null
    ),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'label', recent_event.label,
            'date', recent_event.event_at,
            'type', recent_event.event_type,
            'related_id', recent_event.related_id
          )
          order by recent_event.event_at desc,
            recent_event.event_type,
            recent_event.related_id desc
        )
        from recent_timeline_events as recent_event
      ),
      '[]'::jsonb
    )
  )
  into v_timeline;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'user_id', p_user_id,
      'id_short', upper(substr(replace(p_user_id::text, '-', ''), 1, 8)),
      'full_name', v_full_name,
      'email', v_email,
      'whatsapp', v_whatsapp,
      'registered_at', v_registered_at
    ),
    'summary', jsonb_build_object(
      'order_count', v_order_count,
      'active_order_count', v_active_order_count,
      'completed_order_count', v_completed_order_count,
      'order_value_cents', v_order_value_cents,
      'recorded_paid_total_cents', v_recorded_paid_total_cents,
      'recorded_pending_total_cents', v_recorded_pending_total_cents,
      'currency', 'EUR',
      'free_trial_status', v_free_trial_status,
      'support_thread_count', v_support_thread_count,
      'open_support_thread_count', v_open_support_thread_count,
      'last_activity_at', v_last_activity_at,
      'last_activity_type', coalesce(v_last_activity_type, 'unknown')
    ),
    'orders', v_orders,
    'reviews', v_reviews,
    'free_trial', v_free_trial,
    'support_threads', v_support_threads,
    'timeline', v_timeline
  );
end;
$$;

revoke all on function public.admin_get_customers_overview()
from public, anon, authenticated;

grant execute on function public.admin_get_customers_overview()
to authenticated;

revoke all on function public.admin_list_customers(
  text,
  integer,
  timestamptz,
  uuid
)
from public, anon, authenticated;

grant execute on function public.admin_list_customers(
  text,
  integer,
  timestamptz,
  uuid
)
to authenticated;

revoke all on function public.admin_get_customer_detail(uuid)
from public, anon, authenticated;

grant execute on function public.admin_get_customer_detail(uuid)
to authenticated;
