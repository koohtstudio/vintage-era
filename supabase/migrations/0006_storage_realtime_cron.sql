-- Public bucket for processed piece photos. Writes happen server-side (service_role) after authz + sharp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('piece-photos', 'piece-photos', true, 5242880, array['image/webp', 'image/avif', 'image/jpeg'])
on conflict (id) do nothing;

-- Realtime: public piece status (RLS-filtered), staff-side orders, drop state.
alter publication supabase_realtime add table public.pieces, public.orders, public.drops;

-- Scheduled jobs. pg_cron runs inside Postgres, so holds expire and drops open even if no web server is awake.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('era-expire-holds',   '30 seconds', $$select public.expire_holds()$$);
select cron.schedule('era-release-drops',  '30 seconds', $$select public.release_due_drops()$$);
select cron.schedule('era-prune-rate',     '17 * * * *', $$select public.prune_rate_limits()$$);
