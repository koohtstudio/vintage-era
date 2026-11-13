-- Admin-side rules: staff status door, placeholder prices, order workflow, drops, rate limiting, CASL.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- ---- rate limit ----
select is((public.check_rate_limit('t:k', 2, 60))->>'ok', 'true',  'rate limit: 1st ok');
select is((public.check_rate_limit('t:k', 2, 60))->>'ok', 'true',  'rate limit: 2nd ok');
select is((public.check_rate_limit('t:k', 2, 60))->>'ok', 'false', 'rate limit: 3rd refused');

-- ---- drops open together ----
update public.drops set starts_at = now() - interval '1 minute' where name = 'Friday Night Drop';
select is((public.release_due_drops())->>'released', '5', 'drop opens: all 5 pieces flip live in one go');
select is((select count(*)::int from public.pieces p join public.drop_pieces dp on dp.piece_id = p.id where p.status = 'live' and p.just_dropped_until > now()), 5, 'dropped pieces carry a just-dropped badge window');
select is((public.release_due_drops())->>'released', '0', 'releasing twice does nothing');
select is((select status::text from public.drops where name = 'Friday Night Drop'), 'live', 'drop is marked live');
select is((select count(*)::int from public.drops_needing_alert()), 1, 'drop alert is queued');

-- ---- placeholder price guard ----
update public.settings set allow_placeholder_prices = false;
select throws_ok($$update public.pieces set status = 'live' where slug = 'vintage-looney-tunes-tee'$$, 'P0001', null, 'cannot publish a placeholder price once real prices are required');
update public.pieces set price_is_placeholder = false where slug = 'vintage-looney-tunes-tee';
select lives_ok($$update public.pieces set status = 'live' where slug = 'vintage-looney-tunes-tee'$$, 'real price can go live');

-- ---- staff status door ----
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000b1"}', true);
set local role authenticated;
select throws_ok($$select public.set_piece_status((select id from public.pieces where slug = 'ny-giants-satin-jacket'), 'live')$$, 'P0001', null, 'staff cannot force a held piece live');
select throws_ok($$select public.set_piece_status((select id from public.pieces where slug = 'raptors-jersey-purple-dino'), 'archived')$$, '42501', null, 'staff cannot archive another store''s piece');
select is((public.advance_order((select id from public.orders where number = 'EV-2380'), 'bag'))->>'status', 'bagged', 'pickup: paid -> bagged');
select is((public.advance_order((select id from public.orders where number = 'EV-2380'), 'pack'))->>'code', 'bad_transition', 'pickup order cannot be "packed"');
select is((public.advance_order((select id from public.orders where number = 'EV-2380'), 'ready'))->>'status', 'ready', 'pickup: bagged -> ready');
reset role;

-- ---- CASL: consent is stored, unsubscribe works, re-subscribing re-consents ----
select is((public.subscribe_alerts('Fan@Example.test', null, 'Yes, email me when new pieces drop.', 'iphash', 'ua', 'home'))->>'ok', 'true', 'subscribe stores consent');
select is((select consent_text from public.subscribers where email = 'fan@example.test'), 'Yes, email me when new pieces drop.', 'exact consent wording is stored');
select ok(public.unsubscribe_by_token((select unsubscribe_token from public.subscribers where email = 'fan@example.test')), 'unsubscribe by token');

select * from finish();
rollback;
