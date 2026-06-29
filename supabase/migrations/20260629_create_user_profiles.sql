create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade unique,
  full_name text,
  whatsapp text,
  recovery_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_user_profiles_updated_at()
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

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.user_profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.user_profiles;
drop policy if exists "Users can create their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;

create policy "Users can view their own profile"
on public.user_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own profile"
on public.user_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
