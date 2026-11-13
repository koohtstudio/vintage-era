-- The role/visibility helpers are only used inside policies that apply to signed-in users.
-- Anonymous visitors never need to execute them (and the Supabase linter flags it), so take it away.
revoke execute on function public.app_role(), public.app_store(), public.is_owner(), public.can_manage_store(uuid) from anon;
revoke execute on function public.order_visible_to_staff(uuid), public.customer_visible_to_staff(uuid) from anon;
