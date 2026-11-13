# Era Vintage: shop and admin  

Online shop and admin for Era Vintage (Barrie, Newmarket, Toronto). Every piece is one of one.
Built on the real architecture from day one: this round runs in **mock mode** on seeded data, and going live is a matter of adding keys (see [TODO-LIVE.md](TODO-LIVE.md)). No POS.

Stack: Next.js 15 (App Router, Server Components, Server Actions), TypeScript strict, Tailwind CSS v4, Supabase (Postgres, Auth, Realtime, Storage), Zod, Stripe, Resend + React Email, Cloudflare Turnstile, pnpm, Vercel.

## Run it (mock mode)

Needs Node 20+, pnpm, and Docker (Docker Desktop, OrbStack or Colima) for the local Supabase stack.

```bash
pnpm install
pnpm db:start        # local Supabase (ports 56321-56329, see supabase/config.toml)
pnpm db:reset        # applies migrations + regenerates and loads supabase/seed.sql
cp .env.example .env.local   # then fill the Supabase keys from `pnpm exec supabase status`
pnpm dev             # http://localhost:3100
```

Local ports are non-default (Supabase 563xx, Next 3100) so this can run next to other projects.
Reset the demo any time with `pnpm demo:reset` (same as `db:reset`). Run it before `pnpm db:test` or `pnpm e2e`: both assume the pristine seed.

**In mock mode:**

| What | How it behaves |
|---|---|
| Database | Local Supabase, seeded with 30 pieces (live, in a bag, sold, draft, archived), 3 orders, a scheduled Friday drop, 4 sellers (the 4th is a `[Fourth seller]` placeholder) |
| Prices | Dummy numbers flagged as placeholders. The UI shows `[price]`, the shipping rate shows `[rate]`, mock pay charges the dummy numbers |
| Payments | `/mock/pay` plays the role of Stripe. No Stripe calls. It runs the same finalize code path the webhook uses |
| Email and SMS | Land in `/admin/outbox`. Nothing leaves your machine |
| Admin | `/admin/login` has demo buttons: Owner (all stores), Barrie staff, Toronto staff |
| Captcha | Turnstile is stubbed (always passes) |

## Try the pitch (two-window test)

1. Open the shop in two windows (use a normal and a private window so they are different shoppers).
2. Window A: add a piece to the bag. Window B instantly shows **In a bag** on that piece.
3. Window A: check out (mock pay). Window B flips to **Sold** with the stamp, no refresh.
4. Window A: add another piece and wait 15 minutes (or run `select expire_holds()` after setting `holds.expires_at` in the past). The piece comes back in Window B.
5. Admin (Barrie demo login, phone-sized window): **+ Add a piece**, add a photo, fill the form, **Put it on the site**. It appears at the front of the shop in both windows.
6. Admin as Owner, **Drops**, **Open it now** on the Friday drop: its 5 pieces appear everywhere at the same moment with a **Just dropped** badge.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next on port 3100 |
| `pnpm typecheck` / `lint` / `test` | tsc, eslint, vitest (unit) |
| `pnpm db:start` / `db:stop` | Local Supabase |
| `pnpm db:reset` | Regenerate `supabase/seed.sql` from `scripts/seed-data.ts`, rebuild the DB |
| `pnpm db:test` | pgTAP: RLS, the one-of-one rule, admin rules (82 tests) |
| `pnpm rls:proof` | Black-box proof using only the public anon key: it can read the shop and nothing else |
| `pnpm db:types` | Regenerate `lib/supabase/types.ts` |
| `pnpm e2e` | Playwright (needs a production build running on 3100 and a fresh seed): two-window live test, phone add-a-piece, admin smoke test |
| `pnpm lh` | Lighthouse CI (mobile) on Home and Shop against a production build |

## How the one-of-one rule works

A piece can only be sold once, and the **database** enforces it:

- **Holds.** "Add to bag" calls `create_hold()`, which locks the piece row, clears a lapsed hold, requires `status = 'live'`, enforces the per-shopper cap, inserts a hold (`UNIQUE(piece_id)` is the backstop), and flips the piece to `held` with `held_until`. All in one transaction.
- **Expiry.** `pg_cron` runs `expire_holds()` every 30 s. Clients also treat a `held` piece as live the moment `held_until` passes, and `create_hold()` clears lapsed holds itself, so correctness never depends on the cron.
- **Paying.** `finalize_order()` is one transaction: it locks every piece in the order, and either sells all of them to this order or none. If a piece was lost to another payment, the order becomes `refund_pending`, the payment is refunded in full, and the shopper gets an apology email. A unique index on `order_items(piece_id) WHERE committed` is a second wall.
- **State machine.** A trigger allows only legal status moves (`sold` is terminal). Client roles can't write `status`, `held_until` or `sold_*` at all (column privileges); staff change status only through functions that re-check role and store.
- **Sold in store.** `mark_sold_in_store()`; the piece shows Sold everywhere instantly.

## Security model

- **RLS on every table.** `anon` and `authenticated` start with no grants; only what's needed is granted back. Anonymous visitors can read live, held and recently sold pieces (sold ones hide after `sold_visible_days`), their photos, stores, categories, active sellers, reviews and scheduled/live drops. They cannot read or write orders, customers, holds, subscribers, payment events or the outbox.
- **Holds are never readable by the browser.** Shopper identity is a signed httpOnly cookie. Every function that takes a session id is callable only by the server (`service_role`).
- **Money is computed in SQL** (`create_pending_order`). The client never sends a price or total.
- **Stripe:** webhook signature verified on the raw body, `payment_events.event_id` unique for idempotency, idempotency keys on checkout and refund, orders marked paid only from the webhook.
- **Service role key and Stripe secret** only appear in server-only modules (`lib/supabase/admin.ts`, `lib/payments/stripe.ts`). The build fails if a `NEXT_PUBLIC_` variable looks like a secret.
- **Admin:** middleware requires a session for `/admin/*`; every page calls `requireStaff()` and every server action calls `assertStaff()`/`assertOwner()`. Roles: `owner` (all stores) and `staff` (their store, enforced by RLS too).
- **Abuse:** Postgres rate limits on holds, checkout, sign-up and sign-in; per-shopper hold cap; honeypot fields; Turnstile (stubbed in mock).
- **Headers:** CSP, HSTS, Referrer-Policy, frame protections, nosniff, Permissions-Policy. Static shop pages get a header CSP (`'unsafe-inline'` scripts, because a nonce would make them dynamic); admin, checkout and order pages get a strict per-request nonce CSP from `middleware.ts`.
- **Order pages** use a 244-bit random token plus an HMAC (`/order/<token>.<sig>`), `noindex`, `no-referrer`.
- **CASL:** unticked opt-in checkbox, exact consent wording, timestamp and hashed IP stored per subscriber, unsubscribe link and `List-Unsubscribe` header in every message.

Proof: `pnpm db:test` and `pnpm rls:proof`.

## Realtime

One channel for the whole public site (`LiveProvider`), subscribed after idle so it costs nothing on first paint: Postgres changes on `pieces` (RLS filters what anon sees) plus a broadcast for pieces that stop being visible. Staff get one channel for `pieces` and `orders` (new paid orders: toast, badge, chime). Order pages use a Broadcast topic keyed by the order's secret token, with a 10 s poll as a safety net.

## Speed

Home, Shop and Piece pages are static with ISR (60 s) and `revalidateTag('pieces')` on every mutation. The whole catalog ships to the Shop page and filters in memory; filters live in the URL (`?type=jackets&size=L`). Photos go through `next/image` (AVIF/WebP, real `sizes`, blur placeholders). Admin uploads are shrunk in the browser, then re-encoded to WebP (1600 px) with sharp and a blur placeholder. Fonts are self-hosted via `next/font`. Motion respects `prefers-reduced-motion`.

## Switching to live

See [TODO-LIVE.md](TODO-LIVE.md) for the checklist. In short:

1. Create a Supabase project, link it (`supabase link`), push migrations (`supabase db push`), **do not** load `seed.sql`, create your staff users, and insert matching `profiles` rows.
2. Fill `.env.local` / Vercel env with the variables below and set `NEXT_PUBLIC_APP_MODE=live`.
3. Stripe: add the webhook endpoint `https://<domain>/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.
4. In **Admin, Settings**: turn off "Allow placeholder prices", set the real shipping rate, hours and uncheck the `[rate]` flag.

In live mode: `/admin/login` sends magic links (only existing profiles can sign in), the demo login and `/mock/pay` refuse to run, `/admin/outbox` is hidden, and the app refuses to boot if a required secret is missing.

## Environment variables

Names only live in [.env.example](.env.example). Secrets go in `.env.local` (git-ignored) or Vercel env.

| Variable | Used for | Mode |
|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | `mock` or `live`. Anything other than `live` is mock | both |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in emails, Stripe return URLs, CSP | both |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | both |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (anon) key; RLS-limited | both |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only: shopper RPCs, webhook, cron, outbox, storage uploads | both |
| `SESSION_SECRET` | **Secret.** Signs the shopper cookie and hashes IPs (32+ chars) | both |
| `ORDER_TOKEN_SECRET` | **Secret.** Signs order status URLs (32+ chars) | both |
| `CRON_SECRET` | **Secret.** Bearer token for `/api/cron/tick` (Vercel Cron sends it) | live (optional in mock) |
| `STRIPE_SECRET_KEY` | **Secret.** Creates Checkout sessions and refunds | live |
| `STRIPE_WEBHOOK_SECRET` | **Secret.** Verifies webhook signatures | live |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Unused with hosted Checkout; kept for later | live |
| `RESEND_API_KEY` | **Secret.** Sends email | live |
| `EMAIL_FROM` | From address, e.g. `Era Vintage <hello@yourdomain.com>` (domain verified in Resend) | live |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget key | live |
| `TURNSTILE_SECRET_KEY` | **Secret.** Verifies Turnstile tokens | live |
| `SMS_PROVIDER` | Reserved for the SMS adapter (no provider wired yet; texts only go to the mock outbox) | optional |

Generate secrets with `openssl rand -base64 36`.

## Project layout

```
app/(shop)/…        public pages (Home, Shop, Piece, Stores, Alerts, Checkout, Order, mock pay)
app/admin/…         admin console (login + (console) group)
app/api/…           bag, order, stripe webhook, cron tick, subscriber export, unsubscribe
actions/            server actions (every one: zod parse, authorise, DB, revalidate)
components/         ui, shop (client islands), admin
lib/                adapters (payments, email, notify, captcha), supabase clients, security, catalog, pieces
emails/             React Email templates
supabase/           migrations, seed.sql (generated), pgTAP tests
scripts/            seed generator, RLS proof
tests/              vitest unit tests, Playwright e2e
```

See [PLAN.md](PLAN.md) for the original plan and data model.
