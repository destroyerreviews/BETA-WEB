-- Admin Panel v1: allow active admins to update free trial request statuses.

create or replace function public.admin_update_free_trial_status(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns table (
  id uuid,
  status text,
  note text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.is_admin() is not true then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select free_trial_request.id
  into v_request_id
  from public.free_trial_requests as free_trial_request
  where free_trial_request.id = p_request_id
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if p_status is null
    or p_status not in ('pending', 'review', 'active', 'completed') then
    raise exception 'invalid_free_trial_status' using errcode = '23514';
  end if;

  return query
  update public.free_trial_requests as free_trial_request
  set status = p_status,
      note = nullif(btrim(p_note), ''),
      updated_at = now()
  where free_trial_request.id = v_request_id
  returning
    free_trial_request.id,
    free_trial_request.status,
    free_trial_request.note,
    free_trial_request.updated_at;
end;
$$;

revoke execute on function public.admin_update_free_trial_status(
  uuid,
  text,
  text
) from public;

revoke execute on function public.admin_update_free_trial_status(
  uuid,
  text,
  text
) from anon;

grant execute on function public.admin_update_free_trial_status(
  uuid,
  text,
  text
) to authenticated;
