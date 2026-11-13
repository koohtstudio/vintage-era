-- RLS proof. Runs inside a transaction that is rolled back.
-- Roles are switched exactly the way PostgREST does it, so these are the same rules the browser hits.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- ============ ANONYMOUS VISITOR ============
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select * from public.orders$$,            '42501', null, 'anon cannot read orders');
select throws_ok($$select * from public.order_items$$,       '42501', null, 'anon cannot read order_items');
select throws_ok($$select * from public.customers$$,         '42501', null, 'anon cannot read customers');
select throws_ok($$select * from public.holds$$,             '42501', null, 'anon cannot read holds (nobody else''s, not even their own)');
select throws_ok($$select * from public.subscribers$$,       '42501', null, 'anon cannot read subscribers');
select throws_ok($$select * from public.payment_events$$,    '42501', null, 'anon cannot read payment_events');
select throws_ok($$select * from public.notifications_log$$, '42501', null, 'anon cannot read the email outbox');
select throws_ok($$select * from public.profiles$$,          '42501', null, 'anon cannot read profiles');
select throws_ok($$select * from public.rate_limits$$,       '42501', null, 'anon cannot read rate_limits');
select throws_ok($$select * from public.drop_pieces$$,       '42501', null, 'anon cannot see which pieces are in an unreleased drop');

select is((select count(*)::int from public.pieces where status in ('draft', 'archived')), 0, 'anon cannot see draft or archived pieces');
select is((select count(*)::int from public.pieces where slug = 'sega-genesis-console'), 0, 'sold more than 3 days ago: hidden from anon');
select is((select count(*)::int from public.pieces where slug = 'pokemon-card-binder' and status = 'sold'), 1, 'sold recently: still visible as Sold');
select ok((select count(*)::int from public.pieces where status = 'live') > 0, 'anon can see live pieces');
select ok((select count(*)::int from public.pieces where status = 'held') > 0, 'anon can see held pieces (shown as In a bag)');
select is((select count(*)::int from public.piece_photos ph join public.pieces p on p.id = ph.piece_id where p.status in ('draft', 'archived')), 0, 'anon cannot see photos of hidden pieces');
select is((select count(*)::int from public.drops where status = 'cancelled'), 0, 'anon only sees scheduled/live drops');

select throws_ok($$update public.pieces set price_cents = 1$$,                '42501', null, 'anon cannot change a price');
select throws_ok($$update public.pieces set status = 'sold'$$,                '42501', null, 'anon cannot change a status');
select throws_ok($$insert into public.holds (piece_id, session_id, expires_at) select id, gen_random_uuid(), now() + interval '1 hour' from public.pieces limit 1$$, '42501', null, 'anon cannot insert a hold directly');
select throws_ok($$insert into public.subscribers (email, consent_text) values ('x@example.test', 'x')$$, '42501', null, 'anon cannot insert subscribers directly');
select throws_ok($$delete from public.pieces$$, '42501', null, 'anon cannot delete pieces');
select throws_ok($$select public.create_hold(id, gen_random_uuid()) from public.pieces limit 1$$, '42501', null, 'anon cannot call create_hold with a forged session');
select throws_ok($$select public.finalize_order(gen_random_uuid(), 'x')$$, '42501', null, 'anon cannot call finalize_order');
select throws_ok($$select public.get_my_bag(gen_random_uuid())$$, '42501', null, 'anon cannot call get_my_bag');
select throws_ok($$select public.mark_sold_in_store(id) from public.pieces limit 1$$, '42501', null, 'anon cannot mark a piece sold');

-- ============ BARRIE STAFF ============
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000b1"}', true);
set local role authenticated;

select is((select count(*)::int from public.orders), 1, 'barrie staff sees only barrie orders (EV-2380)');
select is((select count(*)::int from public.subscribers), 0, 'staff cannot see subscribers');
select throws_ok($$update public.pieces set status = 'sold' where slug = 'northstars-varsity-jacket'$$, '42501', null, 'staff cannot write pieces.status directly (column privilege)');
select throws_ok($$update public.pieces set held_until = now() where slug = 'northstars-varsity-jacket'$$, '42501', null, 'staff cannot write held_until directly');
select lives_ok($$update public.pieces set title = 'Toronto piece hijack' where slug = 'raptors-jersey-purple-dino'$$, 'barrie staff update of a Toronto piece runs but matches 0 rows');
reset role;
select is((select title from public.pieces where slug = 'raptors-jersey-purple-dino'), 'Raptors Jersey, Purple Dino', 'barrie staff cannot edit a Toronto piece (RLS)');
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000b1"}', true);
set local role authenticated;
select throws_ok($$select public.mark_sold_in_store(id) from public.pieces where slug = 'raptors-jersey-purple-dino'$$, '42501', null, 'barrie staff cannot mark a Toronto piece sold');
select throws_ok($$select public.create_hold(id, gen_random_uuid()) from public.pieces limit 1$$, '42501', null, 'staff cannot call shopper-only create_hold');

-- ============ OWNER ============
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000a1"}', true);
set local role authenticated;
select is((select count(*)::int from public.orders), 3, 'owner sees all orders');
select is((select count(*)::int from public.subscribers), 2, 'owner sees subscribers');

select * from finish();
rollback;
