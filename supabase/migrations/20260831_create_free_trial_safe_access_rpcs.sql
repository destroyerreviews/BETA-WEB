-- Free trials: add safe client creation/read RPCs and an admin-only list RPC.

create or replace function public.get_my_free_trial_request()
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  review_text text
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

  return query
  select
    free_trial_request.id,
    free_trial_request.status,
    free_trial_request.created_at,
    free_trial_request.updated_at,
    case
      when free_trial_request.status = 'completed' then free_trial_request.review_text
      else null::text
    end as review_text
  from public.free_trial_requests as free_trial_request
  where free_trial_request.user_id = v_user_id
  limit 1;
end;
$$;

create or replace function public.create_my_free_trial_request(
  p_google_maps_url text,
  p_note text default null
)
returns table (
  id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  review_text text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_google_maps_url text;
  v_note text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  v_google_maps_url := nullif(btrim(p_google_maps_url), '');

  if v_google_maps_url is null then
    raise exception 'google_maps_url_required' using errcode = '23514';
  end if;

  v_note := nullif(btrim(p_note), '');

  insert into public.free_trial_requests (
    user_id,
    google_maps_url,
    note,
    status,
    review_text
  )
  values (
    v_user_id,
    v_google_maps_url,
    v_note,
    'pending',
    null
  )
  on conflict (user_id) do nothing;

  return query
  select
    free_trial_request.id,
    free_trial_request.status,
    free_trial_request.created_at,
    free_trial_request.updated_at,
    case
      when free_trial_request.status = 'completed' then free_trial_request.review_text
      else null::text
    end as review_text
  from public.free_trial_requests as free_trial_request
  where free_trial_request.user_id = v_user_id
  limit 1;
end;
$$;

create or replace function public.admin_list_free_trial_requests()
returns table (
  id uuid,
  user_id uuid,
  google_maps_url text,
  note text,
  status text,
  review_text text,
  created_at timestamptz,
  updated_at timestamptz
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
    free_trial_request.id,
    free_trial_request.user_id,
    free_trial_request.google_maps_url,
    free_trial_request.note,
    free_trial_request.status,
    free_trial_request.review_text,
    free_trial_request.created_at,
    free_trial_request.updated_at
  from public.free_trial_requests as free_trial_request
  order by free_trial_request.created_at desc;
end;
$$;

revoke execute on function public.get_my_free_trial_request()
from public;

revoke execute on function public.get_my_free_trial_request()
from anon;

grant execute on function public.get_my_free_trial_request()
to authenticated;

revoke execute on function public.create_my_free_trial_request(
  text,
  text
)
from public;

revoke execute on function public.create_my_free_trial_request(
  text,
  text
)
from anon;

grant execute on function public.create_my_free_trial_request(
  text,
  text
)
to authenticated;

revoke execute on function public.admin_list_free_trial_requests()
from public;

revoke execute on function public.admin_list_free_trial_requests()
from anon;

grant execute on function public.admin_list_free_trial_requests()
to authenticated;
