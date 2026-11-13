-- Shopper-side functions. All SECURITY DEFINER, all callable ONLY by the server (service_role):
-- the session id comes from a signed cookie that only our server can verify, so the browser
-- must never be able to call these directly with a forged id (grants are in 0005).

-- ---------- rate limit (fixed window) ----------
create function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare c int; ws timestamptz;
begin
  insert into rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning r.count, r.window_start into c, ws;
  return jsonb_build_object(
    'ok', c <= p_limit, 'count', c,
    'retry_after', greatest(0, ceil(extract(epoch from (ws + make_interval(secs => p_window_seconds) - now()))))::int);
end $$;

create function public.prune_rate_limits() returns int
language sql security definer set search_path = public, pg_temp as $$
  with d as (delete from rate_limits where window_start < now() - interval '1 day' returning 1) select count(*)::int from d
$$;

-- ---------- holds ----------
-- Atomically: lock the piece, clear a stale hold, require status=live, enforce the per-session cap,
-- insert the hold (UNIQUE(piece_id) is the backstop) and flip the piece to held.
create function public.create_hold(p_piece uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare pc pieces%rowtype; hd holds%rowtype; s settings%rowtype; active int; exp timestamptz;
begin
  select * into s from settings;
  select * into pc from pieces where id = p_piece for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'unavailable'); end if;

  delete from holds where piece_id = p_piece and expires_at <= now();         -- lazy expiry
  if pc.status = 'held' and not exists (select 1 from holds where piece_id = p_piece) then
    update pieces set status = 'live', held_until = null where id = p_piece;
    pc.status := 'live';
  end if;

  select * into hd from holds where piece_id = p_piece;
  if found then
    if hd.session_id = p_session then
      return jsonb_build_object('ok', true, 'code', 'already', 'expires_at', hd.expires_at);
    end if;
    return jsonb_build_object('ok', false, 'code', 'held');
  end if;

  if pc.status = 'sold' then return jsonb_build_object('ok', false, 'code', 'sold'); end if;
  if pc.status <> 'live' then return jsonb_build_object('ok', false, 'code', 'unavailable'); end if;

  select count(*) into active from holds where session_id = p_session and expires_at > now();
  if active >= s.max_holds_per_session then
    return jsonb_build_object('ok', false, 'code', 'cap', 'cap', s.max_holds_per_session);
  end if;

  exp := now() + make_interval(mins => s.hold_minutes);
  insert into holds (piece_id, session_id, expires_at) values (p_piece, p_session, exp);
  perform set_config('app.reason', 'added to bag', true);
  perform set_config('app.actor', 'shopper', true);
  update pieces set status = 'held', held_until = exp where id = p_piece;
  return jsonb_build_object('ok', true, 'code', 'held', 'expires_at', exp);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'code', 'held');
end $$;

create function public.release_hold(p_piece uuid, p_session uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform 1 from pieces where id = p_piece for update;
  delete from holds where piece_id = p_piece and session_id = p_session;
  get diagnostics n = row_count;
  if n > 0 then
    perform set_config('app.reason', 'removed from bag', true);
    perform set_config('app.actor', 'shopper', true);
    update pieces set status = 'live', held_until = null where id = p_piece and status = 'held';
  end if;
  return n > 0;
end $$;

-- Cron + lazy sweep: drop expired holds and put the pieces back on the rack.
create function public.expire_holds() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform set_config('app.reason', 'hold expired', true);
  perform set_config('app.actor', 'system', true);
  with d as (delete from holds where expires_at <= now() returning piece_id),
       u as (update pieces p set status = 'live', held_until = null
             from d where p.id = d.piece_id and p.status = 'held' returning p.id)
  select count(*) into n from u;
  return n;
end $$;

-- Hosted Stripe Checkout cannot expire in under 30 minutes, so when payment starts we lengthen
-- the shopper's live holds once. finalize_order() is still the safety net if someone gets in first.
create function public.extend_holds_for_checkout(p_session uuid, p_minutes int default 30)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  with h as (
    update holds set expires_at = greatest(expires_at, now() + make_interval(mins => p_minutes)), extended = true
    where session_id = p_session and expires_at > now() and not extended
    returning piece_id, expires_at),
  u as (update pieces p set held_until = h.expires_at from h where p.id = h.piece_id and p.status = 'held' returning p.id)
  select count(*) into n from u;
  return n;
end $$;

-- The shopper's own bag (the ONLY way holds are read).
create function public.get_my_bag(p_session uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'piece_id', p.id, 'slug', p.slug, 'title', p.title, 'size', p.size, 'era', p.era,
    'price_cents', p.price_cents, 'price_is_placeholder', p.price_is_placeholder,
    'store', s.slug, 'store_name', s.name, 'expires_at', h.expires_at,
    'cover_path', ph.path, 'cover_source', ph.source, 'cover_blur', ph.blur_data_url
  ) order by h.created_at), '[]'::jsonb)
  from holds h
  join pieces p on p.id = h.piece_id and p.status = 'held'
  join stores s on s.id = p.store_id
  left join lateral (select path, source, blur_data_url from piece_photos where piece_id = p.id order by position limit 1) ph on true
  where h.session_id = p_session and h.expires_at > now()
$$;

-- ---------- orders ----------
-- Every number is computed HERE from the database. The client never sends a price.
create function public.create_pending_order(
  p_session uuid, p_fulfillment fulfillment, p_store_slug text,
  p_name text, p_email text, p_phone text, p_ship_address jsonb,
  p_idempotency_key text, p_provider text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare s settings%rowtype; o orders%rowtype; cust uuid; store uuid; n int; subtotal int; ship int; tax int; oid uuid;
begin
  select * into o from orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('ok', true, 'order_id', o.id, 'number', o.number, 'public_token', o.public_token,
      'total_cents', o.total_cents, 'subtotal_cents', o.subtotal_cents, 'shipping_cents', o.shipping_cents, 'tax_cents', o.tax_cents);
  end if;

  select * into s from settings;
  select count(*)::int, coalesce(sum(p.price_cents), 0)::int into n, subtotal
  from holds h join pieces p on p.id = h.piece_id
  where h.session_id = p_session and h.expires_at > now() and p.status = 'held';
  if n = 0 then return jsonb_build_object('ok', false, 'code', 'empty'); end if;

  if p_fulfillment = 'pickup' then
    select id into store from stores where slug = p_store_slug;
    if store is null then return jsonb_build_object('ok', false, 'code', 'bad_store'); end if;
    ship := 0;
  else
    if p_ship_address is null then return jsonb_build_object('ok', false, 'code', 'bad_address'); end if;
    ship := s.shipping_flat_cents;
  end if;
  tax := round((subtotal + ship) * s.tax_rate)::int;

  insert into customers (email, name, phone) values (lower(trim(p_email)), trim(p_name), nullif(trim(p_phone), ''))
  on conflict (lower(email)) do update set name = excluded.name, phone = coalesce(excluded.phone, customers.phone)
  returning id into cust;

  update orders set status = 'cancelled', failure_reason = 'superseded'
  where session_id = p_session and status = 'pending';

  insert into orders (customer_id, session_id, fulfillment, store_id, ship_address, subtotal_cents, shipping_cents, tax_cents,
                      total_cents, payment_provider, idempotency_key)
  values (cust, p_session, p_fulfillment, store, p_ship_address, subtotal, ship, tax, subtotal + ship + tax, p_provider, p_idempotency_key)
  returning id into oid;

  insert into order_items (order_id, piece_id, title, price_cents, seller_id, store_id)
  select oid, p.id, p.title, p.price_cents, p.seller_id, p.store_id
  from holds h join pieces p on p.id = h.piece_id
  where h.session_id = p_session and h.expires_at > now() and p.status = 'held';

  select * into o from orders where id = oid;
  return jsonb_build_object('ok', true, 'order_id', o.id, 'number', o.number, 'public_token', o.public_token,
    'total_cents', o.total_cents, 'subtotal_cents', o.subtotal_cents, 'shipping_cents', o.shipping_cents, 'tax_cents', o.tax_cents);
end $$;

-- THE one-of-one transaction. Called by the Stripe webhook or by the mock pay action, never by a browser.
-- Either every piece in the order is sold to this order, or none are and the order goes to refund_pending.
create function public.finalize_order(p_order uuid, p_payment_ref text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare o orders%rowtype; it record; pc pieces%rowtype; lost boolean := false;
begin
  select * into o from orders where id = p_order for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;

  if o.status in ('paid', 'bagged', 'ready', 'picked_up', 'packed', 'shipped') then
    return jsonb_build_object('ok', true, 'code', 'already', 'status', o.status);          -- idempotent
  end if;
  if o.status in ('refund_pending', 'refunded') then
    return jsonb_build_object('ok', false, 'code', 'lost', 'status', o.status);
  end if;
  if o.status <> 'pending' then
    -- cancelled/superseded order that still got paid: caller must refund
    update orders set status = 'refund_pending', payment_ref = p_payment_ref, failure_reason = 'order_not_pending' where id = p_order;
    return jsonb_build_object('ok', false, 'code', 'lost', 'status', 'refund_pending');
  end if;

  -- lock pieces in a stable order (no deadlocks between two shoppers)
  for it in select piece_id from order_items where order_id = p_order order by piece_id loop
    select * into pc from pieces where id = it.piece_id for update;
    if pc.status = 'live' then
      null;                                                            -- hold expired and nobody took it: fine
    elsif pc.status = 'held' and exists (select 1 from holds h where h.piece_id = pc.id and h.session_id = o.session_id) then
      null;                                                            -- still ours
    else
      lost := true;                                                    -- sold, archived, or held by someone else
    end if;
  end loop;

  if lost then
    update orders set status = 'refund_pending', payment_ref = p_payment_ref, failure_reason = 'piece_unavailable' where id = p_order;
    return jsonb_build_object('ok', false, 'code', 'lost', 'status', 'refund_pending');
  end if;

  perform set_config('app.reason', 'sold online ' || o.number, true);
  perform set_config('app.actor', 'shopper', true);
  for it in select piece_id from order_items where order_id = p_order loop
    delete from holds where piece_id = it.piece_id;
    update pieces set status = 'sold', sold_at = now(), sold_via = 'online', sold_order_id = p_order, held_until = null
    where id = it.piece_id and status in ('live', 'held');
    update order_items set committed = true where order_id = p_order and piece_id = it.piece_id;
  end loop;

  update orders set status = 'paid', paid_at = now(), payment_ref = p_payment_ref where id = p_order;
  return jsonb_build_object('ok', true, 'code', 'paid', 'status', 'paid');
end $$;

create function public.mark_order_refunded(p_order uuid, p_refund_ref text)
returns void language sql security definer set search_path = public, pg_temp as $$
  update orders set status = 'refunded', failure_reason = coalesce(failure_reason, '') || ' refund:' || coalesce(p_refund_ref, '')
  where id = p_order and status in ('refund_pending', 'pending')
$$;

-- Order status page: minimal public view of ONE order, found by its secret token.
create function public.get_order_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'number', o.number, 'status', o.status, 'fulfillment', o.fulfillment,
    'store', case when s.id is null then null else jsonb_build_object('slug', s.slug, 'name', s.name, 'address', s.address) end,
    'tracking_carrier', o.tracking_carrier, 'tracking_number', o.tracking_number,
    'subtotal_cents', o.subtotal_cents, 'shipping_cents', o.shipping_cents, 'tax_cents', o.tax_cents, 'total_cents', o.total_cents,
    'first_name', split_part(c.name, ' ', 1),
    'email_hint', regexp_replace(c.email, '^(.).*(@.*)$', '\1***\2'),
    'created_at', o.created_at, 'paid_at', o.paid_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('title', i.title, 'price_cents', i.price_cents, 'slug', p.slug,
                'cover_path', ph.path, 'cover_source', ph.source, 'cover_blur', ph.blur_data_url) order by i.title), '[]'::jsonb)
              from order_items i join pieces p on p.id = i.piece_id
              left join lateral (select path, source, blur_data_url from piece_photos where piece_id = p.id order by position limit 1) ph on true
              where i.order_id = o.id))
  from orders o join customers c on c.id = o.customer_id left join stores s on s.id = o.store_id
  where o.public_token = p_token
$$;

-- ---------- drop alerts (CASL) ----------
create function public.subscribe_alerts(
  p_email text, p_phone text, p_consent_text text, p_ip_hash text, p_user_agent text, p_source text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare sub subscribers%rowtype;
begin
  if p_email is null and p_phone is null then return jsonb_build_object('ok', false, 'code', 'no_contact'); end if;
  if p_email is not null then
    select * into sub from subscribers where lower(email) = lower(p_email);
  else
    select * into sub from subscribers where phone = p_phone;
  end if;
  if found then
    update subscribers set unsubscribed_at = null, consent_at = now(), consent_text = p_consent_text,
      consent_ip_hash = p_ip_hash, consent_user_agent = p_user_agent, source = p_source,
      phone = coalesce(p_phone, phone), email = coalesce(lower(p_email), email)
    where id = sub.id returning * into sub;
  else
    insert into subscribers (email, phone, consent_text, consent_ip_hash, consent_user_agent, source)
    values (lower(p_email), p_phone, p_consent_text, p_ip_hash, p_user_agent, p_source) returning * into sub;
  end if;
  return jsonb_build_object('ok', true, 'unsubscribe_token', sub.unsubscribe_token, 'email', sub.email, 'phone', sub.phone);
end $$;

create function public.unsubscribe_by_token(p_token text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  update subscribers set unsubscribed_at = coalesce(unsubscribed_at, now()) where unsubscribe_token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
