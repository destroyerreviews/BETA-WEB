create extension if not exists pgcrypto;

create table if not exists public.free_trial_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  google_maps_url text not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint free_trial_requests_user_id_key unique (user_id),
  constraint free_trial_requests_status_check check (status in ('pending', 'review', 'active', 'completed'))
);

create or replace function public.set_free_trial_requests_updated_at()
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

drop trigger if exists set_free_trial_requests_updated_at on public.free_trial_requests;

create trigger set_free_trial_requests_updated_at
before update on public.free_trial_requests
for each row
execute function public.set_free_trial_requests_updated_at();

alter table public.free_trial_requests enable row level security;

grant usage on schema public to authenticated;
grant select, insert on public.free_trial_requests to authenticated;

drop policy if exists "Users can view their own free trial request" on public.free_trial_requests;
drop policy if exists "Users can create their own free trial request" on public.free_trial_requests;

create policy "Users can view their own free trial request"
on public.free_trial_requests
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own free trial request"
on public.free_trial_requests
for insert
to authenticated
with check (user_id = auth.uid());
