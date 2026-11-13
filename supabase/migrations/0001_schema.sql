-- Era Vintage: schema. Money is integer cents (CAD). All times timestamptz.
-- Security model lives in 0005_rls.sql: every table has RLS on, anon/authenticated start with NO grants.

-- ---------- enums ----------
create type piece_status    as enum ('draft', 'live', 'held', 'sold', 'archived');
create type condition_grade as enum ('like_new', 'great', 'light_wear', 'worn_in');
create type sold_via        as enum ('online', 'in_store');
create type photo_kind      as enum ('front', 'back', 'tag', 'flaw', 'detail');
create type photo_source    as enum ('public', 'storage');
create type fulfillment     as enum ('pickup', 'ship');
create type order_status    as enum ('pending', 'paid', 'bagged', 'ready', 'picked_up', 'packed', 'shipped', 'cancelled', 'refunded', 'refund_pending');
create type drop_status     as enum ('scheduled', 'live', 'cancelled');
create type user_role       as enum ('owner', 'staff');
create type notif_channel   as enum ('email', 'sms');
create type notif_status    as enum ('outbox', 'sent', 'failed');
create type measurement_kind as enum ('tops', 'bottoms', 'collectible', 'game');

-- ---------- generic updated_at ----------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- reference ----------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('barrie', 'newmarket', 'toronto')),
  name text not null,
  address text not null default '',
  location_note text not null default '',
  hours jsonb not null default '{}'::jsonb check (jsonb_typeof(hours) = 'object'),
  hours_confirmed boolean not null default false,
  instagram text not null default '',
  maps_query text not null default '',
  photo_path text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  instagram text not null default '',
  active boolean not null default true,
  is_placeholder boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  measurement_kind measurement_kind not null default 'tops',
  sort int not null default 0
);

create table public.settings (
  id boolean primary key default true check (id),            -- single row
  hold_minutes int not null default 15 check (hold_minutes between 1 and 120),
  max_holds_per_session int not null default 5 check (max_holds_per_session between 1 and 50),
  shipping_flat_cents int not null default 1500 check (shipping_flat_cents >= 0),
  shipping_is_placeholder boolean not null default true,
  tax_rate numeric(5, 4) not null default 0.13 check (tax_rate between 0 and 0.5),
  sold_visible_days int not null default 3 check (sold_visible_days between 0 and 30),
  allow_placeholder_prices boolean not null default false,
  ticker_messages text[] not null default '{}',
  google_rating numeric(2, 1),
  google_review_count int,
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null default '',
  quote text not null check (length(quote) between 3 and 500),
  source text not null default 'Google',
  confirmed boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- access ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  store_id uuid references public.stores (id),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  constraint staff_needs_store check (role = 'owner' or store_id is not null)
);

-- ---------- inventory ----------
create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 2 and 140),
  description text not null default '',
  category_id uuid not null references public.categories (id),
  store_id uuid not null references public.stores (id),
  seller_id uuid references public.sellers (id),
  size text not null default 'One size',
  era text not null default 'Unknown' check (era in ('70s', '80s', '90s', 'Y2K', '00s', '10s', 'Mixed', 'Unknown')),
  condition condition_grade not null default 'great',
  condition_notes text not null default '',
  authenticity_notes text not null default '',
  measurements jsonb not null default '{}'::jsonb check (jsonb_typeof(measurements) = 'object'),
  price_cents int not null check (price_cents between 0 and 1000000),
  price_is_placeholder boolean not null default false,
  status piece_status not null default 'draft',
  held_until timestamptz,
  live_at timestamptz,
  just_dropped_until timestamptz,
  sold_at timestamptz,
  sold_via sold_via,
  sold_order_id uuid,                                         -- FK added after orders
  featured_rank int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint held_has_until check ((status = 'held') = (held_until is not null)),
  constraint sold_has_sold_at check ((status = 'sold') = (sold_at is not null)),
  constraint sold_has_via check ((status = 'sold') = (sold_via is not null))
);
create index pieces_status_live_idx on public.pieces (status, live_at desc);
create index pieces_category_idx on public.pieces (category_id);
create index pieces_store_idx on public.pieces (store_id);
create index pieces_seller_idx on public.pieces (seller_id);
create index pieces_sold_at_idx on public.pieces (sold_at) where status = 'sold';

create table public.piece_photos (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references public.pieces (id) on delete cascade,
  kind photo_kind not null default 'front',
  path text not null,
  source photo_source not null default 'storage',
  width int,
  height int,
  blur_data_url text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index piece_photos_piece_idx on public.piece_photos (piece_id, position);

create table public.piece_events (
  id bigint generated always as identity primary key,
  piece_id uuid not null references public.pieces (id) on delete cascade,
  from_status piece_status,
  to_status piece_status not null,
  actor_id uuid,
  actor_label text not null default 'system',
  reason text,
  at timestamptz not null default now()
);
create index piece_events_piece_idx on public.piece_events (piece_id, at desc);

-- ---------- holds (never public) ----------
create table public.holds (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null unique references public.pieces (id) on delete cascade,   -- one active hold per piece
  session_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  extended boolean not null default false
);
create index holds_session_idx on public.holds (session_id);
create index holds_expiry_idx on public.holds (expires_at);

-- ---------- commerce (never public) ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
create unique index customers_email_uniq on public.customers (lower(email));

create sequence public.order_number_seq start 2381;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('EV-' || nextval('public.order_number_seq')),
  -- 244 random bits. The URL also carries an HMAC (see lib/security/tokens.ts)
  public_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  customer_id uuid not null references public.customers (id),
  session_id uuid not null,
  status order_status not null default 'pending',
  fulfillment fulfillment not null,
  store_id uuid references public.stores (id),
  ship_address jsonb,
  tracking_carrier text,
  tracking_number text,
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  payment_provider text not null default 'mock' check (payment_provider in ('mock', 'stripe')),
  payment_ref text,
  idempotency_key text not null unique,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_has_store check (fulfillment <> 'pickup' or store_id is not null),
  constraint ship_has_address check (fulfillment <> 'ship' or ship_address is not null)
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_session_idx on public.orders (session_id);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  piece_id uuid not null references public.pieces (id),
  title text not null,
  price_cents int not null check (price_cents >= 0),
  seller_id uuid references public.sellers (id),
  store_id uuid not null references public.stores (id),
  committed boolean not null default false,                 -- true once this order actually sold the piece
  unique (order_id, piece_id)
);
-- Second wall behind the pieces trigger: a piece can be committed by at most one order, ever.
create unique index order_items_one_commit on public.order_items (piece_id) where committed;
create index order_items_order_idx on public.order_items (order_id);

alter table public.pieces
  add constraint pieces_sold_order_fk foreign key (sold_order_id) references public.orders (id);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)                               -- webhook idempotency
);

-- ---------- marketing ----------
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  starts_at timestamptz not null,
  status drop_status not null default 'scheduled',
  released_at timestamptz,
  alert_on_release boolean not null default false,
  alert_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index drops_due_idx on public.drops (starts_at) where status = 'scheduled';

create table public.drop_pieces (
  drop_id uuid not null references public.drops (id) on delete cascade,
  piece_id uuid not null unique references public.pieces (id) on delete cascade,
  primary key (drop_id, piece_id)
);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  consent_at timestamptz not null default now(),
  consent_text text not null,
  consent_ip_hash text,
  consent_user_agent text,
  source text not null default 'site',
  unsubscribe_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contact_present check (email is not null or phone is not null)
);
create unique index subscribers_email_uniq on public.subscribers (lower(email)) where email is not null;
create unique index subscribers_phone_uniq on public.subscribers (phone) where phone is not null;

create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  channel notif_channel not null default 'email',
  template text not null,
  to_address text not null,
  subject text not null default '',
  body_html text not null default '',
  status notif_status not null default 'outbox',
  provider_id text,
  order_id uuid references public.orders (id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);
create index notifications_created_idx on public.notifications_log (created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- updated_at triggers
create trigger stores_updated before update on public.stores for each row execute function public.set_updated_at();
create trigger sellers_updated before update on public.sellers for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.settings for each row execute function public.set_updated_at();
create trigger pieces_updated before update on public.pieces for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

insert into public.settings (id) values (true);
