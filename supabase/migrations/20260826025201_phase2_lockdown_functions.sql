/*
# Lock down SECURITY DEFINER function execution

## Summary
Revokes EXECUTE on the three SECURITY DEFINER helper functions from
anon/authenticated/public so they cannot be invoked through the REST API
(/rest/v1/rpc/...). They remain usable by internal database mechanisms
(triggers and RLS policy evaluation), which run with the table owner's
privileges and do not require explicit EXECUTE grants to the client roles.

## Functions affected
- public.handle_new_user()   — trigger function (runs on auth.users insert)
- public.handle_updated_at() — trigger function (runs on shopping_lists update)
- public.can_access_list(uuid) — used inside RLS policies on shopping_items

## Security changes
- REVOKE EXECUTE on all three from PUBLIC, anon, and authenticated.
- These were flagged by the Supabase security advisor as callable by
  client roles; this migration closes that surface.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_list(uuid) FROM PUBLIC, anon, authenticated;
