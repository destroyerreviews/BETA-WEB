-- Admin Panel v1: allow active admins to complete internally reviewed reviews.

create or replace function public.admin_complete_review(
  p_review_id uuid
)
returns table (
  id uuid,
  order_id uuid,
  review_index integer,
  source text,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.order_reviews%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select review.*
  into v_review
  from public.order_reviews as review
  where review.id = p_review_id
  for update;

  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  if v_review.source not in ('team', 'client') then
    raise exception 'invalid_review_source' using errcode = '23514';
  end if;

  if (v_review.source = 'team' and v_review.status <> 'prepared')
    or (v_review.source = 'client' and v_review.status <> 'submitted') then
    raise exception 'invalid_review_status' using errcode = '23514';
  end if;

  return query
  update public.order_reviews as review
  set status = 'completed',
      updated_at = now()
  where review.id = v_review.id
  returning
    review.id,
    review.order_id,
    review.review_index,
    review.source,
    review.status,
    review.updated_at;
end;
$$;

revoke execute on function public.admin_complete_review(uuid) from public;
revoke execute on function public.admin_complete_review(uuid) from anon;
grant execute on function public.admin_complete_review(uuid) to authenticated;
