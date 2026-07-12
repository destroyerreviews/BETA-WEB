-- Admin Panel v1: administrative identity and read-only access.
-- The first administrator must be inserted manually outside this migration.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  revoked_at timestamptz null
);

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_users_updated_at on public.admin_users;

create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_admin_users_updated_at();

alter table public.admin_users enable row level security;

-- No frontend role can create, modify, or delete administrator memberships.
-- SELECT is granted to authenticated so RLS can allow active admins only.
revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.admin_users as admin_user
      where admin_user.user_id = auth.uid()
        and admin_user.is_active = true
        and admin_user.revoked_at is null
    );
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Active admins can view admin users" on public.admin_users;

create policy "Active admins can view admin users"
on public.admin_users
for select
to authenticated
using ((select public.is_admin()));

-- Existing client policies remain unchanged. These additional permissive
-- SELECT policies grant global reads only when is_admin() returns true.
drop policy if exists "Active admins can view all orders" on public.orders;
drop policy if exists "Active admins can view all order items" on public.order_items;
drop policy if exists "Active admins can view all order reviews" on public.order_reviews;
drop policy if exists "Active admins can view all review media" on public.review_media;
drop policy if exists "Active admins can view all free trial requests" on public.free_trial_requests;

create policy "Active admins can view all orders"
on public.orders
for select
to authenticated
using ((select public.is_admin()));

create policy "Active admins can view all order items"
on public.order_items
for select
to authenticated
using ((select public.is_admin()));

create policy "Active admins can view all order reviews"
on public.order_reviews
for select
to authenticated
using ((select public.is_admin()));

create policy "Active admins can view all review media"
on public.review_media
for select
to authenticated
using ((select public.is_admin()));

create policy "Active admins can view all free trial requests"
on public.free_trial_requests
for select
to authenticated
using ((select public.is_admin()));

-- The review-media bucket remains private. Active admins receive SELECT only;
-- no administrative INSERT, UPDATE, or DELETE policy is introduced.
drop policy if exists "Active admins can view review media objects" on storage.objects;

create policy "Active admins can view review media objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'review-media'
  and (select public.is_admin())
);
