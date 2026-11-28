# 3D PRINTMONK Shop — ecommerce platform

The Shop is a full ecommerce application built into this Next.js project. It is served at
`/shop` today and is ready to move to **https://shop.3dprintmonk.com** with configuration only.

- Storefront: `/shop` · Customer accounts: `/shop/account` · Admin dashboard: `/shop/admin`
- Code: `src/shop/**` (logic & components) and `src/app/shop/**` (routes)
- Database: `supabase/shop-schema.sql` (+ sample data in `supabase/shop-seed.sql`)

---

## 1. What's included

| Area | Features |
| --- | --- |
| **Storefront** | Homepage driven by the admin (hero slides, promo banners, category tiles, featured, bestsellers, new arrivals, collections, newsletter). Catalogue with categories and subcategories, full-text search with live suggestions, filters (price, stock, sale, material, FDM/SLA), sorting (relevance, popularity, newest, price, rating), pagination, quick view, wishlist, related products. |
| **Product page** | Gallery with thumbnails, optional interactive **3D model viewer** (STL/OBJ/3MF, reuses the site's viewer), variants (size, colour, material…), stock status, quantity, Add to cart / Buy now, **personalisation options** (text, choices, add-ons with surcharges), PIN-code delivery-date check, specifications (material, finish, technology, dimensions, weight, lead time, HSN), reviews with rating distribution, structured data (Product, Offer, AggregateRating, BreadcrumbList). |
| **Cart** | Server-side cart for guests (cookie) and customers (follows them across devices; guest cart merges at sign-in), quantity updates, save for later, coupon codes, free-shipping progress, GST shown, live stock checks. |
| **Checkout** | Contact → shipping address → billing / GSTIN → delivery method with dates → payment (Razorpay or COD) → review. Guest checkout or account, optional account creation, saved addresses, Indian mobile / PIN / GSTIN validation (incl. GSTIN checksum), CGST+SGST vs IGST by place of supply, COD rules (fee, max value, PIN serviceability, no COD for personalised items). |
| **Orders** | Confirmation page & emails, secret order links for guests, status timeline, shipment tracking links, GST invoice (print / save as PDF / download), retry payment, customer cancellation (with automatic refund), buy again. |
| **Accounts** | Register, sign in/out, email verification, forgot/reset password, profile, password change (signs out other devices), address book, order history, wishlist, account deletion request. |
| **Admin** | Separate login with roles (owner/manager/staff), dashboard with date filters and revenue chart, products (multi-image upload & reordering, variants generator, SKUs, stock, sale prices, dimensions/weight, specs, personalisation builder, GST/HSN, SEO, scheduling, featured/bestseller/new, CSV import/export), categories, collections, banners & homepage sections, orders (search, filters, status workflow, payment confirmation, shipments & tracking, Shiprocket, invoices, refunds, cancellations, notes, CSV export), customers (profile, orders, addresses, notes, suspend, GDPR/DPDP erasure, CSV export), inventory (low/out filters, adjustments, movement history), discounts, reviews moderation, team & activity log, store settings (business/GST, tax, payments, shipping methods & rates, PIN rules, notifications, policies). |
| **Emails** | Welcome + verification, verification resend, password reset (customer & admin), order confirmation, payment received, payment failed (retry link), shipped (tracking), delivered, cancelled, refund processed, admin new-order alert, low-stock alert. Sent through the site's existing Resend setup. |

## 2. Architecture

```
src/shop/
  config.ts              Shop URLs & base path (env-driven, no hard-coded domain)
  seo.ts                 Metadata, Product / Breadcrumb JSON-LD
  lib/                   Pure, shared, unit-tested logic
    pricing.ts           The one price calculator (discounts, shipping, GST split)
    customization.ts     Validates personalisation input & surcharges
    india.ts             States + GST codes, PIN, mobile, GSTIN checksum
    validation.ts        zod schemas (browser + server)
    settings-schema.ts   Store settings with defaults
    order-status.ts, money.ts, csv.ts, slug.ts, types.ts
  server/                Server-only (never bundled for the browser)
    auth/                customer.ts, admin.ts (roles), crypto.ts (scrypt), tokens.ts
    catalog.ts cart.ts wishlist.ts coupons.ts checkout.ts orders.ts invoice.ts
    payments/razorpay.ts shipping/index.ts shipping/shiprocket.ts notifications.ts
    settings.ts http.ts (CSRF + rate limit wrapper) db.ts env.ts
    admin/               Server actions (every one re-checks the admin + permission)
  components/            Storefront, account, checkout and admin UI
src/app/shop/
  (store)/…              Storefront & account pages (own header/footer)
  admin/(auth)/…         Admin login / forgot / reset / first-time setup
  admin/(panel)/…        Admin dashboard pages
  admin/api/…            Admin upload, CSV export, invoice
  api/…                  Shop JSON API (cart, checkout, payments, account…)
src/proxy.ts             Subdomain rewrite + optimistic auth redirects
```

The existing website pages moved into the `src/app/(site)` route group so they keep their
header/footer while the Shop has its own. **All URLs of the main site are unchanged.**

### Money, stock and payments are server-side and transactional

- Prices are never stored in the cart or accepted from the browser. Every cart view, checkout
  preview and order re-reads live prices and runs `computeTotals()`.
- `shop_place_order()` (PostgreSQL function) locks the variant rows, checks and decrements stock,
  enforces coupon usage limits, and inserts the order, items and first event in **one
  transaction**. An idempotency key makes double-clicks and retries return the same order.
- Online orders hold stock while unpaid. `/shop/api/cron` releases it after the configured window
  (default 45 min), but first asks Razorpay whether a payment succeeded (in case a webhook was missed).
- Payment confirmation: the browser callback's HMAC signature is verified **and** the payment is
  fetched from Razorpay to check status, order id and amount. Webhooks are verified with a separate
  secret and de-duplicated by event id. `shop_mark_order_paid()` is idempotent, so callback +
  webhook can never double-process (one set of emails, one invoice number, one sold-count update).
- GST invoice numbers are consecutive per Indian financial year (`PM/2026-27/00001`).
- Card data never touches our servers (Razorpay Checkout).

### Security

| Concern | Implementation |
| --- | --- |
| Passwords | scrypt (N=16384, r=8, p=1, 16-byte salt), constant-time compare, dummy hash for unknown emails |
| Sessions | Random 256-bit tokens in httpOnly, Secure, SameSite cookies; only SHA-256 hashes stored. Customers 30 days; admins 12 h absolute / 2 h idle, SameSite=Strict, host-only |
| Admin isolation | Separate table, cookie and login. Every admin page, server action and admin API calls `requireAdminPage` / `assertAdmin` with a permission. Role matrix in `src/shop/server/auth/admin.ts`. All admin mutations are audit-logged. |
| Brute force | Per-IP and per-account rate limits; account lockout after 5 failures |
| CSRF | Same-origin check on every mutating API route; Server Actions have Next.js's built-in origin check; SameSite cookies |
| Injection / XSS | Supabase query builder & typed RPC params (no SQL strings), zod validation everywhere, React escaping, emails/invoices HTML-escaped, JSON-LD `<` escaped, CSV formula-injection guard |
| Order privacy | Orders visible only to the owner or via a random per-order key (timing-safe compare) |
| Uploads | Admin-only; type sniffed from file contents; size limits; random file names |
| Database | RLS enabled on every shop table with no public policies; functions executable only by `service_role` |
| Headers | Content-Security-Policy (script/frame/connect allow-lists), HSTS, X-Frame-Options + frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy, COOP |
| URLs | Every stored URL is validated: links must be `https://`, images/models must be in the shop's own storage (blocks `javascript:`/`data:` links); checked again when rendered |
| Cookies | Production names use `__Host-` (admin) and `__Secure-` (customer, cart) prefixes |
| Secrets | Only in environment variables; `server-only` guard breaks the build if server code is imported in the browser |

## 3. Setup

### 3.1 Database (Supabase)

1. Make sure `supabase/schema.sql` (main site) has been run.
2. Run **`supabase/shop-schema.sql`** in Supabase → SQL Editor. It is idempotent (safe to re-run for
   upgrades) and creates tables, indexes, triggers, transactional functions, RLS and the public
   `shop-media` storage bucket.
3. *(Optional, for testing)* run **`supabase/shop-seed.sql`** — sample categories, 8 products with
   variants, collections, banners and **test coupons** (`WELCOME10`, `FLAT100`, `FREESHIP`).
   Archive the sample products and delete the test coupons before launch.

### 3.2 First admin account

1. Set `SHOP_ADMIN_SETUP_TOKEN` to a long random string (`openssl rand -hex 32`).
2. Open `/shop/admin` → you're sent to **/shop/admin/setup** (only while no admin exists).
3. Enter the token, your name, email and password. You become the **owner**.
4. Invite the team from **Admin → Team & roles** (they receive a link to set a password).
5. Optionally remove `SHOP_ADMIN_SETUP_TOKEN` afterwards (setup is disabled anyway once an admin exists).

### 3.3 Payments — Razorpay

1. Create a Razorpay account and complete KYC. In **Test mode** copy the API keys into
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. **Webhooks** → Add: URL `<NEXT_PUBLIC_SHOP_URL>/api/payments/razorpay/webhook`, a secret
   (→ `RAZORPAY_WEBHOOK_SECRET`), events `payment.captured`, `payment.failed`, `order.paid`,
   `refund.processed`, `refund.failed`.
3. Test with Razorpay's test cards / UPI (`success@razorpay`), then switch to live keys and add a
   live-mode webhook.
4. Payment methods (UPI, cards, net banking, wallets) are enabled in the Razorpay dashboard.
   Cash on delivery and its fee/limits are in **Admin → Store settings → Payments**.

> **Cashfree** or another gateway can be added as a second module next to
> `src/shop/server/payments/razorpay.ts` (create order, verify, webhook, refund) — the checkout and
> order logic don't depend on Razorpay specifics beyond those calls.

### 3.4 Shipping

- Default: **manual**. Configure methods, rates, free-shipping thresholds, delivery days, processing
  days and PIN rules in **Admin → Store settings → Shipping**. Add courier + tracking number on the
  order page; tracking links are generated for Delhivery, Blue Dart, DTDC, Xpressbees, Ekart, India Post.
- **Shiprocket** (optional): set `SHIPROCKET_*` variables, create a pickup location with the same
  name, then set **Shipping provider** to `shiprocket` in Admin → Store settings → Shipping — PIN serviceability
  checks use the Shiprocket API and orders get a **Create via Shiprocket** button.

### 3.4a Delhivery (live tracking)

1. In the Delhivery One panel → **Settings → API setup**, copy your API token into `DELHIVERY_API_TOKEN`
   (use a staging token with `DELHIVERY_API_BASE=https://staging-express.delhivery.com` while testing).
2. When you ship an order, open it in **Admin → Orders**, choose courier **Delhivery** (pre-selected when the
   token is set), paste the **AWB / waybill number** and save. Live scans are fetched immediately.
3. From then on the shipment syncs automatically every 15 minutes (the shop cron), whenever the customer
   opens **Refresh** on their order, and instantly if Delhivery's push webhook is enabled (optional:
   ask your Delhivery account manager to push scans to `<NEXT_PUBLIC_SHOP_URL>/api/shipping/delhivery/webhook`
   with header `Authorization: Bearer <DELHIVERY_WEBHOOK_SECRET>`).
4. Orders move on their own: first pickup / in-transit scan → **Shipped** (customer gets the tracking email),
   delivery scan → **Delivered** (delivered email; COD is marked paid and the GST invoice is issued),
   RTO → order flagged for review with a note.

Customers see, in **My orders**, a live line per order (latest scan, location, AWB, expected date) and on the
order page a full tracking panel: progress bar, current status and location, expected delivery, every scan
in a timeline, copy-AWB and a link to Delhivery's tracking page. The same panel appears for admins.

### 3.5 Scheduled job

Every 15 minutes (Hostinger cron / cron-job.org):

```bash
curl -s https://www.3dprintmonk.com/shop/api/cron -H "Authorization: Bearer $CRON_SECRET"
```

It releases stock from unpaid orders (after checking Razorpay), syncs Delhivery tracking, and cleans up expired sessions,
tokens and abandoned guest carts. Keep the existing daily `/api/cron/cleanup-uploads` job too.

### 3.6 Email

Uses the existing `RESEND_API_KEY` / `EMAIL_FROM`. Team alerts go to **Admin → Settings →
Email notifications → Team inboxes** (or `BUSINESS_NOTIFICATION_EMAIL`). The support email set in
the store settings is the reply-to address on customer emails.

## 4. Environment variables (shop)

All documented in `.env.example`. ★ = secret.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SHOP_URL` | yes | Public storefront URL (canonical links, emails, webhooks) |
| `NEXT_PUBLIC_SHOP_BASE_PATH` | yes | `/shop` inside the main site; empty on the subdomain |
| `SHOP_HOST` | subdomain | e.g. `shop.3dprintmonk.com` — enables the host rewrite |
| `SHOP_REDIRECT_MAIN` | no | `true` to 308-redirect `www…/shop/*` to the subdomain |
| `SHOP_COOKIE_DOMAIN` | no | `.3dprintmonk.com` to share customer sign-in across subdomains |
| `SHOP_ADMIN_SETUP_TOKEN` ★ | first run | Unlocks `/shop/admin/setup` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` ★ | online payments | Razorpay API keys |
| `RAZORPAY_WEBHOOK_SECRET` ★ | online payments | Webhook signature secret |
| `DELHIVERY_API_TOKEN` ★ / `DELHIVERY_API_BASE` / `DELHIVERY_WEBHOOK_SECRET` ★ | Delhivery | Live tracking (and optional scan-push webhook) |
| `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD` ★ / `SHIPROCKET_PICKUP_LOCATION` / `SHIPROCKET_PICKUP_PINCODE` | optional | Shiprocket API user |
| Existing: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ★, `RESEND_API_KEY` ★, `EMAIL_FROM`, `BUSINESS_NOTIFICATION_EMAIL`, `IP_HASH_SALT` ★, `CRON_SECRET` ★ | yes | Shared with the main site |

Use separate Supabase projects and Razorpay **test** keys for development/staging, and live keys only
in production.

## 5. Moving to shop.3dprintmonk.com

The same codebase can be deployed a second time for the subdomain (or the one deployment can serve both hosts):

1. DNS: add `shop` → your host (Hostinger: Domains → DNS → CNAME/A).
2. On the **shop deployment** set:
   ```
   NEXT_PUBLIC_SHOP_URL=https://shop.3dprintmonk.com
   NEXT_PUBLIC_SHOP_BASE_PATH=
   SHOP_HOST=shop.3dprintmonk.com
   SHOP_COOKIE_DOMAIN=.3dprintmonk.com   # optional: shared customer login
   ```
3. On the **main site** set `NEXT_PUBLIC_SHOP_URL=https://shop.3dprintmonk.com`,
   `NEXT_PUBLIC_SHOP_BASE_PATH=` and optionally `SHOP_HOST=shop.3dprintmonk.com` +
   `SHOP_REDIRECT_MAIN=true` (old `/shop` links redirect). The header **Shop** button then links to the subdomain.
4. Update the Razorpay webhook URL to `https://shop.3dprintmonk.com/api/payments/razorpay/webhook`
   and the cron URL to `https://shop.3dprintmonk.com/api/cron`.
5. Rebuild (`NEXT_PUBLIC_*` values are baked in at build time).

Admin cookies are always host-only and `SameSite=Strict`; customer cookies are shared only when
`SHOP_COOKIE_DOMAIN` is set. No CORS is needed — the shop's API is same-origin with its pages.

## 6. Testing

```bash
npm test
```

- `src/shop/lib/shop-lib.test.ts` — pricing (inclusive/exclusive GST, CGST/SGST/IGST, coupons, caps,
  free shipping, COD), mobile/GSTIN/state helpers, personalisation, CSV, checkout validation.
- `src/shop/server/server.test.ts` — scrypt hashing, Razorpay checkout & webhook signatures,
  invoice amount-in-words, delivery estimates, role permissions.
- The SQL functions were exercised against PostgreSQL 16 (idempotent checkout, out-of-stock
  rollback, coupon limits, idempotent payment, single invoice number, single stock release,
  negative-stock guard).

**Manual end-to-end checklist (staging with test keys)**: register → verify email → add personalised
item → apply `WELCOME10` → checkout with Razorpay test UPI → confirm emails + invoice → admin: add
tracking, mark shipped/delivered → customer timeline → refund → stock restored. Repeat as guest with COD.

## 7. Third-party services needing keys

| Service | Needed for | Keys / config |
| --- | --- | --- |
| Supabase | Database, product image storage | URL, service-role key (existing) |
| Resend | All shop emails | API key, verified domain (existing) |
| Razorpay | UPI / cards / net banking / wallets, refunds | Key id, key secret, webhook secret |
| Delhivery | Live shipment tracking | API token (+ optional webhook secret) |
| Shiprocket *(optional)* | Courier serviceability, AWB generation | API user email/password, pickup location |
| Cron runner | Releasing unpaid stock, clean-up | `CRON_SECRET` (existing) |

## 8. Known limitations / next steps

- Supabase JS has no client-side transactions, so multi-step admin edits (product + images + variants)
  are applied step by step; failures are reported and safe to retry. All customer-facing money and stock
  operations run inside the PostgreSQL functions.
- Invoices are HTML (print / save as PDF from the browser). A server-side PDF renderer can be added later.
- The in-memory rate limiter is per process (fine for a single Hostinger Node app; use Redis/Upstash if you scale out).
- Delhivery is used for tracking; AWBs are created in the Delhivery panel and pasted into the order (automatic AWB/manifest creation through Delhivery's API can be added next).
- Shiprocket tracking webhooks are not wired yet.
- Email verification links are single-use; some corporate mail scanners pre-open links — customers can resend from their account.
