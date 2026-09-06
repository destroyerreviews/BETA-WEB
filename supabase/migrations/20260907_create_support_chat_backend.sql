-- Support chat backend: RPC-only access for authenticated clients and active admins.
-- This migration creates no direct frontend access and does not modify order data.

create extension if not exists pgcrypto;

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid null references public.orders(id) on delete set null,
  subject text not null,
  status text not null default 'waiting_support',
  create_request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_client_message_at timestamptz null,
  last_admin_reply_at timestamptz null,
  client_last_read_at timestamptz null,
  closed_at timestamptz null,
  constraint support_threads_reference_code_key unique (reference_code),
  constraint support_threads_user_create_request_key unique (user_id, create_request_id),
  constraint support_threads_reference_code_format_check check (
    reference_code ~ '^SUP-[0-9A-F]{16}$'
  ),
  constraint support_threads_subject_check check (
    char_length(btrim(subject)) between 3 and 120
  ),
  constraint support_threads_status_check check (
    status in ('waiting_support', 'waiting_customer', 'closed')
  ),
  constraint support_threads_closed_at_check check (
    (status = 'closed' and closed_at is not null)
    or (status <> 'closed' and closed_at is null)
  ),
  constraint support_threads_updated_at_check check (updated_at >= created_at),
  constraint support_threads_last_message_at_check check (last_message_at >= created_at),
  constraint support_threads_last_client_message_at_check check (
    last_client_message_at is null or last_client_message_at <= last_message_at
  ),
  constraint support_threads_last_admin_reply_at_check check (
    last_admin_reply_at is null or last_admin_reply_at <= last_message_at
  ),
  constraint support_threads_client_last_read_at_check check (
    client_last_read_at is null or client_last_read_at <= last_message_at
  )
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null,
  body text not null,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint support_messages_author_role_check check (
    author_role in ('client', 'admin')
  ),
  constraint support_messages_body_check check (
    char_length(btrim(body)) between 1 and 4000
  ),
  constraint support_messages_thread_author_request_key unique (
    thread_id,
    author_user_id,
    request_id
  )
);

create index if not exists support_threads_user_last_message_idx
on public.support_threads (user_id, last_message_at desc);

create index if not exists support_threads_status_last_message_idx
on public.support_threads (status, last_message_at desc);

create index if not exists support_threads_order_id_idx
on public.support_threads (order_id);

create index if not exists support_threads_active_user_idx
on public.support_threads (user_id)
where status in ('waiting_support', 'waiting_customer');

create index if not exists support_messages_thread_created_id_idx
on public.support_messages (thread_id, created_at, id);

create index if not exists support_messages_author_created_at_idx
on public.support_messages (author_user_id, created_at desc);

create or replace function public.enforce_support_thread_invariants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.id is null then
      new.id := gen_random_uuid();
    end if;

    -- Always generate the public reference in the database. Caller input is ignored.
    new.reference_code := 'SUP-' || upper(substr(replace(new.id::text, '-', ''), 1, 16));
  else
    if new.reference_code is distinct from old.reference_code then
      raise exception 'reference_code_immutable' using errcode = '55000';
    end if;

    if new.user_id is distinct from old.user_id
      or new.create_request_id is distinct from old.create_request_id then
      raise exception 'support_thread_identity_immutable' using errcode = '55000';
    end if;

    if new.order_id is distinct from old.order_id then
      -- Permit only the FK's ON DELETE SET NULL action. Reassignment is forbidden.
      if not (
        new.order_id is null
        and old.order_id is not null
        and not exists (
          select 1
          from public.orders as support_order
          where support_order.id = old.order_id
        )
      ) then
        raise exception 'support_thread_order_immutable' using errcode = '55000';
      end if;
    end if;

    new.updated_at := now();
  end if;

  if new.order_id is not null
    and not exists (
      select 1
      from public.orders as support_order
      where support_order.id = new.order_id
        and support_order.user_id = new.user_id
    ) then
    raise exception 'order_not_available' using errcode = 'P0002';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_support_message_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread_user_id uuid;
begin
  select support_thread.user_id
  into v_thread_user_id
  from public.support_threads as support_thread
  where support_thread.id = new.thread_id;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  if new.author_role = 'client' then
    if new.author_user_id is distinct from v_thread_user_id then
      raise exception 'invalid_support_author' using errcode = '42501';
    end if;
  elsif new.author_role = 'admin' then
    if not exists (
      select 1
      from public.admin_users as admin_user
      where admin_user.user_id = new.author_user_id
        and admin_user.is_active = true
        and admin_user.revoked_at is null
    ) then
      raise exception 'admin_required' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_support_author_role' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_support_thread_invariants on public.support_threads;

create trigger enforce_support_thread_invariants
before insert or update on public.support_threads
for each row
execute function public.enforce_support_thread_invariants();

drop trigger if exists enforce_support_message_author on public.support_messages;

create trigger enforce_support_message_author
before insert on public.support_messages
for each row
execute function public.enforce_support_message_author();

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

-- No permissive policies are created. Frontend roles receive no table privileges.
revoke all privileges on table public.support_threads
from public, anon, authenticated;

revoke all privileges on table public.support_messages
from public, anon, authenticated;

create or replace function public.create_my_support_thread(
  p_subject text,
  p_message text,
  p_order_id uuid default null,
  p_request_id uuid default null
)
returns table (
  id uuid,
  reference_code text,
  subject text,
  status text,
  order_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_client_message_at timestamptz,
  last_admin_reply_at timestamptz,
  closed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_subject text;
  v_message text;
  v_now timestamptz;
  v_thread public.support_threads%rowtype;
  v_existing_message public.support_messages%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '23514';
  end if;

  v_subject := nullif(btrim(coalesce(p_subject, '')), '');

  if v_subject is null or char_length(v_subject) not between 3 and 120 then
    raise exception 'invalid_subject' using errcode = '23514';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  if v_message is null then
    raise exception 'message_required' using errcode = '23514';
  end if;

  if char_length(v_message) > 4000 then
    raise exception 'message_too_long' using errcode = '23514';
  end if;

  -- Serialize client limits and idempotent creations for this authenticated user.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.user_id = v_user_id
    and support_thread.create_request_id = p_request_id;

  if found then
    select support_message.*
    into v_existing_message
    from public.support_messages as support_message
    where support_message.thread_id = v_thread.id
      and support_message.author_user_id = v_user_id
      and support_message.request_id = p_request_id
      and support_message.author_role = 'client'
    order by support_message.created_at asc, support_message.id asc
    limit 1;

    if not found
      or v_thread.subject is distinct from v_subject
      or v_thread.order_id is distinct from p_order_id
      or v_existing_message.body is distinct from v_message then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;

    return query
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
    where support_thread.id = v_thread.id;
    return;
  end if;

  if p_order_id is not null
    and not exists (
      select 1
      from public.orders as support_order
      where support_order.id = p_order_id
        and support_order.user_id = v_user_id
    ) then
    raise exception 'order_not_available' using errcode = 'P0002';
  end if;

  if (
    select count(*)
    from public.support_threads as support_thread
    where support_thread.user_id = v_user_id
      and support_thread.status in ('waiting_support', 'waiting_customer')
  ) >= 10 then
    raise exception 'too_many_active_threads' using errcode = '54000';
  end if;

  if (
    select count(*)
    from public.support_messages as support_message
    where support_message.author_user_id = v_user_id
      and support_message.author_role = 'client'
      and support_message.created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception 'rate_limit_exceeded' using errcode = '54000';
  end if;

  v_now := now();

  insert into public.support_threads as support_thread (
    user_id,
    order_id,
    subject,
    status,
    create_request_id,
    created_at,
    updated_at,
    last_message_at,
    last_client_message_at,
    last_admin_reply_at,
    client_last_read_at,
    closed_at
  )
  values (
    v_user_id,
    p_order_id,
    v_subject,
    'waiting_support',
    p_request_id,
    v_now,
    v_now,
    v_now,
    v_now,
    null,
    null,
    null
  )
  returning support_thread.* into v_thread;

  insert into public.support_messages (
    thread_id,
    author_user_id,
    author_role,
    body,
    request_id,
    created_at
  )
  values (
    v_thread.id,
    v_user_id,
    'client',
    v_message,
    p_request_id,
    v_now
  );

  return query
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
  where support_thread.id = v_thread.id;
end;
$$;

create or replace function public.get_my_support_threads(
  p_status text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  reference_code text,
  subject text,
  status text,
  order_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_client_message_at timestamptz,
  last_admin_reply_at timestamptz,
  closed_at timestamptz,
  has_unread boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_status text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  v_status := nullif(btrim(coalesce(p_status, '')), '');

  if v_status is not null
    and v_status not in ('waiting_support', 'waiting_customer', 'closed') then
    raise exception 'invalid_support_status' using errcode = '23514';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'invalid_limit' using errcode = '23514';
  end if;

  return query
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
    support_thread.closed_at,
    support_thread.last_admin_reply_at is not null
      and (
        support_thread.client_last_read_at is null
        or support_thread.last_admin_reply_at > support_thread.client_last_read_at
      ) as has_unread
  from public.support_threads as support_thread
  where support_thread.user_id = v_user_id
    and (v_status is null or support_thread.status = v_status)
  order by support_thread.last_message_at desc, support_thread.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_my_support_thread_messages(
  p_thread_id uuid,
  p_limit integer default 100
)
returns table (
  id uuid,
  thread_id uuid,
  author_role text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid_limit' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.support_threads as support_thread
    where support_thread.id = p_thread_id
      and support_thread.user_id = v_user_id
  ) then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  return query
  select
    recent_message.id,
    recent_message.thread_id,
    recent_message.author_role,
    recent_message.body,
    recent_message.created_at
  from (
    select
      support_message.id,
      support_message.thread_id,
      support_message.author_role,
      support_message.body,
      support_message.created_at
    from public.support_messages as support_message
    where support_message.thread_id = p_thread_id
    order by support_message.created_at desc, support_message.id desc
    limit p_limit
  ) as recent_message
  order by recent_message.created_at asc, recent_message.id asc;
end;
$$;

create or replace function public.add_my_support_message(
  p_thread_id uuid,
  p_message text,
  p_request_id uuid
)
returns table (
  message_id uuid,
  thread_id uuid,
  author_role text,
  body text,
  created_at timestamptz,
  thread_status text,
  thread_updated_at timestamptz,
  thread_last_message_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_message text;
  v_now timestamptz;
  v_thread public.support_threads%rowtype;
  v_support_message public.support_messages%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '23514';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  if v_message is null then
    raise exception 'message_required' using errcode = '23514';
  end if;

  if char_length(v_message) > 4000 then
    raise exception 'message_too_long' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.id = p_thread_id
    and support_thread.user_id = v_user_id
  for update;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  select support_message.*
  into v_support_message
  from public.support_messages as support_message
  where support_message.thread_id = v_thread.id
    and support_message.author_user_id = v_user_id
    and support_message.request_id = p_request_id;

  if found then
    if v_support_message.author_role <> 'client'
      or v_support_message.body is distinct from v_message then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;

    return query
    select
      v_support_message.id,
      v_support_message.thread_id,
      v_support_message.author_role,
      v_support_message.body,
      v_support_message.created_at,
      v_thread.status,
      v_thread.updated_at,
      v_thread.last_message_at;
    return;
  end if;

  if v_thread.status = 'closed' then
    raise exception 'thread_closed' using errcode = '55000';
  end if;

  if (
    select count(*)
    from public.support_messages as support_message
    where support_message.author_user_id = v_user_id
      and support_message.author_role = 'client'
      and support_message.created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception 'rate_limit_exceeded' using errcode = '54000';
  end if;

  v_now := now();

  insert into public.support_messages as support_message (
    thread_id,
    author_user_id,
    author_role,
    body,
    request_id,
    created_at
  )
  values (
    v_thread.id,
    v_user_id,
    'client',
    v_message,
    p_request_id,
    v_now
  )
  returning support_message.* into v_support_message;

  update public.support_threads as support_thread
  set status = 'waiting_support',
      updated_at = v_now,
      last_message_at = v_now,
      last_client_message_at = v_now,
      closed_at = null
  where support_thread.id = v_thread.id
  returning support_thread.* into v_thread;

  return query
  select
    v_support_message.id,
    v_support_message.thread_id,
    v_support_message.author_role,
    v_support_message.body,
    v_support_message.created_at,
    v_thread.status,
    v_thread.updated_at,
    v_thread.last_message_at;
end;
$$;

create or replace function public.close_my_support_thread(
  p_thread_id uuid
)
returns table (
  id uuid,
  status text,
  updated_at timestamptz,
  closed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_thread public.support_threads%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.id = p_thread_id
    and support_thread.user_id = v_user_id
  for update;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  if v_thread.status <> 'closed' then
    update public.support_threads as support_thread
    set status = 'closed',
        updated_at = now(),
        closed_at = now()
    where support_thread.id = v_thread.id
    returning support_thread.* into v_thread;
  end if;

  return query
  select v_thread.id, v_thread.status, v_thread.updated_at, v_thread.closed_at;
end;
$$;

create or replace function public.reopen_my_support_thread(
  p_thread_id uuid,
  p_message text,
  p_request_id uuid
)
returns table (
  message_id uuid,
  thread_id uuid,
  author_role text,
  body text,
  created_at timestamptz,
  thread_status text,
  thread_updated_at timestamptz,
  thread_last_message_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_message text;
  v_now timestamptz;
  v_thread public.support_threads%rowtype;
  v_support_message public.support_messages%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '23514';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  if v_message is null then
    raise exception 'message_required' using errcode = '23514';
  end if;

  if char_length(v_message) > 4000 then
    raise exception 'message_too_long' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.id = p_thread_id
    and support_thread.user_id = v_user_id
  for update;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  select support_message.*
  into v_support_message
  from public.support_messages as support_message
  where support_message.thread_id = v_thread.id
    and support_message.author_user_id = v_user_id
    and support_message.request_id = p_request_id;

  if found then
    if v_support_message.author_role <> 'client'
      or v_support_message.body is distinct from v_message then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;

    return query
    select
      v_support_message.id,
      v_support_message.thread_id,
      v_support_message.author_role,
      v_support_message.body,
      v_support_message.created_at,
      v_thread.status,
      v_thread.updated_at,
      v_thread.last_message_at;
    return;
  end if;

  if v_thread.status <> 'closed' then
    raise exception 'thread_not_closed' using errcode = '55000';
  end if;

  if (
    select count(*)
    from public.support_messages as support_message
    where support_message.author_user_id = v_user_id
      and support_message.author_role = 'client'
      and support_message.created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception 'rate_limit_exceeded' using errcode = '54000';
  end if;

  v_now := now();

  insert into public.support_messages as support_message (
    thread_id,
    author_user_id,
    author_role,
    body,
    request_id,
    created_at
  )
  values (
    v_thread.id,
    v_user_id,
    'client',
    v_message,
    p_request_id,
    v_now
  )
  returning support_message.* into v_support_message;

  update public.support_threads as support_thread
  set status = 'waiting_support',
      updated_at = v_now,
      last_message_at = v_now,
      last_client_message_at = v_now,
      closed_at = null
  where support_thread.id = v_thread.id
  returning support_thread.* into v_thread;

  return query
  select
    v_support_message.id,
    v_support_message.thread_id,
    v_support_message.author_role,
    v_support_message.body,
    v_support_message.created_at,
    v_thread.status,
    v_thread.updated_at,
    v_thread.last_message_at;
end;
$$;

-- Auxiliary RPC used by the client UI later so has_unread can be cleared safely.
create or replace function public.mark_my_support_thread_read(
  p_thread_id uuid,
  p_last_seen_message_id uuid
)
returns table (
  id uuid,
  client_last_read_at timestamptz,
  has_unread boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_seen_at timestamptz;
  v_thread public.support_threads%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.id = p_thread_id
    and support_thread.user_id = v_user_id
  for update;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  select support_message.created_at
  into v_seen_at
  from public.support_messages as support_message
  where support_message.id = p_last_seen_message_id
    and support_message.thread_id = v_thread.id;

  if not found then
    raise exception 'message_not_available' using errcode = 'P0002';
  end if;

  if v_thread.client_last_read_at is null
    or v_seen_at > v_thread.client_last_read_at then
    update public.support_threads as support_thread
    set client_last_read_at = v_seen_at,
        updated_at = now()
    where support_thread.id = v_thread.id
    returning support_thread.* into v_thread;
  end if;

  return query
  select
    v_thread.id,
    v_thread.client_last_read_at,
    v_thread.last_admin_reply_at is not null
      and (
        v_thread.client_last_read_at is null
        or v_thread.last_admin_reply_at > v_thread.client_last_read_at
      );
end;
$$;

create or replace function public.admin_get_support_overview()
returns table (
  waiting_support_count bigint,
  waiting_customer_count bigint,
  closed_count bigint,
  total_count bigint
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
  select
    count(*) filter (where support_thread.status = 'waiting_support'),
    count(*) filter (where support_thread.status = 'waiting_customer'),
    count(*) filter (where support_thread.status = 'closed'),
    count(*)
  from public.support_threads as support_thread;
end;
$$;

create or replace function public.admin_list_support_threads(
  p_status text default null,
  p_search text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  reference_code text,
  user_id uuid,
  subject text,
  status text,
  order_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_client_message_at timestamptz,
  last_admin_reply_at timestamptz,
  closed_at timestamptz,
  customer_name text,
  customer_email text,
  order_reference text,
  last_message_preview text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_search text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  v_status := nullif(btrim(coalesce(p_status, '')), '');
  v_search := nullif(btrim(coalesce(p_search, '')), '');

  if v_status is not null
    and v_status not in ('waiting_support', 'waiting_customer', 'closed') then
    raise exception 'invalid_support_status' using errcode = '23514';
  end if;

  if v_search is not null and char_length(v_search) > 120 then
    raise exception 'search_too_long' using errcode = '23514';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid_limit' using errcode = '23514';
  end if;

  return query
  select
    support_thread.id,
    support_thread.reference_code,
    support_thread.user_id,
    support_thread.subject,
    support_thread.status,
    support_thread.order_id,
    support_thread.created_at,
    support_thread.updated_at,
    support_thread.last_message_at,
    support_thread.last_client_message_at,
    support_thread.last_admin_reply_at,
    support_thread.closed_at,
    coalesce(
      nullif(btrim(user_profile.full_name), ''),
      nullif(btrim(support_order.customer_name), '')
    ) as customer_name,
    coalesce(
      nullif(btrim(auth_user.email::text), ''),
      nullif(btrim(support_order.customer_email), ''),
      nullif(btrim(user_profile.recovery_email), '')
    ) as customer_email,
    case
      when support_order.id is null then null::text
      else '#' || upper(substr(replace(support_order.id::text, '-', ''), 1, 8))
    end as order_reference,
    case
      when latest_message.body is null then null::text
      else left(
        regexp_replace(btrim(latest_message.body), '[[:space:]]+', ' ', 'g'),
        160
      )
    end as last_message_preview
  from public.support_threads as support_thread
  left join public.orders as support_order
    on support_order.id = support_thread.order_id
    and support_order.user_id = support_thread.user_id
  left join public.user_profiles as user_profile
    on user_profile.user_id = support_thread.user_id
  left join auth.users as auth_user
    on auth_user.id = support_thread.user_id
  left join lateral (
    select support_message.body
    from public.support_messages as support_message
    where support_message.thread_id = support_thread.id
    order by support_message.created_at desc, support_message.id desc
    limit 1
  ) as latest_message on true
  where (v_status is null or support_thread.status = v_status)
    and (
      v_search is null
      or support_thread.reference_code ilike '%' || v_search || '%'
      or support_thread.subject ilike '%' || v_search || '%'
      or coalesce(user_profile.full_name, '') ilike '%' || v_search || '%'
      or coalesce(auth_user.email::text, '') ilike '%' || v_search || '%'
      or coalesce(support_order.customer_name, '') ilike '%' || v_search || '%'
      or coalesce(support_order.customer_email, '') ilike '%' || v_search || '%'
      or coalesce(support_order.id::text, '') ilike '%' || replace(v_search, '#', '') || '%'
    )
  order by support_thread.last_message_at desc, support_thread.id desc
  limit p_limit;
end;
$$;

create or replace function public.admin_get_support_thread_messages(
  p_thread_id uuid,
  p_limit integer default 100
)
returns table (
  id uuid,
  thread_id uuid,
  author_role text,
  body text,
  created_at timestamptz
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

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid_limit' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.support_threads as support_thread
    where support_thread.id = p_thread_id
  ) then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  return query
  select
    recent_message.id,
    recent_message.thread_id,
    recent_message.author_role,
    recent_message.body,
    recent_message.created_at
  from (
    select
      support_message.id,
      support_message.thread_id,
      support_message.author_role,
      support_message.body,
      support_message.created_at
    from public.support_messages as support_message
    where support_message.thread_id = p_thread_id
    order by support_message.created_at desc, support_message.id desc
    limit p_limit
  ) as recent_message
  order by recent_message.created_at asc, recent_message.id asc;
end;
$$;

create or replace function public.admin_add_support_message(
  p_thread_id uuid,
  p_message text,
  p_request_id uuid
)
returns table (
  message_id uuid,
  thread_id uuid,
  author_role text,
  body text,
  created_at timestamptz,
  thread_status text,
  thread_updated_at timestamptz,
  thread_last_message_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_user_id uuid;
  v_message text;
  v_now timestamptz;
  v_thread public.support_threads%rowtype;
  v_support_message public.support_messages%rowtype;
begin
  v_admin_user_id := auth.uid();

  if v_admin_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'request_id_required' using errcode = '23514';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  if v_message is null then
    raise exception 'message_required' using errcode = '23514';
  end if;

  if char_length(v_message) > 4000 then
    raise exception 'message_too_long' using errcode = '23514';
  end if;

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  select support_message.*
  into v_support_message
  from public.support_messages as support_message
  where support_message.thread_id = v_thread.id
    and support_message.author_user_id = v_admin_user_id
    and support_message.request_id = p_request_id;

  if found then
    if v_support_message.author_role <> 'admin'
      or v_support_message.body is distinct from v_message then
      raise exception 'idempotency_conflict' using errcode = '23505';
    end if;

    return query
    select
      v_support_message.id,
      v_support_message.thread_id,
      v_support_message.author_role,
      v_support_message.body,
      v_support_message.created_at,
      v_thread.status,
      v_thread.updated_at,
      v_thread.last_message_at;
    return;
  end if;

  if v_thread.status = 'closed' then
    raise exception 'thread_closed' using errcode = '55000';
  end if;

  v_now := now();

  insert into public.support_messages as support_message (
    thread_id,
    author_user_id,
    author_role,
    body,
    request_id,
    created_at
  )
  values (
    v_thread.id,
    v_admin_user_id,
    'admin',
    v_message,
    p_request_id,
    v_now
  )
  returning support_message.* into v_support_message;

  update public.support_threads as support_thread
  set status = 'waiting_customer',
      updated_at = v_now,
      last_message_at = v_now,
      last_admin_reply_at = v_now,
      closed_at = null
  where support_thread.id = v_thread.id
  returning support_thread.* into v_thread;

  return query
  select
    v_support_message.id,
    v_support_message.thread_id,
    v_support_message.author_role,
    v_support_message.body,
    v_support_message.created_at,
    v_thread.status,
    v_thread.updated_at,
    v_thread.last_message_at;
end;
$$;

create or replace function public.admin_update_support_thread_status(
  p_thread_id uuid,
  p_status text
)
returns table (
  id uuid,
  status text,
  updated_at timestamptz,
  closed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_thread public.support_threads%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  v_status := nullif(btrim(coalesce(p_status, '')), '');

  if v_status is null
    or v_status not in ('waiting_support', 'waiting_customer', 'closed') then
    raise exception 'invalid_support_status' using errcode = '23514';
  end if;

  select support_thread.*
  into v_thread
  from public.support_threads as support_thread
  where support_thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'thread_not_available' using errcode = 'P0002';
  end if;

  if v_thread.status <> v_status then
    update public.support_threads as support_thread
    set status = v_status,
        updated_at = now(),
        closed_at = case when v_status = 'closed' then now() else null end
    where support_thread.id = v_thread.id
    returning support_thread.* into v_thread;
  end if;

  return query
  select v_thread.id, v_thread.status, v_thread.updated_at, v_thread.closed_at;
end;
$$;

-- Trigger functions are not part of the frontend API.
revoke execute on function public.enforce_support_thread_invariants()
from public, anon, authenticated;

revoke execute on function public.enforce_support_message_author()
from public, anon, authenticated;

-- Client RPC grants.
revoke execute on function public.create_my_support_thread(text, text, uuid, uuid)
from public, anon;
grant execute on function public.create_my_support_thread(text, text, uuid, uuid)
to authenticated;

revoke execute on function public.get_my_support_threads(text, integer)
from public, anon;
grant execute on function public.get_my_support_threads(text, integer)
to authenticated;

revoke execute on function public.get_my_support_thread_messages(uuid, integer)
from public, anon;
grant execute on function public.get_my_support_thread_messages(uuid, integer)
to authenticated;

revoke execute on function public.add_my_support_message(uuid, text, uuid)
from public, anon;
grant execute on function public.add_my_support_message(uuid, text, uuid)
to authenticated;

revoke execute on function public.close_my_support_thread(uuid)
from public, anon;
grant execute on function public.close_my_support_thread(uuid)
to authenticated;

revoke execute on function public.reopen_my_support_thread(uuid, text, uuid)
from public, anon;
grant execute on function public.reopen_my_support_thread(uuid, text, uuid)
to authenticated;

revoke execute on function public.mark_my_support_thread_read(uuid, uuid)
from public, anon;
grant execute on function public.mark_my_support_thread_read(uuid, uuid)
to authenticated;

-- Admin RPC grants. Authorization is enforced again inside every function.
revoke execute on function public.admin_get_support_overview()
from public, anon;
grant execute on function public.admin_get_support_overview()
to authenticated;

revoke execute on function public.admin_list_support_threads(text, text, integer)
from public, anon;
grant execute on function public.admin_list_support_threads(text, text, integer)
to authenticated;

revoke execute on function public.admin_get_support_thread_messages(uuid, integer)
from public, anon;
grant execute on function public.admin_get_support_thread_messages(uuid, integer)
to authenticated;

revoke execute on function public.admin_add_support_message(uuid, text, uuid)
from public, anon;
grant execute on function public.admin_add_support_message(uuid, text, uuid)
to authenticated;

revoke execute on function public.admin_update_support_thread_status(uuid, text)
from public, anon;
grant execute on function public.admin_update_support_thread_status(uuid, text)
to authenticated;
