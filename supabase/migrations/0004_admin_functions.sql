-- Admin-side functions. Callable by signed-in staff (authenticated); each one re-checks role and store
-- inside the function, so even a hand-crafted RPC call can't cross stores or skip the state machine.

create function public.require_staff() returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
end $$;

-- Staff can't write pieces.status directly (no column grant). This is the only door.
create function public.set_piece_status(p_piece uuid, p_to piece_status, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare pc pieces%rowtype;
begin
  perform require_staff();
  select * into pc from pieces where id = p_piece for update;
  if not found then raise exception 'piece not found'; end if;
  if not can_manage_store(pc.store_id) then raise exception 'not authorised for this store' using errcode = '42501'; end if;
  if p_to not in ('draft', 'live', 'archived') then
    raise exception 'staff can only move a piece to draft, live or archived' using errcode = 'P0001';
  end if;
  if pc.status in ('held', 'sold') then
    raise exception 'piece is % and cannot be changed that way', pc.status using errcode = 'P0001';
  end if;
  perform set_config('app.reason', coalesce(p_reason, 'staff change'), true);
  update pieces set status = p_to, live_at = case when p_to = 'live' then now() else live_at end,
    just_dropped_until = null where id = p_piece;
  return jsonb_build_object('ok', true, 'status', p_to);
end $$;

create function public.mark_sold_in_store(p_piece uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare pc pieces%rowtype;
begin
  perform require_staff();
  select * into pc from pieces where id = p_piece for update;
  if not found then raise exception 'piece not found'; end if;
  if not can_manage_store(pc.store_id) then raise exception 'not authorised for this store' using errcode = '42501'; end if;
  if pc.status not in ('live', 'held') then
    return jsonb_build_object('ok', false, 'code', pc.status);
  end if;
  delete from holds where piece_id = p_piece;                   -- any shopper's hold dies; their payment would be refunded
  perform set_config('app.reason', 'sold in store', true);
  update pieces set status = 'sold', sold_at = now(), sold_via = 'in_store', held_until = null where id = p_piece;
  return jsonb_build_object('ok', true);
end $$;

create function public.release_hold_admin(p_piece uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare pc pieces%rowtype;
begin
  perform require_staff();
  select * into pc from pieces where id = p_piece for update;
  if not found then raise exception 'piece not found'; end if;
  if not can_manage_store(pc.store_id) then raise exception 'not authorised for this store' using errcode = '42501'; end if;
  delete from holds where piece_id = p_piece;
  perform set_config('app.reason', 'hold released by staff', true);
  update pieces set status = 'live', held_until = null where id = p_piece and status = 'held';
  return jsonb_build_object('ok', true);
end $$;

-- Pickup:  paid -> bagged -> ready -> picked_up      Ship: paid -> packed -> shipped (needs tracking)
create function public.advance_order(p_order uuid, p_action text, p_carrier text default null, p_tracking text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype; next_status order_status; allowed boolean;
begin
  perform require_staff();
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  allowed := is_owner() or o.store_id = app_store()
    or exists (select 1 from order_items i where i.order_id = o.id and i.store_id = app_store());
  if not allowed then raise exception 'not authorised for this order' using errcode = '42501'; end if;

  next_status := case
    when o.fulfillment = 'pickup' and o.status = 'paid'   and p_action = 'bag'     then 'bagged'
    when o.fulfillment = 'pickup' and o.status = 'bagged' and p_action = 'ready'   then 'ready'
    when o.fulfillment = 'pickup' and o.status = 'ready'  and p_action = 'pickup'  then 'picked_up'
    when o.fulfillment = 'ship'   and o.status = 'paid'   and p_action = 'pack'    then 'packed'
    when o.fulfillment = 'ship'   and o.status = 'packed' and p_action = 'ship'    then 'shipped'
    else null end;
  if next_status is null then
    return jsonb_build_object('ok', false, 'code', 'bad_transition', 'status', o.status);
  end if;
  if next_status = 'shipped' and (coalesce(trim(p_carrier), '') = '' or coalesce(trim(p_tracking), '') = '') then
    return jsonb_build_object('ok', false, 'code', 'tracking_required');
  end if;
  update orders set status = next_status,
    tracking_carrier = case when next_status = 'shipped' then trim(p_carrier) else tracking_carrier end,
    tracking_number  = case when next_status = 'shipped' then trim(p_tracking) else tracking_number end
  where id = p_order;
  return jsonb_build_object('ok', true, 'status', next_status);
end $$;

-- Drops: flip every draft piece in every due drop to live in ONE statement (one realtime burst).
create function public.release_due_drops() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare ids uuid[]; n int := 0;
begin
  perform set_config('app.reason', 'drop opened', true);
  perform set_config('app.actor', 'system', true);
  select coalesce(array_agg(id), '{}') into ids from drops where status = 'scheduled' and starts_at <= now();
  if array_length(ids, 1) is null then return jsonb_build_object('released', 0, 'drops', '[]'::jsonb); end if;
  with u as (
    update pieces p set status = 'live', live_at = now(), just_dropped_until = now() + interval '2 hours'
    from drop_pieces dp where dp.piece_id = p.id and dp.drop_id = any (ids) and p.status = 'draft'
    returning p.id)
  select count(*) into n from u;
  update drops set status = 'live', released_at = now() where id = any (ids);
  return jsonb_build_object('released', n, 'drops', to_jsonb(ids));
end $$;

-- Drops that have opened and want an alert that hasn't gone out yet (the Next cron tick sends them).
create function public.drops_needing_alert() returns setof drops
language sql stable security definer set search_path = public, pg_temp as $$
  select * from drops where status = 'live' and alert_on_release and alert_sent_at is null
$$;

-- Hosted-tier safety: strip expired "just dropped" badges lazily (cron also does it).
create function public.clear_old_badges() returns int
language sql security definer set search_path = public, pg_temp as $$
  with u as (update pieces set just_dropped_until = null where just_dropped_until is not null and just_dropped_until <= now() returning 1)
  select count(*)::int from u
$$;
