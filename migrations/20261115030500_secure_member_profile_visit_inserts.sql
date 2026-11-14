-- Profile visits are now recorded only by the server-side Edge Function.
-- The function derives a daily visitor identifier from a keyed HMAC and never stores raw IP addresses.
-- Keep INSERT available to the server-side service role only.
grant insert on table public.member_profile_visits to service_role;
drop policy if exists "Public can record profile visits" on public.member_profile_visits;
revoke insert on table public.member_profile_visits from anon, authenticated;
