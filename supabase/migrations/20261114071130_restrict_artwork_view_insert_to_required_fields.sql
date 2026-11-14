-- Restrict public artwork-view writes to the two client-supplied fields.
-- The database generates id, viewed_on, and created_at.
revoke insert on table public.artwork_views from public, anon, authenticated;
grant insert (artwork_id, visitor_id) on table public.artwork_views to anon, authenticated;
