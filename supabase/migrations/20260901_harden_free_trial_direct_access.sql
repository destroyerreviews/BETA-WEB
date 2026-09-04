-- Free trials: require the safe RPC layer for all frontend access.

alter table public.free_trial_requests enable row level security;

revoke select, insert, update, delete
on table public.free_trial_requests
from public;

revoke select, insert, update, delete
on table public.free_trial_requests
from anon;

revoke select, insert, update, delete
on table public.free_trial_requests
from authenticated;

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

revoke execute on function public.admin_update_free_trial_request(
  uuid,
  text,
  text
)
from public;

revoke execute on function public.admin_update_free_trial_request(
  uuid,
  text,
  text
)
from anon;

grant execute on function public.admin_update_free_trial_request(
  uuid,
  text,
  text
)
to authenticated;

revoke execute on function public.admin_update_free_trial_status(
  uuid,
  text,
  text
)
from public;

revoke execute on function public.admin_update_free_trial_status(
  uuid,
  text,
  text
)
from anon;

revoke execute on function public.admin_update_free_trial_status(
  uuid,
  text,
  text
)
from authenticated;
