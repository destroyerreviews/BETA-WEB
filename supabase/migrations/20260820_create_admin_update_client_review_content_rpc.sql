-- Admin Panel v1: allow active admins to correct submitted client review content.

create or replace function public.admin_update_client_review_content(
  p_review_id uuid,
  p_rating integer,
  p_review_text text,
  p_review_notes text default null
)
returns table (
  id uuid,
  order_id uuid,
  review_index integer,
  source text,
  rating integer,
  review_text text,
  review_notes text,
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

  if v_review.source <> 'client' then
    raise exception 'only_client_reviews_can_be_edited' using errcode = '42501';
  end if;

  if v_review.status <> 'submitted' then
    raise exception 'invalid_review_status' using errcode = '23514';
  end if;

  if p_rating is null or p_rating not between 3 and 5 then
    raise exception 'invalid_rating' using errcode = '23514';
  end if;

  if nullif(btrim(coalesce(p_review_text, '')), '') is null then
    raise exception 'review_text_required' using errcode = '23514';
  end if;

  return query
  update public.order_reviews as review
  set rating = p_rating,
      review_text = btrim(p_review_text),
      review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
      updated_at = now()
  where review.id = v_review.id
  returning
    review.id,
    review.order_id,
    review.review_index,
    review.source,
    review.rating,
    review.review_text,
    review.review_notes,
    review.status,
    review.updated_at;
end;
$$;

revoke execute on function public.admin_update_client_review_content(
  uuid,
  integer,
  text,
  text
) from public;

revoke execute on function public.admin_update_client_review_content(
  uuid,
  integer,
  text,
  text
) from anon;

grant execute on function public.admin_update_client_review_content(
  uuid,
  integer,
  text,
  text
) to authenticated;
