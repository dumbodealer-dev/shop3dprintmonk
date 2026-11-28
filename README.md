# 3D PRINTMONK — Website

Custom-coded website for **3D PRINTMONK**, a 3D printing service in Delhi (FDM, SLA resin, bulk production, 3D design and finishing) serving Delhi NCR and all of India.

The main job of the site is to turn visitors into **qualified quote requests**. The core feature is a multi-step quote form with secure file upload.

> **🛒 Shop (ecommerce):** a full online store — catalogue, cart, checkout with Razorpay/COD and GST invoices, customer accounts and a role-based admin dashboard — lives at **`/shop`** and is ready to move to **shop.3dprintmonk.com**. Setup, architecture, environment variables and deployment: **[docs/SHOP.md](docs/SHOP.md)**.

---

## Contents

1. [What's included](#whats-included)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Quick start (local)](#quick-start-local)
5. [External services you need to set up](#external-services-you-need-to-set-up)
6. [Environment variables](#environment-variables)
7. [Editing content (no developer needed)](#editing-content)
8. [How the quote system works](#how-the-quote-system-works)
9. [Deployment on Hostinger](#deployment-on-hostinger)
10. [Go-live checklist](#go-live-checklist)
11. [Analytics events](#analytics-events)
12. [Security notes](#security-notes)
13. [Future development](#future-development)
14. [Testing](#testing)

---

## What's included

| Area | Details |
| --- | --- |
| Pages | Home, Services index + 5 service pages, Materials library + a page per material, Industries, Our Work (portfolio), About, Contact, FAQ, Get a Quote (+ thank-you page), Knowledge hub (blog), Privacy Policy, Terms, custom 404 |
| Instant estimate | STL, OBJ and 3MF files are opened in the browser and shown as an **interactive 3D model** (rotate, zoom, wireframe view). Each file is measured for volume, size and whether the mesh is closed, and a **preliminary price range in ₹** is calculated from per-gram rates for the chosen material. Complex, oversized, painted, STEP-based or bulk orders automatically switch to a **manual quote**. Rates and rules are in `src/config/pricing.ts`. |
| 3D design | Hero "live print" scene (three.js, loaded after the page is idle, with a static illustration as fallback), CSS 3D floating shapes, 3D tilt on service cards. Animations stop when the visitor prefers reduced motion. |
| Quote system | 4-step form (details → project → files → review). Accepts STL, OBJ, 3MF, STEP and STP files, plus JPG, PNG, WebP and PDF references when design help is requested. Shows upload progress. Files are checked on the server, stored privately, and the enquiry gets a reference number like `PM-261126-7KQ4X`. Emails go to the team and the customer. |
| Variants | General quote, **bulk** (`/get-a-quote?type=bulk`), and a dedicated **design enquiry** form on the Custom 3D Design page |
| WhatsApp | Click-to-chat with a message that matches the page, on service pages, the quote page, the contact page, the thank-you page, the footer and a floating button |
| Editable content | Materials and portfolio live in Supabase tables and can be edited without changing code. Built-in defaults are used until the database is connected. |
| SEO | A unique title, description, canonical URL, and Open Graph/Twitter tags on every page; `sitemap.xml`; `robots.txt`; breadcrumbs; JSON-LD (Organization or LocalBusiness, Service, BreadcrumbList, FAQPage, Article); a generated social share image |
| Analytics | GA4 loads only after cookie consent. It tracks quote, WhatsApp, phone, email, upload and service events, and never sends personal data. |
| Honesty rules | There are no invented stats, reviews, prices, machine specs or photos. Any unconfirmed value is `null`, which **hides** it on the site. A yellow *Setup required* banner lists what is still missing. |

## Tech stack

- **Next.js 16** (App Router, server components, route handlers), **React 19**, **TypeScript**
- **Tailwind CSS 4**, with self-hosted Manrope and JetBrains Mono fonts and `lucide-react` icons
- **Supabase**: PostgreSQL database plus private Storage for customer files
- **Resend**: transactional email, called through its REST API
- **zod**: validation shared by the browser and the server
- **Vitest**: unit tests

## Project structure

```
src/
  app/                       Routes (each folder = a URL)
    (site)/                  Main website pages (route group: shares the site header/footer; URLs unchanged)
    shop/                    Ecommerce store, accounts, admin & shop API (see docs/SHOP.md)
    page.tsx                 Homepage (in (site)/)
    services/…               Service pages
    materials/[slug]/        Material detail pages
    get-a-quote/             Quote form + thank-you page
    api/uploads/             Issues signed upload URLs (private bucket)
    api/quote/               Validates, verifies files, stores enquiry, sends emails
    api/contact/             Contact form
    api/revalidate/          Refresh cached materials/portfolio after DB edits
    api/cron/cleanup-uploads Deletes abandoned uploads (>24h)
    sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg
  components/
    layout/                  Header, mobile nav, footer, floating WhatsApp, setup banner
    forms/                   QuoteForm (wizard), FileUploader, ContactForm, field components
    home/, services/, materials/, portfolio/, ui/
  config/
    business.ts   ← ALL business details (phone, WhatsApp, address, hours, stats, policies)
    media.ts      ← Real photo slots (hero, about, before/after)
    navigation.ts
  content/                   Default content: materials, services, industries, FAQ, blog, portfolio
  lib/                       Server & shared logic (env, supabase, email, files, validation, seo, analytics…)
  shop/                      Ecommerce logic, server modules and components (see docs/SHOP.md)
  proxy.ts                   Shop subdomain rewrite + auth redirects
supabase/
  schema.sql                 Tables, enums, triggers, RLS, storage buckets
  seed.sql                   Materials library seed (generated: npm run db:seed-sql)
  shop-schema.sql            Shop tables, transactional functions, RLS, storage (run after schema.sql)
  shop-seed.sql              Sample shop catalogue & test coupons (development only)
scripts/generate-seed.mts
```

## Quick start (local)

Requirements: **Node.js 20.9+** (22 LTS recommended; see `.nvmrc`).

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open http://localhost:3000. The whole site works without any accounts. The quote and contact forms show a clear *not configured* notice and stay disabled until Supabase is set up.

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (file-type checks, reference numbers) |
| `npm run db:seed-sql` | Regenerate `supabase/seed.sql` from `src/content/materials.ts` |

## External services you need to set up

| Service | Needed for | Cost to start | What you'll get |
| --- | --- | --- | --- |
| **Supabase** (supabase.com) | Saving enquiries, private file storage, editable materials and portfolio | Free tier available | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Resend** (resend.com) | Notification and confirmation emails | Free tier available | `RESEND_API_KEY`, plus DNS records to verify `3dprintmonk.com` |
| **Hostinger** | Hosting the Node.js app plus the domain | Your existing plan (see [Deployment](#deployment-on-hostinger)) | — |
| Google Analytics 4 *(optional)* | Traffic and conversion tracking | Free | `NEXT_PUBLIC_GA_ID` |
| Google Search Console *(recommended)* | Indexing and search performance | Free | `NEXT_PUBLIC_GSC_VERIFICATION` |
| Google Business Profile *(recommended)* | Local search / Maps | Free | Use the same verified address as `business.ts` |
| A cron service *(recommended)* | Daily cleanup of abandoned uploads | Hostinger cron or cron-job.org (free) | Uses `CRON_SECRET` |

### 1. Supabase

1. Create a project and pick a region close to India, such as Mumbai (`ap-south-1`).
2. Open **SQL Editor**, paste and run `supabase/schema.sql`. It also grants the server key access to the tables; if you see error **42501** (permission denied), re-run it. This creates the tables, row-level security, and two buckets:
   - `quote-uploads`, which is **private** and holds customer files
   - `portfolio`, which is **public** and holds published project photos
3. Run `supabase/seed.sql` to load the materials library.
4. In **Project Settings → API**, copy the Project URL and the `service_role` key into your environment variables.
5. **Large 3D files:** the site accepts files up to 5 GB, but Supabase's **Free plan caps uploads at 50 MB per file**. To accept heavy files, use the Pro plan and raise **Storage → Settings → Upload file size limit** (for example to 5 GB). Until then, larger uploads fail with a clear message asking the customer to paste a Google Drive or WeTransfer link in the notes instead. Models over 250 MB upload in full but skip the in-browser 3D preview and go to a manual quote.

### 2. Resend

1. Add the domain `3dprintmonk.com` and add the DNS records Resend shows (SPF/DKIM) in **Hostinger → Domains → DNS Zone**.
2. Create an API key and set `RESEND_API_KEY`, `EMAIL_FROM` (for example `3D PRINTMONK <quotes@3dprintmonk.com>`) and `BUSINESS_NOTIFICATION_EMAIL`.

> **Enquiries are never lost because of email.** The database record is saved first, and emails are sent afterwards. The result is stored in `email_business_status` and `email_customer_status` on each enquiry, and any failure is logged.

## Environment variables

All variables are documented in [`.env.example`](.env.example). Secrets are read only on the server, and the `server-only` package makes the build fail if a secret module is ever imported into browser code.

| Variable | Required | Secret | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | no | `https://www.3dprintmonk.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | for forms | no | |
| `SUPABASE_SERVICE_ROLE_KEY` | for forms | **yes** | Never expose it to the browser |
| `SUPABASE_QUOTE_BUCKET` | no | no | Default `quote-uploads` |
| `UPLOAD_MAX_FILE_MB` / `UPLOAD_MAX_FILES` | no | no | Defaults 5120 (5 GB) / 25. Supabase must allow the size too (see below). |
| `DOWNLOAD_LINK_DAYS` | no | no | Default 7 |
| `RESEND_API_KEY` | for email | **yes** | |
| `EMAIL_FROM` / `BUSINESS_NOTIFICATION_EMAIL` | for email | no | |
| `IP_HASH_SALT` | yes | **yes** | Random string |
| `REVALIDATE_SECRET` / `CRON_SECRET` | recommended | **yes** | Random strings |
| `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GSC_VERIFICATION` | optional | no | |
| `SHOW_SETUP_BANNER` | no | no | Set `false` to hide the reminder banner |

To generate a random secret:

```bash
openssl rand -hex 32
```

## Editing content

### Business details: `src/config/business.ts`

This one file holds the phone, WhatsApp, email, Instagram, address, map links, hours, verified stats, machine capabilities and commercial policies (GST, purchase orders, NDA). **Anything left as `null` is hidden.** Search the project for `CONFIRM` to find every item that needs confirming.

- Set `address.verified: true` only once the address matches company records. This switches the structured data from `Organization` to `LocalBusiness`.
- Fill in `stats` only with verified numbers. The stats band appears automatically.
- Setting `contact.whatsapp` turns on every WhatsApp button across the site.

### Photos: `src/config/media.ts` and `public/images/`

1. Export real photos as WebP or AVIF, around 2000 px wide for the hero and 1600 px elsewhere.
2. Put the files in `public/images/`.
3. Set their paths in `media.ts`. You can also set `image` in `src/content/services.ts` for each service card.

Until a photo is added, the site shows a technical line illustration. It never shows stock photos.

### Instant-estimate pricing: `src/config/pricing.ts`

| Setting | Default | Meaning |
| --- | --- | --- |
| `materialPricing` | PLA ₹8/g, PETG ₹10/g, ABS ₹12/g, ASA ₹14/g, TPU ₹18/g, Nylon ₹30/g, CF ₹35/g; resins ₹18–45/g | Mid-range Indian market rates for print services in late 2026. Adjust to your own pricing. |
| `minimumCharge` | ₹300 | Minimum printing charge per order. If the weight-based cost is lower (e.g. ₹10 or ₹200), ₹300 is charged; above that, the actual cost applies. |
| `finishing` multipliers | sanding ×1.25, priming ×1.2, coating ×1.15 | Painting and assembly always go to a manual quote |
| `quantityDiscounts` | 5+ → 5%, 10+ → 10% | Per part line |
| Manual-quote triggers | more than 20 pieces per part, more than 50 pieces total, over ₹25,000, STEP/reference files, design help, bulk enquiries | **No part-size limit**: large parts always get an estimate, and the site never mentions build-plate limits. |

You can also set a rate per material without touching code: fill `rate_per_gram_inr` (and optionally `density_g_cm3`) in the Supabase `materials` table.

How the weight is estimated:
- **FDM model:** shell (surface area × 0.8 mm) plus 20% infill of the remaining volume, × density × 1.05 for waste.
- **SLA model:** solid volume (large parts are assumed hollowed with a 2.5 mm wall), × density × 1.05.
- **Supports:** the browser finds downward-facing overhangs in the file's orientation (steeper than 45° for FDM, 30° for resin) and measures the space between each overhang and the build plate. 15% of that space is counted for FDM supports and 8% for resin supports, plus a 5% raft for resin. Supports are included in the grams and price the customer sees, but are not listed separately on the website or in the customer email. The team notification email includes the support breakdown. Tune these with `supportFill` and `raftFactor` in `src/config/pricing.ts`.

The browser-computed estimate is stored with each enquiry (`quote_mode`, `estimate_min_inr`, `estimate_max_inr`, `estimate_details`) for reference only. The final price is always confirmed by the team.

### Materials (no code change needed)

1. Open **Supabase → Table Editor → `materials`**.
2. Edit availability (`in_stock` / `on_request` / `unavailable`), colours, properties, `price_note` (INR wording) or `is_published`.
3. Changes appear within 5 minutes. To refresh immediately:

```bash
curl -X POST https://www.3dprintmonk.com/api/revalidate -H "Authorization: Bearer YOUR_REVALIDATE_SECRET"
```

### Portfolio (no code change needed)

1. Upload photos to **Storage → `portfolio`** and copy each public URL.
2. Add a row in **`portfolio_projects`** with:
   - title, description, categories (from: Engineering, Miniatures, Functional Parts, Corporate Projects, Decorative Models, Resin Prints, Bulk Orders)
   - technology (`fdm`, `sla` or `fdm_sla`), material, quantity, finishing and intended use
   - `images` as JSON: `[{"src":"https://…/portfolio/x.webp","alt":"…","width":1600,"height":1200}]`
3. Set `is_featured` to show the project on the homepage, and `is_published = true` to show it on the site. Only publish client work with the client's approval.

Projects without photos are never shown. Until projects exist, an honest "gallery coming soon" state is displayed.

You can also add projects in code in `src/content/portfolio.ts`.

### FAQ, blog, services, industries

These live in `src/content/*.ts`. To add a blog post, append it to `posts` in `src/content/blog.ts`. The blog index, the post page, the sitemap and the structured data update automatically.

## How the quote system works

```
Browser                              Server (Next.js)                      Supabase
───────                              ────────────────                      ────────
1. Pick files ──► client check (ext/size/count)
2. POST /api/uploads ──────────────► validate, rate-limit ──────────────► createSignedUploadUrl
   ◄─────────────── signed URL (short-lived) ◄──────────────────────────
3. PUT file (progress bar) ─────────────────────────────────────────────► private bucket: pending/<session>/…
4. POST /api/quote ────────────────► zod validation, honeypot, timing,
                                     rate limits (memory + DB per IP hash)
                                     for each file: read first 4 KB ─────► signed URL (60 s)
                                       check magic bytes vs extension
                                       (binary STL size math, STEP header, ZIP for 3MF…)
                                     insert enquiry (unique reference) ──► enquiries
                                     move files → enquiries/<REF>/ ──────► storage + enquiry_files
   ◄──── { reference } ──────────── respond immediately
                                     after(): signed download links (7 days)
                                              email team + customer (Resend)
                                              record email status ───────► enquiries
5. Thank-you page with reference + WhatsApp follow-up
```

**Reviewing enquiries.** Use the team notification email, which includes private download links, or open **Supabase → Table Editor → `enquiries`**. Files are under **Storage → `quote-uploads` → `enquiries/<REFERENCE>/`**. Change `status` to track progress (`received` → `quotation_sent` → … → `delivered`). Every status change is logged in `enquiry_events`, ready for future customer order tracking.

**Cleanup.** Files that are uploaded but never submitted stay in `pending/`. Schedule this command once a day (Hostinger → Advanced → Cron Jobs, or cron-job.org):

```bash
curl -s https://www.3dprintmonk.com/api/cron/cleanup-uploads -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Deployment on Hostinger

This is a **Node.js application**: the quote form, uploads and emails need a server. It cannot be uploaded as static files to regular shared web hosting. Use one of these:

### Option A: Hostinger Node.js Web App (Business / Cloud plans)

1. Push this project to a GitHub repository.
2. In **hPanel → Websites → Add website → Node.js Web App**, connect the GitHub repository. You can upload a ZIP instead.
3. Use these settings:
   - Framework: **Next.js**
   - Node version: **22.x** (or 20.x)
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Start command: `npm start`
4. Add every variable from `.env.example` under **Environment variables**.
5. Attach the domain `3dprintmonk.com` (and `www`) and enable the free SSL certificate.
6. Deploy. Later pushes to the main branch redeploy automatically if auto-deploy is enabled.

> If your current Hostinger plan doesn't list *Node.js Web App*, upgrade to a plan that does, or use a VPS (Option B). Hostinger's menus change over time, so check their current docs for "Deploy Next.js".

### Option B: Hostinger VPS (Ubuntu)

Install Node.js and PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs nginx
```

```bash
sudo npm install -g pm2
```

Build and start the app:

```bash
git clone <your-repo-url> /var/www/3dprintmonk && cd /var/www/3dprintmonk && npm ci
```

Create `/var/www/3dprintmonk/.env.production` with the production values, then:

```bash
npm run build && pm2 start npm --name 3dprintmonk -- start && pm2 save && pm2 startup
```

Point Nginx at the app. Use a server block for `3dprintmonk.com` and `www.3dprintmonk.com` that proxies to `http://127.0.0.1:3000`, sets `client_max_body_size 1m` (uploads go directly to Supabase, not through Nginx), and forwards the `Host`, `X-Forwarded-For` and `X-Forwarded-Proto` headers. Then enable HTTPS:

```bash
sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d 3dprintmonk.com -d www.3dprintmonk.com
```

To update the site later:

```bash
cd /var/www/3dprintmonk && git pull && npm ci && npm run build && pm2 restart 3dprintmonk
```

### Domain and DNS

- In **Hostinger → Domains → DNS Zone**, point `@` and `www` to the app or VPS, following hPanel's instructions for a Node.js app or the VPS IP.
- Make one hostname canonical. The site uses `https://www.3dprintmonk.com` (`NEXT_PUBLIC_SITE_URL`), so redirect the bare domain to `www`.
- Add the Resend DNS records for email sending.

## Go-live checklist

Business information (`src/config/business.ts`):

- [x] Phone, WhatsApp, Instagram, address (Sultanpur, New Delhi 110030), 24×7 hours: filled in
- [ ] Public email: entered as `contact@3dprintmonk.com` (the owner provided "contact@3dprintmonk"; confirm the domain)
- [ ] Registered business name (`legalName`), exact Google Maps listing link (currently an address search), walk-in policy
- [ ] Verified stats only (or leave empty)
- [ ] Layer heights if you want them published (build volumes are intentionally never shown)
- [ ] Policies: GST invoices and GSTIN, purchase orders, NDA

Content:

- [x] Official logo added (`/public/brand/`: transparent full logo, mark and favicon)
- [ ] Per-gram rates in `src/config/pricing.ts` reviewed
- [ ] Real photos: hero, service cards, About page, finishing before/after
- [ ] Portfolio projects, published only with client approval
- [ ] Materials availability and colours confirmed in Supabase (they currently show "Confirm with quote")
- [ ] FAQ answers marked `needsConfirmation` in `src/content/faq.ts` reviewed (materials, lead times, GST, NDA)
- [ ] Commitments reviewed: confidentiality wording on the Bulk page, quality approach on the About page
- [ ] Privacy Policy and Terms reviewed by a professional; payment, refund and shipping terms added

Services and launch:

- [ ] Supabase schema and seed run; env vars set
- [ ] Resend domain verified; test quote received by the team and the customer
- [ ] Daily cleanup cron scheduled
- [ ] GA4 and Search Console configured; `sitemap.xml` submitted
- [ ] Google Business Profile matches the website details
- [ ] `SHOW_SETUP_BANNER` left on until the banner disappears by itself

## Analytics events

Analytics only runs after the visitor accepts the cookie notice. Parameters are allow-listed in `src/lib/analytics.ts`, and names, emails, phones, file names and file contents are never sent.

| Event | When |
| --- | --- |
| `quote_submit`, `design_enquiry_submit`, `contact_submit` | A form is submitted successfully |
| `quote_step` | The visitor moves to the next step of the quote form |
| `file_upload_complete` | A file finishes uploading |
| `whatsapp_click`, `phone_click`, `email_click` | Any WhatsApp, `tel:` or `mailto:` link is clicked |
| `cta_get_quote` | A *Get a Quote* button is clicked (with its location) |
| `service_engagement` | A service card is clicked through |

In GA4, mark `quote_submit` and `design_enquiry_submit` as **key events** (conversions).

## Security notes

- Every table has row-level security **enabled with no public policies**. Only the server, using the service-role key, can read or write.
- Customer files live in a **private** bucket. The browser gets single-use signed upload URLs, and the team gets time-limited signed download links. Public URLs are never generated for them.
- Server-side checks cover file extension, size and count, the upload-session path, and **actual file content** (magic bytes), and rejected files are deleted.
- Spam controls: a honeypot field, a minimum time to fill in the form, a per-IP in-memory rate limit, and a per-IP-hash hourly limit in the database. Raw IP addresses are never stored.
- Requests from other origins are rejected, JSON bodies are size-capped, and security headers (HSTS, nosniff, frame options, referrer policy, permissions policy) are set in `next.config.ts`.

## Future development

The code is structured so these can be added without restructuring:

| Feature | Where it plugs in |
| --- | --- |
| **Instant quote calculator** | Add `src/lib/quote-engine/`: mesh parsing (volume, bounding box, manifold checks), printer profiles, material price tables and slicing-based time estimates. Show the result as a *preliminary estimate* with a "request manual review" step that submits through the existing `/api/quote`. Never present a simple volume-based estimate as a final price. |
| **Customer accounts** | Supabase Auth. `enquiries.customer_id` is already reserved. Add RLS policies such as `customer_id = auth.uid()` for read access. |
| **Order tracking** | The `enquiry_status` enum already covers every stage (received → … → delivered), and `enquiry_events` logs a timeline automatically. |
| **Payments** | Razorpay for Indian customers. Create orders server-side from an approved `quoted_amount_inr` and verify the payment signature in a webhook route. Add Stripe only if there's a confirmed need. |
| **Internal dashboard** | A protected `/admin` area using Supabase Auth with a staff role, listing enquiries, files (signed links) and status updates. |
| **Blog** | Already in place in `src/content/blog.ts`. Can move to MDX or a headless CMS later. |

## Testing

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

The full quote flow was tested end to end against a local mock of the Supabase and Resend APIs. The test covered signed upload, progress, a disguised file rejected by the server, enquiry storage, file moves and both emails. **After connecting real accounts, submit one test enquiry with an STL file** and confirm the database row, the stored file and both emails.
