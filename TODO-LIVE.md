# TODO-LIVE: what's still needed to go live

Everything below is a plug-in: no code changes should be needed. Tick them off in order.

## Content

- [ ] **Real pieces, prices and photos.** Add them in `/admin/pieces/new` (phone-friendly). Seed pieces use the store's rack photos as stand-ins and dummy prices flagged `[price]`.
- [ ] **Turn off placeholder prices.** Admin, Settings: untick "Allow pieces with a placeholder [price] to go live". After that, a piece can't go live without a real price.
- [ ] **The fourth seller's name and handle.** Admin, Sellers (currently `[Fourth seller]` / `[handle]`; hidden from the live site until you replace it).
- [ ] **Hours for Newmarket and Toronto**, and **confirm Barrie's** (seeded from the concept: Mon to Fri 9:30 to 9, Sat 9:30 to 6, Sun 11 to 5). Admin, Settings.
- [ ] **The Newmarket store photo** (the card shows a placeholder). Drop it in `public/photos/` and set `photo_path` on the store, or ask for an admin upload field.
- [ ] **Confirm store addresses.** Toronto is seeded as "The Well, 486 Front St W" and Newmarket as "Upper Canada Mall, 17600 Yonge St" (best guesses from public info).
- [ ] **Shipping rate.** Admin, Settings: set the flat rate and untick "Still showing [rate]".
- [ ] **Real Google reviews.** Admin, Homepage: paste real reviews (they're added as confirmed). The three seeded quotes come from the concept canvas, are marked "sample", and never show on the live site. Also set the rating and review count in Settings (seeded 4.5 / 47, unconfirmed).
- [ ] **HST.** Seeded at 13% added on top of prices. Confirm that's how you want to charge, and your HST registration shows on receipts if required.
- [ ] **Logo.** `public/brand/era-vintage-logo.png` is 451×220. A vector or larger PNG will look sharper on big screens.
- [ ] **Privacy policy and Terms** (`/privacy`, `/terms` are placeholders). CASL needs a real privacy policy linked from the sign-up form.
- [ ] **Instagram.** Confirm `@eravintagebarrie`, `@eravintageucm`, `@eravintageto`.

## Accounts and keys

- [ ] **Supabase project.** A hosted `era-vintage` project exists (ca-central-1, free tier) with migrations 0001 to 0007 applied, RLS on all 19 tables, the `piece-photos` bucket, realtime on `pieces`/`orders`/`drops`, the three pg_cron jobs, and reference data (3 stores, 7 categories, 4 sellers incl. the `[Fourth seller]` placeholder, ticker messages) loaded. No demo data and no demo logins. Still to do:
  - Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in env (Dashboard, Project Settings, API) and the **service role key** as `SUPABASE_SERVICE_ROLE_KEY` (server env only, never `NEXT_PUBLIC_`).
  - Auth: set Site URL to your domain; add `https://<domain>/auth/callback` to redirect URLs; configure SMTP (Resend works) so magic links send.
  - Create the staff users (Auth, Users), then insert their `profiles` rows: `insert into profiles (id, role, store_id, display_name) values (…)`. One `owner` (no store), staff with a `store_id`.
  - For future schema changes: add a numbered file in `supabase/migrations/`, test locally (`pnpm db:reset && pnpm db:test`), then apply it to the hosted project.
- [ ] **Stripe** (Canada, CAD). `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Webhook URL: `https://<domain>/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`. Do a test-mode purchase and a refund before using live keys.
- [ ] **Resend.** `RESEND_API_KEY`, `EMAIL_FROM`; verify your sending domain (SPF, DKIM, DMARC) so order and drop emails don't land in spam.
- [ ] **Cloudflare Turnstile.** `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (add your domain to the widget).
- [ ] **Secrets.** `SESSION_SECRET`, `ORDER_TOKEN_SECRET`, `CRON_SECRET` (`openssl rand -base64 36` each).
- [ ] **Domain** on Vercel, then `NEXT_PUBLIC_SITE_URL=https://<domain>`. HSTS and `upgrade-insecure-requests` switch on automatically for https.
- [ ] **Vercel Cron** (already in `vercel.json`, every minute) hits `/api/cron/tick` to open drops, send drop alerts and refresh the static shop. pg_cron also handles expiry and drops inside the database.
- [ ] **SMS (optional).** Texts currently only go to the mock outbox. To send real texts, implement a provider in `lib/notify/index.ts` (e.g. Twilio) and set `SMS_PROVIDER`. CASL applies to texts too (consent + STOP handling).

## Before launch

- [ ] Set `NEXT_PUBLIC_APP_MODE=live`.
- [ ] Run a real end-to-end order: pickup and shipping, check the emails, and refund one.
- [ ] Run the two-window test against the live site with test cards.
- [ ] Run `pnpm rls:proof` against the live Supabase URL (anon key only).
- [ ] Run Lighthouse (`pnpm lh`) against the deployed URL with real photos.
- [ ] Decide the "sold" window (default 3 days) and hold length (default 15 min, cap 5 per shopper) in Settings.

## Known limits of this round

- A staff member can't un-sell a piece (`sold` is terminal by design); fix a mistake by adding it as a new piece.
- Shipping is a flat rate for the whole order; no per-weight rates or international shipping.
- Pickup at a store other than where the piece is shows a "Transfer from…" flag on the admin order; there's no transfer workflow.
- No customer accounts: orders are tracked by their secret link.
- The static shop CSP allows inline scripts (Next's bootstrap); revisit with hash-based CSP if you want it stricter.
