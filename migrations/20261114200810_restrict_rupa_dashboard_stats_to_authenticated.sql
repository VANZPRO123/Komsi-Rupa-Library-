-- Dashboard statistics include member-level data and must only be callable by signed-in users.
revoke execute on function public.get_rupa_dashboard_stats() from public, anon;
grant execute on function public.get_rupa_dashboard_stats() to authenticated;
