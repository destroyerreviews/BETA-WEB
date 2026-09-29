begin;

revoke execute on function public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) from authenticated;

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

commit;
