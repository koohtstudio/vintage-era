# Era Vintage: Claude Code starter prompt

Repo: https://github.com/guraaseessethi/vintage-era
Design concept (Kooht canvas): https://claude.ai/artifact/9C7HZoSWdZV2boNptuLkZ5

---

You're building the online shop and admin for **Era Vintage**, a vintage collective of Toronto sellers. It has three stores:

- Barrie: Georgian Mall, lower level, Unit B016, 509 Bayfield St
- Newmarket: Upper Canada Mall
- Toronto: The Well

They sell jerseys, varsity and satin jackets, graphic tees, Y2K, denim, Pokémon and toys, and retro games. **Every piece is one of one.** Once it sells, it's gone.

This round is a **clickable mock** I can show the owners. Every screen should look finished and work end to end on seeded data. But build it on the real architecture from day one, so later I only plug in real keys, real pieces and photos. No throwaway code. No POS.

Start by reading the repo. Then write `PLAN.md` with the file structure, the data model and the build order, and wait for me to say go.

## Stack (don't swap these)

- **Next.js 15**, App Router, TypeScript strict, Server Components by default, Server Actions for mutations.
- **Tailwind CSS v4**. Design tokens go in CSS variables. Use Radix primitives only where you need accessibility.
- **Supabase** for Postgres, Auth, Realtime and Storage (product photos, several per piece). Use `@supabase/ssr`.
- **Zod** on every form and every server action.
- **Stripe** for checkout. In mock mode, use a fake pay step and no Stripe calls.
- **Resend + React Email** for order and drop alert emails. Optional SMS through a `lib/notify` adapter.
- **Vercel** and **pnpm**.

## Mock mode vs real mode

- Use `NEXT_PUBLIC_APP_MODE=mock|live`.
- **Mock:**
  - Use a local Supabase with `supabase/seed.sql` (about 24 pieces across categories, some sold).
  - Payment is simulated.
  - Emails land in `/admin/outbox`.
  - The admin has a "demo login" button.
- **Live:** real Supabase, Stripe, Resend, magic-link admin auth, and no demo button.
- Every outside service sits behind a small adapter in `lib/`.

## The one-of-one rule (most important logic)

- A piece can only ever be sold once. Enforce this in the **database**, not just the UI.
- **Adding to bag:**
  - Adding to bag creates a **hold** for 15 minutes, done through a Postgres function that atomically checks the piece is `live` and not held by someone else.
  - The bag shows a countdown. When it hits zero the hold is released and the piece goes back on the site.
  - Expired holds are cleaned up by a scheduled job (Supabase cron or pg_cron) and also checked lazily on read.
- **Paying:**
  - On payment, a webhook (or the mock pay action) marks the piece `sold` in a transaction.
  - If two people somehow pay for the same piece, only one order succeeds, and the other is auto-refunded and emailed an apology.
- **Sold in store:** staff can mark a piece sold in store from admin, and it disappears from the site instantly.

## Security (non-negotiable)

- **Row Level Security** on every table.
  - The public can read only `live`, `held` and recently `sold` pieces (sold ones show as "Sold" for a few days, then hide), plus their photos, categories and stores.
  - Orders, customers and holds are never readable from the public client except the shopper's own hold, through a signed cookie session.
- Prices and totals are computed on the server from the DB. Never trust the client.
- **Stripe:** verify webhook signatures, use idempotency keys, and mark orders paid only from the webhook.
- Never expose the service role key or the Stripe secret. Secrets go in `.env.local` only, and I add them by hand. Commit a `.env.example` with names only.
- Admin routes are protected in middleware and re-checked in every server action. Roles: `owner` (all stores) and `staff` (their store).
- Abuse protection: rate limit holds and checkout so nobody can hold the whole rack, add a honeypot, and use Cloudflare Turnstile (stubbed in mock). Cap active holds per shopper.
- Set security headers (CSP that allows Stripe, HSTS, Referrer-Policy, frame protections).
- Order status pages use a signed token, not a guessable ID.

## Speed

- Aim for Lighthouse mobile 95+ on Home and Shop.
- Product photos are the main weight:
  - Use `next/image` with AVIF/WebP and correct `sizes`.
  - Use blur placeholders.
  - Upload in admin, with resizing done on upload.
- Make Home and Shop static with ISR, plus live overlays for held and sold status. Bag, filters and drawer are small client islands.
- Shop filters (type, size, era, store) live in the URL so they're shareable and work with the back button.
- Smooth motion that respects `prefers-reduced-motion`. No layout shift.

## Realtime (this is the pitch)

- **Live status on every card:** when a piece is added to someone's bag it shows "In a bag" for everyone browsing. When it sells it flips to "Sold" with the stamp, live, without a refresh. This creates the urgency vintage needs.
- **New drop goes live:** when a scheduled drop opens, pieces appear on everyone's screen at the same moment, with a "just dropped" badge. Before that, show a countdown.
- **Admin:** new online orders appear instantly with a badge and sound. Inventory status changes sync across every staff device at all three stores.

## Brand and design

Match the concept canvas. If you can't open the link, follow this:

- **Colours (from their logo and store):**
  - lime `#7CE34F`
  - pink `#F28BDD`
  - hot pink accent `#C2187A`
  - ink `#0B0B0B`
  - white
- **Fonts:** Racing Sans One (headlines, slightly skewed), Space Grotesk (body and UI), Space Mono (labels, sizes, measurements).
- **Feel:**
  - Y2K racing streetwear: black-and-white checkered flag strips (subtly animated) and a lime scrolling news ticker at the very top.
  - Polaroid-style photo collage in the hero and round "1 of 1" stickers.
  - Thick black borders with hard offset shadows on buttons and cards.
  - Playful and fast, but still premium.
- **Logo:** I'll drop it at `public/brand/era-vintage-logo.png`. Photos go in `public/photos/`.
- On phones it should feel like an app, with a fixed pill-shaped bottom bar (Home, Shop, Bag with count, Stores).

## Client site pages

1. **Home:**
   - Ticker, then the hero ("Find your era.") with the photo collage and buttons.
   - A scrolling category strip.
   - "Fresh finds" (latest pieces).
   - The next drop countdown.
   - The three stores.
   - The collective, listing the sellers. I'll confirm names and handles; seed `[Fourth seller]` as a placeholder.
   - Real Google review quotes (I'll paste them; don't invent any).
   - The drop alert signup.
2. **Shop:** a grid with filters (type, size, era, store), sort (newest, price), and live held and sold status.
3. **Piece page:**
   - Photo gallery (front, back, tag, flaws).
   - Era, size, condition grade, measurements (pit to pit, length, and so on, by category), a notes/flaws field and which store it's at.
   - "Add to bag" starts the hold.
   - Because shoppers care about authenticity, show the condition and measurements up front, plus an "authenticity notes" field.
4. **Bag:** a drawer with hold countdowns.
5. **Checkout:** choose free pickup at Barrie, Newmarket or Toronto, or shipping (`[rate]` for now, flat rate configurable in admin). Then name, email and phone, then pay. Then a live order status page.
6. **Stores:** each store with hours, map and Instagram (@eravintagebarrie, @eravintageucm, @eravintageto).
7. **Drop alerts:** email or phone signup, with consent stored properly (CASL: a clear opt-in checkbox and an unsubscribe link in every email).

Prices: use `[price]` in the seed. I'll fill in the real ones.

## Admin (`/admin`), no POS

- **Add a piece (fast, phone-friendly):**
  - Staff should be able to list a piece in under a minute on their phone in the store.
  - Snap or upload several photos, then title, type, size, era, condition grade, measurements (fields change by type), price, store and seller.
  - Then save as draft or "Put it on the site".
- **Pieces:** a list with filters (status, store, seller, type), with mark sold in store, release hold, edit, and archive.
- **Online orders:**
  - Pickup orders go Bagged, then "Tell them it's ready" (emails the customer), then Picked up.
  - Shipped orders go Packed, then Add tracking (emails tracking), then Shipped.
- **Drops:** pick pieces, set a date and time, and they go live together at that moment. Optionally send a drop alert to the list.
- **Homepage:** pick featured pieces and edit the ticker messages.
- **Drop alert list:** view and export subscribers.
- **Sellers:** the collective's sellers, so each piece is tagged to one and I can later show sales per seller.
- **Settings:** stores and hours, shipping rate, hold length.

## Data model (starting point; refine it in PLAN.md)

`stores`, `sellers`, `categories`, `pieces` (status enum: draft, live, held, sold, archived; store_id, seller_id, size, era, condition, measurements jsonb, price), `piece_photos`, `holds` (piece_id unique while active, session_id, expires_at), `drops`, `drop_pieces`, `orders` (status enum, fulfillment: pickup or ship, store_id, public_token), `order_items`, `customers`, `subscribers` (consent_at, source), `settings`, `notifications_log`, `profiles` (role, store_id).

## Definition of done for this round

- `pnpm dev` runs with seeded data.
- **Two-window test:** I add a piece to my bag in one window and it shows "In a bag" in another, live. When I check out, it flips to "Sold" everywhere. If the hold expires, it comes back.
- A second shopper can't buy a held or sold piece, and the DB rejects it even if the UI is bypassed.
- Staff can add a piece from a phone-sized screen in under a minute, and it appears live on the shop.
- RLS is proven with SQL tests or a script: an anonymous user can't read orders, customers or other people's holds, and can't change prices or status.
- `pnpm build` passes with no type errors, and Lighthouse mobile is 95+ on Home and Shop.
- `README.md` covers mock mode, switching to live, and every env var.
- `TODO-LIVE.md` lists what I still need to plug in:
  - real pieces, prices and photos
  - the fourth seller's name and handle
  - hours for Newmarket and Toronto, and the Newmarket photo
  - shipping rate and real reviews
  - Stripe keys and webhook URL, Resend key, Turnstile key
  - domain and Supabase project

Commit in small, clear steps.
