-- Row Level Security on EVERY table, and a deny-by-default grant baseline.
-- Supabase auto-grants ALL on new public tables to anon/authenticated; we take that away first
-- and then hand back exactly what each role needs.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

alter table public.stores           enable row level security;
alter table public.sellers          enable row level security;
alter table public.categories       enable row level security;
alter table public.settings         enable row level security;
alter table public.reviews          enable row level security;
alter table public.profiles         enable row level security;
alter table public.pieces           enable row level security;
alter table public.piece_photos     enable row level security;
alter table public.piece_events     enable row level security;
alter table public.holds            enable row level security;
alter table public.customers        enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payment_events   enable row level security;
alter table public.drops            enable row level security;
alter table public.drop_pieces      enable row level security;
alter table public.subscribers      enable row level security;
alter table public.notifications_log enable row level security;
alter table public.rate_limits      enable row level security;
-- Even the table owner is subject to RLS unless it is a SECURITY DEFINER function.
-- (service_role bypasses RLS by design and is only used server-side.)

-- ================= public (anon + signed-in) READ =================
grant select on public.stores, public.sellers, public.categories, public.settings, public.reviews,
                public.pieces, public.piece_photos, public.drops to anon, authenticated;

create policy stores_read     on public.stores     for select to anon, authenticated using (true);
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy settings_read   on public.settings   for select to anon, authenticated using (true);
create policy reviews_read    on public.reviews    for select to anon, authenticated using (true);
create policy sellers_read    on public.sellers    for select to anon, authenticated using (active);

-- Drafts and archived pieces are invisible. Sold ones show for sold_visible_days, then drop off.
create policy pieces_public_read on public.pieces for select to anon, authenticated using (
  status in ('live', 'held')
  or (status = 'sold' and sold_at > now() - make_interval(days => (select sold_visible_days from public.settings)))
);
create policy pieces_staff_read on public.pieces for select to authenticated using (public.can_manage_store(store_id));

-- Photos follow piece visibility (the sub-select is itself filtered by the pieces policies above).
create policy photos_read on public.piece_photos for select to anon, authenticated using (
  exists (select 1 from public.pieces p where p.id = piece_photos.piece_id)
);

-- Drops: only the name and time are public, and only while scheduled/live. The piece list is NOT public.
create policy drops_public_read on public.drops for select to anon, authenticated using (status in ('scheduled', 'live'));
create policy drops_owner_read  on public.drops for select to authenticated using (public.is_owner());

-- ================= signed-in staff / owner =================
grant select on public.profiles, public.piece_events, public.customers, public.orders, public.order_items,
                public.notifications_log, public.subscribers, public.drop_pieces to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_owner());

create policy piece_events_read on public.piece_events for select to authenticated using (
  exists (select 1 from public.pieces p where p.id = piece_events.piece_id and public.can_manage_store(p.store_id))
);

-- Orders: owner sees all; staff see orders for their store (pickup here, or containing a piece from here).
-- The visibility rule lives in SECURITY DEFINER helpers so orders <-> order_items policies cannot recurse.
create function public.order_visible_to_staff(p_order uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order
      and (public.is_owner() or o.store_id = public.app_store()
           or exists (select 1 from public.order_items i where i.order_id = o.id and i.store_id = public.app_store())))
$$;
create function public.customer_visible_to_staff(p_customer uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.orders o where o.customer_id = p_customer and public.order_visible_to_staff(o.id))
$$;
grant execute on function public.order_visible_to_staff(uuid), public.customer_visible_to_staff(uuid) to authenticated, service_role;

create policy orders_read on public.orders for select to authenticated using (public.order_visible_to_staff(id));
create policy order_items_read on public.order_items for select to authenticated using (public.order_visible_to_staff(order_id));
create policy customers_read on public.customers for select to authenticated using (public.customer_visible_to_staff(id));
create policy notifications_read on public.notifications_log for select to authenticated using (
  public.is_owner() or (order_id is not null and public.order_visible_to_staff(order_id))
);
create policy subscribers_owner_read on public.subscribers for select to authenticated using (public.is_owner());
create policy drop_pieces_owner_read on public.drop_pieces for select to authenticated using (public.is_owner());

-- ----- writes: pieces (column-level; status/held_until/sold_* are NOT writable by any client role) -----
grant insert (slug, title, description, category_id, store_id, seller_id, size, era, condition, condition_notes,
              authenticity_notes, measurements, price_cents, price_is_placeholder, featured_rank)
  on public.pieces to authenticated;
grant update (title, description, category_id, store_id, seller_id, size, era, condition, condition_notes,
              authenticity_notes, measurements, price_cents, price_is_placeholder, featured_rank)
  on public.pieces to authenticated;

create policy pieces_staff_insert on public.pieces for insert to authenticated
  with check (public.can_manage_store(store_id) and status = 'draft');
create policy pieces_staff_update on public.pieces for update to authenticated
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));

grant insert, update, delete on public.piece_photos to authenticated;
create policy photos_staff_write on public.piece_photos for all to authenticated
  using (exists (select 1 from public.pieces p where p.id = piece_photos.piece_id and public.can_manage_store(p.store_id)))
  with check (exists (select 1 from public.pieces p where p.id = piece_photos.piece_id and public.can_manage_store(p.store_id)));

-- ----- writes: owner-only tables -----
grant insert, update, delete on public.sellers, public.categories, public.reviews, public.drops, public.drop_pieces to authenticated;
grant update on public.stores, public.settings to authenticated;
create policy sellers_owner_write    on public.sellers    for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy categories_owner_write on public.categories for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy reviews_owner_write    on public.reviews    for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy drops_owner_write      on public.drops      for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy drop_pieces_owner_write on public.drop_pieces for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy stores_owner_update    on public.stores     for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy settings_owner_update  on public.settings   for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy sellers_owner_read     on public.sellers    for select to authenticated using (public.is_owner());

-- holds, payment_events, rate_limits: RLS on, NO policies, NO grants => unreachable from any client role.
-- orders / order_items / customers / subscribers / notifications_log: read-only for staff, never writable by clients.

-- ================= function execute grants =================
-- Server-only (service_role): anything that trusts a session id, moves money, or sends data out.
grant execute on function public.check_rate_limit(text, int, int)            to service_role;
grant execute on function public.prune_rate_limits()                         to service_role;
grant execute on function public.create_hold(uuid, uuid)                     to service_role;
grant execute on function public.release_hold(uuid, uuid)                    to service_role;
grant execute on function public.expire_holds()                              to service_role;
grant execute on function public.extend_holds_for_checkout(uuid, int)        to service_role;
grant execute on function public.get_my_bag(uuid)                            to service_role;
grant execute on function public.create_pending_order(uuid, fulfillment, text, text, text, text, jsonb, text, text) to service_role;
grant execute on function public.finalize_order(uuid, text)                  to service_role;
grant execute on function public.mark_order_refunded(uuid, text)             to service_role;
grant execute on function public.get_order_by_token(text)                    to service_role;
grant execute on function public.subscribe_alerts(text, text, text, text, text, text) to service_role;
grant execute on function public.unsubscribe_by_token(text)                  to service_role;
grant execute on function public.release_due_drops()                         to service_role;
grant execute on function public.drops_needing_alert()                       to service_role;
grant execute on function public.clear_old_badges()                          to service_role;

-- Signed-in staff (authorisation is re-checked inside each function):
grant execute on function public.set_piece_status(uuid, piece_status, text)  to authenticated, service_role;
grant execute on function public.mark_sold_in_store(uuid)                    to authenticated, service_role;
grant execute on function public.release_hold_admin(uuid)                    to authenticated, service_role;
grant execute on function public.advance_order(uuid, text, text, text)       to authenticated, service_role;

-- Helpers used inside policies must be executable by the roles that evaluate them.
grant execute on function public.app_role(), public.app_store(), public.is_owner(), public.can_manage_store(uuid)
  to anon, authenticated, service_role;
grant execute on function public.require_staff() to authenticated, service_role;

-- service_role keeps full table access for server-only code paths (webhook, cron, outbox).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
