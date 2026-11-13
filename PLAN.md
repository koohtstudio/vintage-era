# Era Vintage: build plan

Status: **draft, waiting for "go"**. Nothing has been scaffolded yet.

## 0. What I found

**Repo.** `github.com/guraaseessethi/vintage-era` has no commits (empty). This folder is not a git repo yet and holds only assets:

| Path | What it is | Plan |
|---|---|---|
| `brand/era-vintage-logo.png` | Logo, 451×220 px, checkered flag + lime "ERA" + pink "VINTAGE" | Copy to `public/brand/`. It's small; fine for nav (50px tall at 2x), ask for a vector later. |
| `photos/for-website/` | 18 curated store and rack photos (jerseys wall, varsity, Ferrari tee, retro games, toy wall, store interiors) | Copy to `public/photos/`. These are the seed pieces' photos. |
| `photos/from-instagram/` | 49 Instagram frames, 11 MB, mostly reels covers | Stay out of the repo (`.gitignore`). Mine for the team photo only. |
| `_work/` | Contact sheet and a zip | Ignored. |

**Concept canvas** (3 artboards: desktop shop, phone shop, admin). I'm matching it exactly:
- Ticker (lime, mono caps, pink ✦ separators) → sticky nav with Bag count → black hero with skewed 150px "Find your era." (lime / white / pink), 3 tilted polaroids, "1 OF 1" and "NEW IN" round stickers, racing-stripe wipes → animated checker strip → pill category marquee → "Fresh finds" with Type and Size chips → 4-col cards (era tag, 1/1 sticker, hover measurements slide-up, "Sold" stamp) → black "Three stores" → "Four sellers, one roof" (Emotional Baggage Vintage `@emotionalbaggagevintage`, Virtue Vintage `@virtuevintage_`, Take Two Trading Co. `@taketwotradingcompany`, `[Fourth seller]`) → "The word" reviews → pink "Never miss a drop." signup → footer. Phone: pill tab bar (Home, Shop, Bag n, Stores), bag becomes a bottom sheet.
- Bag drawer → checkout (4 options: pickup Barrie / Newmarket / Toronto, or ship `[rate]`; name + email) → "GO!" confirmation.
- Admin: black sidebar, stat tiles, Pieces list with Live/Drafts/Sold chips and inline actions, "Add a piece" form (photo drop, title, type, size, price, pit to pit, length, condition chips), Online orders with stepwise buttons (Bagged it → Tell them it's ready → Picked up; Packed → Add tracking → Shipped).
- Barrie hours in the canvas: Mon–Fri 9:30–9, Sat 9:30–6, Sun 11–5. I'll seed those and mark them "confirm".

**Machine.** Node 22, pnpm 10, Supabase CLI 2.72, psql 14. **Docker is not installed.** The Supabase CLI's local stack needs it (see Open questions, #1).

## 1. Decisions I'm making (veto any)

1. **Next 15 / React 19**, App Router, TS strict (`noUncheckedIndexedAccess` on), Tailwind v4 with tokens in `@theme` CSS variables, Radix only for Dialog (bag drawer and sheet), Select, Toast and Tabs.
2. **Shop is static ISR, filters are client-side.** Reading `searchParams` in a server component makes a page dynamic, which would kill the Lighthouse target. So `/shop` renders the whole live catalog (light card payload, a few hundred pieces max) at build and revalidates every 60 s plus on-demand via `revalidateTag('pieces')`. A small client island filters in memory and keeps type, size, era, store and sort in the URL with `history`, so links are shareable and Back works. If the catalog ever grows past ~500, move to paginated cached routes.
3. **Public status comes from `pieces`, not `holds`.** Anon can never read `holds`. `create_hold` also writes `pieces.status='held'` and `pieces.held_until` in the same transaction, so "In a bag" and the Realtime event ride on a publicly readable row. Clients treat `held` with a past `held_until` as `live` immediately (lazy expiry); pg_cron sweeps every 30 s and fires the real update.
4. **Shopper session** = signed httpOnly cookie (`ev_sid` = `uuid.HMAC`), minted on first add-to-bag (server actions can set cookies; static pages can't read them). The shopper's own bag is read through a server route using that cookie and a `SECURITY DEFINER` function that takes the session id. No JWT minting, no public `holds` policy at all, and that's what the RLS tests will prove.
5. **Rate limiting in Postgres** (`check_rate_limit` function and a `rate_limits` table). No Upstash/Redis, keeps the stack as specified, works identically in mock and live.
6. **Stripe Checkout (hosted)**, not embedded Elements: smallest PCI and CSP surface. Hosted sessions can't expire under 30 min, so when checkout starts the server extends that shopper's holds to 30 min (once, capped) and sets the session to expire then. The double-pay path (refund and apology email) stays as the safety net.
7. **CSP.** Static shop pages get a header CSP with `script-src 'self' 'unsafe-inline'` plus Stripe and Turnstile origins (Next's inline bootstrap needs it, and a nonce would force dynamic rendering). `/admin`, `/checkout`, `/order` are dynamic and get a strict per-request nonce CSP from middleware. Both set `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, HSTS, Referrer-Policy, Permissions-Policy. I'll revisit hash-based CSP later.
8. **Money** in integer cents, CAD, Toronto time zone for everything user-facing.
9. **Mock vs live is one env var** (`NEXT_PUBLIC_APP_MODE`) read in exactly one place (`lib/mode.ts`), and each adapter picks its implementation there. Live mode refuses to boot if a required secret is missing; mock mode refuses to boot with live Stripe keys.
10. **Commits** are small and in the build order below. I won't push to GitHub until you tell me to.

## 2. Open questions (defaults apply if you just say "go")

1. **Docker.** Local Supabase needs Docker (Docker Desktop, OrbStack or Colima). Default: you install one; until then I'll write everything and I can't run the DB tests. Alternative: point mock mode at a free hosted Supabase "dev" project instead (same code, `.env.local` URL changes).
2. **`[price]` vs numbers.** Checkout can't total `[price]`. Default: every seeded piece gets a dummy `price_cents` with `price_is_placeholder = true`. The UI renders those as `[price]` (and totals as `[price total]`), mock pay charges the dummy numbers, and a DB trigger blocks a piece from going `live` with a placeholder price unless `settings.allow_placeholder_prices` is true (true in the seed, false once you go live). Same idea for the shipping `[rate]`.
3. **Reviews.** You said don't invent any. The canvas has 3 quotes and "4.5 stars · 47 Google reviews". Default: seed the `reviews` table with those three flagged `confirmed=false` (shown with a "sample" mark in mock only) and leave the 4.5/47 as a setting, listed in `TODO-LIVE.md`. Say if you'd rather start empty.
2b. **Tax.** Ontario HST is 13%. Default: prices shown pre-tax, a tax line computed server-side at checkout from `settings.tax_rate` (0.13), editable in admin. Say if prices should be tax-inclusive.
3. **Cross-store pickup.** The canvas lets you pick any of the three stores. Default: allowed, and the admin order card shows "Transfer from Newmarket" per item when the piece isn't at the pickup store.
4. **Addresses.** Seeding Toronto as "The Well, 486 Front St W" (from an Instagram caption) and Newmarket as "Upper Canada Mall, 17600 Yonge St". Both flagged "confirm".

## 3. File structure

```
.
├─ PLAN.md  README.md  TODO-LIVE.md  .env.example  .gitignore
├─ package.json  pnpm-lock.yaml  tsconfig.json  next.config.ts  postcss.config.mjs
├─ eslint.config.mjs  vitest.config.ts  playwright.config.ts  lighthouserc.json
├─ middleware.ts                      # admin guard, session refresh (admin/auth only), CSP nonce for dynamic routes
├─ public/
│  ├─ brand/era-vintage-logo.png
│  └─ photos/…                        # seed photos (served locally in mock)
├─ app/
│  ├─ layout.tsx  globals.css         # fonts (next/font), @theme tokens, reduced-motion rules
│  ├─ (shop)/
│  │  ├─ layout.tsx                   # ticker, nav, footer, tab bar, <LiveStatusProvider>, <BagProvider>
│  │  ├─ page.tsx                     # Home (static ISR)
│  │  ├─ shop/page.tsx                # Shop (static ISR + client filter island)
│  │  ├─ piece/[slug]/page.tsx        # Piece (ISR per piece, generateStaticParams)
│  │  ├─ stores/page.tsx
│  │  ├─ alerts/page.tsx              # drop alert signup (also embedded on Home)
│  │  ├─ unsubscribe/[token]/page.tsx
│  │  ├─ checkout/page.tsx            # dynamic
│  │  ├─ order/[token]/page.tsx       # dynamic, live status
│  │  ├─ mock/pay/page.tsx            # fake pay step (404 in live)
│  │  └─ privacy/ terms/              # stubs (CASL needs a privacy link)
│  ├─ admin/
│  │  ├─ login/page.tsx               # magic link (live) + "Demo login" (mock only)
│  │  └─ (console)/
│  │     ├─ layout.tsx                # sidebar, store switcher, realtime order badge + sound
│  │     ├─ page.tsx                  # dashboard tiles
│  │     ├─ pieces/page.tsx  pieces/new/page.tsx  pieces/[id]/page.tsx
│  │     ├─ orders/page.tsx  orders/[id]/page.tsx
│  │     ├─ drops/page.tsx  drops/[id]/page.tsx
│  │     ├─ homepage/page.tsx  subscribers/page.tsx  sellers/page.tsx
│  │     ├─ settings/page.tsx
│  │     └─ outbox/page.tsx           # mock only
│  ├─ auth/callback/route.ts
│  └─ api/
│     ├─ bag/route.ts                 # GET own holds (cookie), no-store
│     ├─ stripe/webhook/route.ts      # raw body, signature verified
│     ├─ cron/tick/route.ts           # optional Vercel Cron fallback for sweeps and drops
│     └─ subscribers/export/route.ts  # CSV, owner only
├─ components/
│  ├─ ui/            # Button, Chip, Sticker, Polaroid, CheckerStrip, Ticker, Marquee, Dialog, Toast
│  ├─ shop/          # PieceCard, StatusBadge, Gallery, FilterBar, BagDrawer, HoldCountdown, DropCountdown,
│  │                 # StoreCard, SellerList, ReviewCards, AlertSignup, TabBar, Hero
│  └─ admin/         # Sidebar, PieceForm, PhotoUploader, MeasurementFields, PiecesTable, OrderCard,
│                    # DropBuilder, TickerEditor, StatTile, OrderSound
├─ actions/          # server actions, one file per domain, every one: zod parse → authz → DB → revalidate
│  ├─ bag.ts  checkout.ts  subscribe.ts
│  └─ admin/ pieces.ts photos.ts orders.ts drops.ts homepage.ts sellers.ts settings.ts auth.ts
├─ lib/
│  ├─ mode.ts  env.ts                 # zod-validated env, split server/public
│  ├─ supabase/ server.ts client.ts admin.ts(server-only, service role) middleware.ts types.ts(generated)
│  ├─ payments/ index.ts mock.ts stripe.ts   # interface: createCheckout, handleEvent, refund
│  ├─ email/ index.ts resend.ts outbox.ts    # all sends go through notifications_log
│  ├─ notify/ index.ts sms.ts                # email+sms adapter; sms = outbox only until a provider is chosen
│  ├─ captcha/ index.ts turnstile.ts mock.ts
│  ├─ ratelimit.ts
│  ├─ security/ session.ts tokens.ts csp.ts
│  ├─ catalog/ measurements.ts eras.ts sizes.ts conditions.ts   # one source of truth per type, drives form + zod + card
│  ├─ pieces/ status.ts queries.ts photos.ts                    # effectiveStatus(), cached reads (tag "pieces")
│  ├─ images/ resize.client.ts process.server.ts                 # canvas resize in browser, sharp on server
│  ├─ money.ts  time.ts  schemas.ts
├─ emails/           # React Email: OrderConfirmed, ReadyForPickup, Shipped, DropAlert, DoublePayApology, Welcome
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/    # 0001_schema … 0007_cron_realtime (see §4)
│  ├─ seed-data/     # json: stores, sellers, categories, pieces, orders, reviews
│  ├─ seed.sql       # GENERATED by scripts/generate-seed.ts, committed
│  └─ tests/         # pgTAP: rls.test.sql, one_of_one.test.sql, drops.test.sql
├─ scripts/          # generate-seed.ts (incl. blur placeholders via sharp), rls-proof.ts, demo-reset.ts, gen-types.sh
└─ tests/            # vitest unit (money, measurements, effectiveStatus, session, csp), e2e/ (Playwright: two-window, phone add-piece)
```

## 4. Data model

All tables in `public`, RLS on, `anon` and `authenticated` start with **no grants**; only what's listed below is granted back. UUID PKs, `created_at`/`updated_at` everywhere.

**Reference**
- `stores`: `slug` (barrie|newmarket|toronto), `name`, `address`, `mall_note`, `hours jsonb` (per weekday, `null` = unknown), `instagram`, `maps_query`, `photo_path`, `sort`.
- `sellers`: `name`, `instagram`, `active`, `is_placeholder`.
- `categories`: `slug`, `name`, `measurement_kind` (tops | bottoms | collectible | game), `sort`. Seeded: Jerseys, Jackets (varsity and satin), Graphic tees, Y2K, Denim, Pokémon and toys, Retro games. Measurement fields per kind live in `lib/catalog/measurements.ts` (e.g. tops: pit to pit, length, sleeve, shoulder; bottoms: waist, inseam, rise, leg opening; games: platform, tested, region).
- `settings`: single row: `hold_minutes` (15), `max_holds_per_session` (5), `shipping_flat_cents` (placeholder), `tax_rate` (0.13), `sold_visible_days` (3), `allow_placeholder_prices`, `ticker_messages text[]`, `google_rating`, `google_review_count`, `shipping_note`.
- `reviews`: `author`, `quote`, `source`, `confirmed`, `sort`.

**Inventory**
- `pieces`: `slug` unique, `title`, `description`, `category_id`, `store_id`, `seller_id`, `size`, `era`, `condition` (enum like_new | great | light_wear | worn_in), `condition_notes`, `authenticity_notes`, `measurements jsonb` (CHECK is object), `price_cents`, `price_is_placeholder`, **`status`** (enum draft | live | held | sold | archived), `held_until`, `live_at`, `just_dropped_until`, `sold_at`, `sold_via` (online | in_store), `sold_order_id`, `sold_by`, `featured_rank`, `drop_id`.
  - Partial unique index `(sold_order_id) WHERE sold_order_id IS NOT NULL` and a `BEFORE UPDATE` trigger enforcing the state machine below. `sold` and `archived` are terminal except owner "un-sell" (logged).
- `piece_photos`: `piece_id`, `kind` (front | back | tag | flaw | detail), `path`, `source` (public | storage), `width`, `height`, `blur_data_url`, `position`. First photo is the cover.
- `piece_events`: append-only audit: `piece_id`, `from_status`, `to_status`, `actor` (profile or "system"), `reason`, `at`. Feeds "sales per seller" later.

**Holds (never public)**
- `holds`: `piece_id` **UNIQUE**, `session_id`, `created_at`, `expires_at`, `extended boolean`. A hold exists only while active: release/expiry deletes the row, which is what makes UNIQUE mean "one active hold per piece".

**Commerce (never public)**
- `customers`: `email`, `name`, `phone`, unique `(lower(email))`.
- `orders`: `number` (EV-2381…, sequence), `public_token` (32 random bytes, base64url, unique), `customer_id`, `status` (enum pending | paid | bagged | ready | picked_up | packed | shipped | cancelled | refunded | refund_pending), `fulfillment` (pickup | ship), `store_id` (pickup store, null for ship), `ship_address jsonb`, `tracking_carrier`, `tracking_number`, `subtotal_cents`, `shipping_cents`, `tax_cents`, `total_cents`, `payment_provider` (mock | stripe), `payment_ref`, `idempotency_key`, `session_id`, `paid_at`, `failure_reason`.
- `order_items`: `order_id`, `piece_id`, **snapshot** of `title`, `price_cents`, `seller_id`, `store_id`. Partial unique `(piece_id) WHERE order paid-or-later` as a second wall behind the pieces trigger.
- `payment_events`: `provider`, `event_id` UNIQUE (webhook idempotency), `type`, `payload`.

**Marketing**
- `drops`: `name`, `starts_at`, `status` (scheduled | live | cancelled), `released_at`, `alert_on_release`, `alert_sent_at`.
- `drop_pieces`: `drop_id`, `piece_id` UNIQUE.
- `subscribers`: `email` or `phone` (CHECK at least one), `consent_at`, `consent_text` (exact wording shown), `consent_ip_hash`, `consent_user_agent`, `source`, `unsubscribe_token` unique, `unsubscribed_at`. CASL: no row without the checkbox, every email and SMS carries the unsubscribe link.
- `notifications_log`: `channel` (email | sms), `template`, `to`, `subject`, `body_html`, `status` (outbox | sent | failed), `provider_id`, `order_id`, `error`. This is also the mock outbox.

**Access**
- `profiles`: `id` → `auth.users`, `role` (owner | staff), `store_id` (required for staff), `display_name`.
- `rate_limits`: `key`, `window_start`, `count`.

### Piece state machine (enforced by trigger, not UI)

```
draft ──publish──▶ live ◀──release/expire── held ──pay──▶ sold
  ▲  └─drop opens─▶ live ──sell in store──────────────────▶ sold
  └──── archive from draft/live/held-never ────▶ archived
```
Only `SECURITY DEFINER` functions may change `status`, `held_until`, `sold_*`. Staff `UPDATE` grants exclude those columns.

### Functions (all `SECURITY DEFINER`, `search_path` pinned, explicit authz inside)
- `create_hold(piece_id, session_id)`: lock the piece row `FOR UPDATE`; delete its expired hold; require `status='live'`; enforce per-session cap; insert hold (UNIQUE is the backstop); set `held`/`held_until`; log event. Returns `expires_at` or a typed error (`sold`, `held`, `cap`, `unavailable`).
- `release_hold(piece_id, session_id)`, `expire_holds()` (cron), `extend_holds_for_checkout(session_id)`.
- `finalize_order(order_id, payment_ref)`: one transaction. For each item, lock piece; it must be `held` by this order's session **or** `live`. If every item succeeds: pieces → `sold`, holds deleted, order → `paid`. If any item was lost (sold or held by another shopper): order → `refund_pending`, nothing sold, caller refunds and emails the apology. Idempotent on `payment_ref`.
- `mark_sold_in_store(piece_id)`, `release_hold_admin(piece_id)`, `release_due_drops()`, `get_my_bag(session_id)`, `get_order_by_token(token)` (minimal fields), `check_rate_limit(key, limit, window)`.
- Triggers: `pieces` state machine, price/placeholder guard, `updated_at`, `orders` status change → `realtime.send` on topic `order:<public_token>`.

### RLS matrix

| Table | anon | staff | owner |
|---|---|---|---|
| `pieces` | SELECT where `status IN ('live','held')` OR `(status='sold' AND sold_at > now() - sold_visible_days)` | SELECT own store (all statuses); INSERT/UPDATE (non-status columns) own store | all |
| `piece_photos` | SELECT for visible pieces | own store | all |
| `stores`, `categories`, `settings` (public columns via view), `reviews`, `sellers` (active), `drops` (scheduled/live, no piece list) | SELECT | SELECT | all |
| `holds`, `customers`, `orders`, `order_items`, `payment_events`, `subscribers`, `notifications_log`, `rate_limits`, `piece_events` | **nothing** | orders/items/notifications for own store, subscribers none | all |
| `profiles` | nothing | own row | all |
| writes of any kind | none (subscribe goes through a server action + RPC) | see above | all |

Service role is imported only in `lib/supabase/admin.ts` (`server-only`), used for: webhook, cron, mock pay, outbox writes, shopper bag RPCs. Admin screens use the signed-in user's client so RLS does the scoping.

### Realtime
- **Public**: `postgres_changes` on `pieces` (RLS filters what anon can see) over one shared channel, mounted once by `<LiveStatusProvider>` after idle via dynamic import so it costs nothing on first paint. Drives "In a bag", "Sold" stamp, "just dropped", and new drop pieces appearing. A local timer flips `held` → `live` at `held_until`.
- **Order page**: Realtime Broadcast on `order:<token>` (token = capability), plus 10 s poll fallback.
- **Admin**: `postgres_changes` on `orders` and `pieces` with the staff JWT. New-order toast, badge count and a sound (unlocked by the first click, since browsers block autoplay).
- Tables are added to the `supabase_realtime` publication in migration 0007.

### Cron (pg_cron, in migration 0007)
`expire_holds()` every 30 s; `release_due_drops()` every 30 s (also callable lazily from the drop countdown endpoint); `prune_rate_limits()` hourly. `/api/cron/tick` calls the same functions for hosts without pg_cron.

## 5. Flows

**Add to bag**: client → `addToBag` server action → zod → Turnstile (stub in mock) + honeypot → `check_rate_limit` (per session and per hashed IP) → mint/verify cookie → `create_hold` → return `expires_at`. Bag island hydrates from `GET /api/bag`. Countdown is a local timer against server `expires_at`; at zero it calls `release_hold` and removes the line.

**Checkout**: `/checkout` (dynamic) re-reads the bag server-side → shipping vs pickup → zod-validated details → `createCheckout` action recomputes **every price from the DB**, creates a `pending` order with item snapshots and an idempotency key, extends holds, then:
- *mock*: redirect to `/mock/pay` → "Pay" button posts to `mockPay` action → the same `handlePaymentSucceeded()` function the webhook calls → `finalize_order`.
- *live*: Stripe Checkout Session (idempotency key = order id) → `/api/stripe/webhook` verifies the signature, dedupes on `payment_events.event_id`, calls `handlePaymentSucceeded()`. Orders are marked paid **only** here. If `finalize_order` says an item was lost, the adapter refunds in full, email goes out, order → `refunded`.
- Success: confirmation email (outbox in mock), redirect to `/order/[token]`.

**Sell in store**: admin action → `mark_sold_in_store` → status flips → Realtime → card shows "Sold" everywhere; ISR tag revalidated.

**Drops**: admin picks draft pieces + date/time → `drops`/`drop_pieces`. Home shows a countdown from `drops` (public columns only). At `starts_at`, `release_due_drops()` flips all its pieces to `live` in one statement with `just_dropped_until = now() + 2h` → one Realtime burst → pieces appear everywhere with the "just dropped" badge; optional drop-alert emails queue.

**Add a piece (phone)**: one screen, in order: photos (camera capture input, multi-select, client-side resize to ≤1600 px) → title → type (chips) → size (chips by type) → condition (chips) → measurements (fields from `measurements.ts`) → price → store (defaults to my store) and seller → **Put it on the site** / Save draft. Autosaves a draft locally, big touch targets, no scroll-to-submit. Server action re-encodes with sharp (AVIF/WebP, 1600 and 640 variants, 16 px blur data URL) into Storage.

## 6. Security checklist (where each item lives)

- RLS everywhere + `revoke all` baseline: migration 0002; proven by `supabase/tests/rls.test.sql` **and** `scripts/rls-proof.ts` (anon REST/Realtime attempts against orders, customers, holds, price/status updates).
- Server-side totals only: `actions/checkout.ts`; unit-tested.
- Stripe: signature verify, idempotency keys, `payment_events` dedupe, paid-only-from-webhook: `lib/payments/stripe.ts`.
- Secrets: `.env.local` only, `lib/env.ts` fails the build if a `NEXT_PUBLIC_` var contains a secret name, `.env.example` has names only, service role file is `server-only`.
- Admin: `middleware.ts` guard + `requireRole()` at the top of every admin action and page.
- Abuse: honeypot field, Turnstile adapter, Postgres rate limits, per-session hold cap.
- Headers: CSP (see decision 7), HSTS, Referrer-Policy, X-Content-Type-Options, frame-ancestors none, Permissions-Policy (camera allowed on `/admin` for photo capture).
- Order pages: 256-bit token, no enumerable IDs, `noindex`, `Referrer-Policy: no-referrer`.
- CASL: explicit unchecked checkbox, stored consent text/time/IP hash/source, unsubscribe link and `List-Unsubscribe` header in every drop email.

## 7. Performance plan

- Home, Shop, Piece: static + ISR. Cards carry only cover photo, title, size, era, price, status.
- `next/image` AVIF/WebP, real `sizes`, blur placeholders from `piece_photos.blur_data_url`, explicit width/height (no layout shift); only the hero collage's 3 images are `priority`.
- Fonts via `next/font` (self-hosted, `display: swap`, only used weights).
- Supabase client, Radix Dialog, Turnstile and the bag drawer load after idle or on interaction. Ticker, checker strip and stripe wipes are transform/background-position CSS only. `prefers-reduced-motion` disables marquee, wobble, wipes and parallax.
- Lighthouse CI (`lighthouserc.json`, mobile preset) as a script; target 95+ on `/` and `/shop` against a production build.

## 8. Build order (each line is one or two commits)

0. `git init`, add remote (no push), `.gitignore`, move logo and photos into `public/`.
1. Scaffold Next 15 + TS strict + Tailwind v4 tokens + fonts + eslint/prettier/vitest + `lib/env.ts` + `lib/mode.ts` + `.env.example`.
2. Supabase init + migrations 0001–0004: schema, enums, constraints, state-machine triggers, functions.
3. Migration 0005 (RLS + grants) and 0006 (policies for staff/owner), then pgTAP tests for RLS and the one-of-one rule. **I'll run these before building any UI on top.**
4. `scripts/generate-seed.ts` → `supabase/seed.sql` (~24 pieces, sold/held/draft/archived mix, 3 demo orders, a scheduled drop, reviews, 4 sellers, demo auth users) and `demo-reset`.
5. Supabase clients, shopper session, rate limit, captcha/payments/email/notify adapters with mock implementations, middleware and headers.
6. Design system components and shop layout (ticker, nav, tab bar, checker strip, stickers, polaroids).
7. Home, Shop (+ URL filters), Piece page, Stores, Alerts + CASL + unsubscribe.
8. Realtime layer: `LiveStatusProvider`, status badges, "just dropped", drop countdown.
9. Holds and bag drawer (countdowns, cap, rate limit, honeypot).
10. Checkout, mock pay, `finalize_order`, order status page, emails to outbox, double-pay path.
11. Stripe adapter + webhook (code-complete, tested with signed fixture payloads; live-tested only once you add keys).
12. Admin auth (demo login / magic link), shell, role scoping, live order badge and sound.
13. Admin add-piece (phone-first) + photo pipeline.
14. Admin pieces list and actions, orders workflow, drops + cron, homepage, subscribers + export, sellers, settings, outbox.
15. Perf pass (Lighthouse), CSP tuning, a11y pass, reduced motion.
16. Playwright: two-window test and phone add-piece timing; `README.md`, `TODO-LIVE.md`.

## 9. Definition-of-done mapping

| DoD item | Proof |
|---|---|
| `pnpm dev` with seed | `pnpm db:start && pnpm db:reset && pnpm dev` |
| Two-window "In a bag" → "Sold" → expiry returns | Playwright two-context test + manual script in README |
| Second shopper can't buy held/sold; DB rejects bypass | pgTAP `one_of_one.test.sql` (direct SQL and REST attempts), double-pay test on `finalize_order` |
| Staff adds a piece on phone in < 1 min, live on shop | Playwright at 390×844 with a timer; Realtime assertion in a second context |
| RLS proof | pgTAP + `scripts/rls-proof.ts` |
| `pnpm build` clean, Lighthouse 95+ | CI script `pnpm lh` |
| README + TODO-LIVE | step 16 |

## 10. Env vars (names only; all in `.env.example`)

`NEXT_PUBLIC_APP_MODE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ORDER_TOKEN_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (unused with hosted Checkout, kept for later), `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `SMS_PROVIDER` (+ provider keys later).
