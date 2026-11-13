-- Role helpers (used by RLS policies and admin functions) and the piece state machine.

create function public.app_role() returns user_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.app_store() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select store_id from public.profiles where id = auth.uid()
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

-- Can the signed-in user manage things at this store?
create function public.can_manage_store(p_store uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select role = 'owner' or store_id = p_store from public.profiles where id = auth.uid()),
    false)
$$;

-- ---------- piece state machine ----------
-- Enforced for EVERYONE (including SECURITY DEFINER functions). Allowed moves:
--   draft<->live, draft->archived, live->archived, archived->draft,
--   live->held, held->live, live->sold, held->sold.   sold is terminal.
create function public.guard_piece_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare ok boolean; s settings%rowtype;
begin
  if new.status is distinct from old.status then
    ok := (old.status, new.status) in (
      ('draft', 'live'), ('live', 'draft'), ('draft', 'archived'), ('live', 'archived'), ('archived', 'draft'),
      ('live', 'held'), ('held', 'live'), ('live', 'sold'), ('held', 'sold'));
    if not ok then
      raise exception 'illegal piece transition % -> %', old.status, new.status using errcode = 'P0001';
    end if;
  end if;

  if old.status = 'sold' then
    -- sold rows are frozen except cosmetic fields
    if new.price_cents <> old.price_cents or new.sold_order_id is distinct from old.sold_order_id
       or new.store_id <> old.store_id or new.seller_id is distinct from old.seller_id then
      raise exception 'a sold piece cannot be changed' using errcode = 'P0001';
    end if;
  end if;

  if old.status = 'held' and new.status = 'held' and new.price_cents <> old.price_cents then
    raise exception 'cannot change the price while a piece is in someone''s bag' using errcode = 'P0001';
  end if;

  if new.status = 'live' and old.status is distinct from 'live' and new.price_is_placeholder then
    select * into s from settings;
    if not s.allow_placeholder_prices then
      raise exception 'placeholder price: set a real price before putting this piece on the site' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'live' and old.status in ('draft') then
    new.live_at := coalesce(new.live_at, now());
  end if;
  return new;
end $$;
create trigger pieces_guard before update on public.pieces for each row execute function public.guard_piece_update();

-- Audit trail for every status change (who/when), written by the DB so nothing can skip it.
create function public.log_piece_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into piece_events (piece_id, from_status, to_status, actor_id, actor_label, reason)
    values (new.id, null, new.status, auth.uid(), coalesce(nullif(current_setting('app.actor', true), ''), 'staff'), 'created');
  elsif new.status is distinct from old.status then
    insert into piece_events (piece_id, from_status, to_status, actor_id, actor_label, reason)
    values (new.id, old.status, new.status, auth.uid(),
            coalesce(nullif(current_setting('app.actor', true), ''), case when auth.uid() is null then 'system' else 'staff' end),
            nullif(current_setting('app.reason', true), ''));
  end if;
  return null;
end $$;
create trigger pieces_log_insert after insert on public.pieces for each row execute function public.log_piece_status();
create trigger pieces_log_update after update on public.pieces for each row execute function public.log_piece_status();

-- Only drafts can be put in a drop, and only before the drop has been released.
create function public.guard_drop_piece() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare st piece_status; ds drop_status;
begin
  select status into st from pieces where id = new.piece_id;
  select status into ds from drops where id = new.drop_id;
  if st is distinct from 'draft' then raise exception 'only draft pieces can be added to a drop'; end if;
  if ds is distinct from 'scheduled' then raise exception 'this drop is no longer scheduled'; end if;
  return new;
end $$;
create trigger drop_pieces_guard before insert on public.drop_pieces for each row execute function public.guard_drop_piece();

-- Broadcast order status changes on an unguessable topic so the shopper's order page updates live.
create function public.broadcast_order_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status or new.tracking_number is distinct from old.tracking_number then
    begin
      perform realtime.send(
        jsonb_build_object('status', new.status, 'tracking_carrier', new.tracking_carrier, 'tracking_number', new.tracking_number),
        'status', 'order:' || new.public_token, false);
    exception when others then
      null; -- realtime schema missing (plain Postgres) must never block an order update
    end;
  end if;
  return null;
end $$;
create trigger orders_broadcast after update on public.orders for each row execute function public.broadcast_order_status();
