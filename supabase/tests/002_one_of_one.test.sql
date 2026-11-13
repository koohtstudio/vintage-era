-- The one-of-one rule, proven at the database level (so the UI can be bypassed and it still holds).
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

create temp table ctx as select
  gen_random_uuid() as a, gen_random_uuid() as b,
  (select id from public.pieces where slug = 'black-ferrari-graphic-tee') as live_piece,
  (select id from public.pieces where slug = 'green-bomber-and-bag-set') as sold_piece,
  (select id from public.pieces where slug = 'vintage-looney-tunes-tee') as draft_piece;
grant select on ctx to public;

-- ---- holds ----
select is((select (public.create_hold(live_piece, a))->>'code' from ctx), 'held', 'shopper A can hold a live piece');
select is((select status::text from public.pieces where id = (select live_piece from ctx)), 'held', 'piece flips to held');
select ok((select held_until from public.pieces where id = (select live_piece from ctx)) > now() + interval '14 minutes', 'held for 15 minutes');
select is((select (public.create_hold(live_piece, b))->>'code' from ctx), 'held', 'shopper B is refused (code held)');
select is((select ((public.create_hold(live_piece, b))->>'ok')::boolean from ctx), false, 'shopper B ok=false');
select is((select (public.create_hold(live_piece, a))->>'code' from ctx), 'already', 'A re-adding is idempotent');
select is((select (public.create_hold(sold_piece, b))->>'code' from ctx), 'sold', 'a sold piece cannot be held');
select is((select (public.create_hold(draft_piece, b))->>'code' from ctx), 'unavailable', 'a draft piece cannot be held');
select throws_ok($$insert into public.holds (piece_id, session_id, expires_at) select live_piece, gen_random_uuid(), now() + interval '1 hour' from ctx$$, '23505', null, 'UNIQUE(piece_id): the DB itself rejects a second hold');

-- ---- state machine (raw SQL, as if the UI were bypassed) ----
select throws_ok($$update public.pieces set status = 'live', held_until = null where id = (select sold_piece from ctx)$$, 'P0001', null, 'sold -> live is illegal');
select throws_ok($$update public.pieces set status = 'held', held_until = now() + interval '1 hour' where id = (select draft_piece from ctx)$$, 'P0001', null, 'draft -> held is illegal');
select throws_ok($$update public.pieces set price_cents = 1 where id = (select sold_piece from ctx)$$, 'P0001', null, 'a sold piece''s price is frozen');
select throws_ok($$update public.pieces set price_cents = 1 where id = (select live_piece from ctx)$$, 'P0001', null, 'price cannot change while someone holds the piece');

-- ---- expiry: lazy + cron ----
update public.holds set expires_at = now() - interval '1 minute' where piece_id = (select live_piece from ctx);
select is((select (public.create_hold(live_piece, b))->>'code' from ctx), 'held', 'lazy expiry: B can take a piece whose hold lapsed but was not swept yet');
update public.holds set expires_at = now() - interval '1 minute' where piece_id = (select live_piece from ctx);
select ok(public.expire_holds() >= 1, 'expire_holds() sweeps lapsed holds');
select is((select status::text from public.pieces where id = (select live_piece from ctx)), 'live', 'expired piece is back on the site');
select is((select count(*)::int from public.holds where piece_id = (select live_piece from ctx)), 0, 'hold row removed');

-- ---- per-shopper cap ----
select public.create_hold(id, (select a from ctx)) from public.pieces where status = 'live' and id <> (select live_piece from ctx) order by slug limit 5;
select is((select (public.create_hold(live_piece, a))->>'code' from ctx), 'cap', 'sixth hold is refused (cap = 5)');
select public.release_hold(piece_id, (select a from ctx)) from public.holds where session_id = (select a from ctx);

-- ---- double pay: two orders, same piece, only ONE can win ----
select public.create_hold(live_piece, a) from ctx;
create temp table oa as select (public.create_pending_order((select a from ctx), 'pickup', 'barrie', 'A Shopper', 'a@example.test', null, null, 'key-a', 'mock')) as r;
select is((select r->>'ok' from oa), 'true', 'order A created from the shopper''s own hold');
select ok((select (r->>'total_cents')::int from oa) > (select price_cents from public.pieces where id = (select live_piece from ctx)), 'total = price + tax, computed in SQL');
-- A walks away; hold lapses; B takes the piece and also gets an order
update public.holds set expires_at = now() - interval '1 minute' where piece_id = (select live_piece from ctx);
select public.create_hold(live_piece, b) from ctx;
create temp table ob as select (public.create_pending_order((select b from ctx), 'pickup', 'barrie', 'B Shopper', 'b@example.test', null, null, 'key-b', 'mock')) as r;
-- Both "pay". B's payment lands first.
select is((select (public.finalize_order(((select r from ob)->>'order_id')::uuid, 'pay_b'))->>'code'), 'paid', 'B pays: order succeeds');
select is((select status::text from public.pieces where id = (select live_piece from ctx)), 'sold', 'piece is sold');
select is((select (public.finalize_order(((select r from oa)->>'order_id')::uuid, 'pay_a'))->>'code'), 'lost', 'A pays too: the order is rejected as lost');
select is((select status::text from public.orders where id = ((select r from oa)->>'order_id')::uuid), 'refund_pending', 'A''s order is queued for refund, never fulfilled');
select is((select count(*)::int from public.order_items where piece_id = (select live_piece from ctx) and committed), 1, 'exactly one committed order item for the piece');
select throws_ok($$update public.order_items set committed = true where order_id = ((select r from oa)->>'order_id')::uuid$$, '23505', null, 'second wall: DB unique index refuses a 2nd committed order for the same piece');
select is((select (public.finalize_order(((select r from ob)->>'order_id')::uuid, 'pay_b'))->>'code'), 'already', 'webhook retry is idempotent');

-- ---- sold in store, by Barrie staff ----
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000b1"}', true);
set local role authenticated;
select is((select (public.mark_sold_in_store((select id from public.pieces where slug = 'northstars-varsity-jacket')))->>'ok'), 'true', 'staff can mark their own piece sold in store');
reset role;

select * from finish();
rollback;
