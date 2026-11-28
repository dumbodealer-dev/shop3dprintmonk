-- ─────────────────────────────────────────────────────────────────────────────
-- 3D PRINTMONK SHOP — ecommerce schema (PostgreSQL / Supabase)
-- Run AFTER supabase/schema.sql, in Supabase → SQL Editor. Safe to re-run.
--
-- Security model: RLS is enabled on every table with NO public policies, so the
-- browser can never read or write these tables directly. All access goes through
-- the Next.js server using the service-role key, which enforces authentication,
-- authorisation and business rules. Money, stock and coupon usage are changed only
-- inside the transactional functions at the bottom of this file.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

do $$ begin
  create type shop_order_status as enum (
    'pending_payment', 'payment_confirmed', 'processing', 'ready_for_shipment',
    'shipped', 'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type shop_payment_status as enum ('pending', 'cod_pending', 'paid', 'failed', 'refunded', 'partially_refunded');
exception when duplicate_object then null; end $$;

-- ── Customers & authentication ──────────────────────────────────────────────
create table if not exists public.shop_customers (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null,
  password_hash          text not null,
  full_name              text not null,
  phone                  text,
  email_verified_at      timestamptz,
  status                 text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  marketing_opt_in       boolean not null default false,
  failed_logins          integer not null default 0,
  locked_until           timestamptz,
  last_login_at          timestamptz,
  deletion_requested_at  timestamptz,
  deletion_reason        text,
  admin_notes            text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create unique index if not exists shop_customers_email_key on public.shop_customers (lower(email));
create index if not exists shop_customers_created_idx on public.shop_customers (created_at desc);

create table if not exists public.shop_customer_sessions (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.shop_customers (id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  user_agent   text,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists shop_customer_sessions_customer_idx on public.shop_customer_sessions (customer_id);

create table if not exists public.shop_admins (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  password_hash  text not null,
  full_name      text not null,
  role           text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  status         text not null default 'active' check (status in ('active', 'disabled')),
  failed_logins  integer not null default 0,
  locked_until   timestamptz,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists shop_admins_email_key on public.shop_admins (lower(email));

create table if not exists public.shop_admin_sessions (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references public.shop_admins (id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  user_agent   text,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists shop_admin_sessions_admin_idx on public.shop_admin_sessions (admin_id);

-- One-time tokens (email verification, password reset) for customers and admins. Only hashes are stored.
create table if not exists public.shop_auth_tokens (
  id            uuid primary key default gen_random_uuid(),
  subject_type  text not null check (subject_type in ('customer', 'admin')),
  subject_id    uuid not null,
  purpose       text not null check (purpose in ('verify_email', 'reset_password')),
  token_hash    text not null unique,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists shop_auth_tokens_subject_idx on public.shop_auth_tokens (subject_type, subject_id, purpose);

create table if not exists public.shop_admin_audit (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.shop_admins (id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists shop_admin_audit_created_idx on public.shop_admin_audit (created_at desc);

create table if not exists public.shop_addresses (
  id                   uuid primary key default gen_random_uuid(),
  customer_id          uuid not null references public.shop_customers (id) on delete cascade,
  label                text,
  full_name            text not null,
  phone                text not null,
  line1                text not null,
  line2                text,
  landmark             text,
  city                 text not null,
  state                text not null,
  pincode              text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  country              text not null default 'IN',
  is_default_shipping  boolean not null default false,
  is_default_billing   boolean not null default false,
  created_at           timestamptz not null default now()
);
create index if not exists shop_addresses_customer_idx on public.shop_addresses (customer_id);

-- ── Catalogue ───────────────────────────────────────────────────────────────
-- array_to_string is only STABLE; tags are text[] so this wrapper is safe to mark IMMUTABLE for the search column.
create or replace function public.shop_tags_text(text[]) returns text language sql immutable parallel safe as $$ select array_to_string($1, ' ') $$;

create table if not exists public.shop_categories (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid references public.shop_categories (id) on delete set null,
  slug         text not null unique,
  name         text not null,
  description  text,
  image_url    text,
  sort_order   integer not null default 100,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists shop_categories_parent_idx on public.shop_categories (parent_id);

create table if not exists public.shop_products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  short_description  text,
  description        text,
  category_id        uuid references public.shop_categories (id) on delete set null,
  status             text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  publish_at         timestamptz,                         -- scheduled publishing
  print_technology   text check (print_technology in ('fdm', 'sla', 'fdm_sla', 'other')),
  material           text,
  finish             text,
  colors             text[] not null default '{}',
  length_mm          numeric(10, 2),
  width_mm           numeric(10, 2),
  height_mm          numeric(10, 2),
  weight_g           numeric(10, 2),
  hsn_code           text,
  gst_rate           numeric(5, 2) not null default 18 check (gst_rate >= 0 and gst_rate <= 28),
  specifications     jsonb not null default '[]'::jsonb,  -- [{ "label": "Layer height", "value": "0.2 mm" }]
  customization      jsonb not null default '[]'::jsonb,  -- options, see src/shop/lib/types.ts
  lead_time_days     integer not null default 0 check (lead_time_days >= 0),
  is_featured        boolean not null default false,
  is_bestseller      boolean not null default false,
  is_new             boolean not null default false,
  tags               text[] not null default '{}',
  model_url          text,                                 -- optional STL/OBJ/3MF for the 3D preview
  seo_title          text,
  seo_description    text,
  sold_count         integer not null default 0,
  rating_avg         numeric(3, 2) not null default 0,
  rating_count       integer not null default 0,
  search             tsvector generated always as (
                       setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
                       setweight(to_tsvector('simple', coalesce(public.shop_tags_text(tags), '')), 'B') ||
                       setweight(to_tsvector('simple', coalesce(material, '') || ' ' || coalesce(short_description, '')), 'C') ||
                       setweight(to_tsvector('simple', coalesce(description, '')), 'D')
                     ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists shop_products_status_idx on public.shop_products (status, publish_at);
create index if not exists shop_products_category_idx on public.shop_products (category_id);
create index if not exists shop_products_search_idx on public.shop_products using gin (search);
create index if not exists shop_products_created_idx on public.shop_products (created_at desc);

create table if not exists public.shop_product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.shop_products (id) on delete cascade,
  url           text not null,
  storage_path  text,
  alt           text,
  width         integer,
  height        integer,
  sort_order    integer not null default 0,          -- 0 = thumbnail / main image
  created_at    timestamptz not null default now()
);
create index if not exists shop_product_images_product_idx on public.shop_product_images (product_id, sort_order);

-- Every product has at least one variant; price & stock live here.
create table if not exists public.shop_variants (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.shop_products (id) on delete cascade,
  sku                  text not null,
  title                text not null default 'Default',
  options              jsonb not null default '{}'::jsonb,   -- { "Size": "M", "Color": "Orange" }
  price                numeric(12, 2) not null check (price >= 0),
  sale_price           numeric(12, 2) check (sale_price is null or sale_price >= 0),
  compare_at_price     numeric(12, 2),
  stock                integer not null default 0 check (stock >= 0),
  track_inventory      boolean not null default true,
  low_stock_threshold  integer not null default 5,
  weight_g             numeric(10, 2),
  is_active            boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists shop_variants_sku_key on public.shop_variants (upper(sku));
create index if not exists shop_variants_product_idx on public.shop_variants (product_id, sort_order);

create table if not exists public.shop_inventory_movements (
  id           uuid primary key default gen_random_uuid(),
  variant_id   uuid not null references public.shop_variants (id) on delete cascade,
  delta        integer not null,
  stock_after  integer not null,
  reason       text not null check (reason in ('order', 'cancellation', 'refund', 'payment_expired', 'adjustment', 'restock', 'import', 'initial')),
  order_id     uuid,
  admin_id     uuid references public.shop_admins (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists shop_inventory_movements_variant_idx on public.shop_inventory_movements (variant_id, created_at desc);

create table if not exists public.shop_collections (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  image_url    text,
  is_featured  boolean not null default true,
  is_seasonal  boolean not null default false,
  is_active    boolean not null default true,
  starts_at    timestamptz,
  ends_at      timestamptz,
  sort_order   integer not null default 100,
  created_at   timestamptz not null default now()
);

create table if not exists public.shop_collection_products (
  collection_id  uuid not null references public.shop_collections (id) on delete cascade,
  product_id     uuid not null references public.shop_products (id) on delete cascade,
  sort_order     integer not null default 0,
  primary key (collection_id, product_id)
);

-- Homepage hero slides and promotional banners (managed in /admin/content).
create table if not exists public.shop_banners (
  id          uuid primary key default gen_random_uuid(),
  placement   text not null default 'hero' check (placement in ('hero', 'promo', 'strip')),
  title       text not null,
  subtitle    text,
  cta_label   text,
  cta_url     text,
  image_url   text,
  theme       text not null default 'dark' check (theme in ('dark', 'light', 'accent')),
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.shop_reviews (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.shop_products (id) on delete cascade,
  customer_id        uuid references public.shop_customers (id) on delete set null,
  author_name        text not null,
  rating             smallint not null check (rating between 1 and 5),
  title              text,
  body               text,
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified_purchase  boolean not null default false,
  created_at         timestamptz not null default now()
);
create unique index if not exists shop_reviews_one_per_customer on public.shop_reviews (product_id, customer_id);
create index if not exists shop_reviews_product_idx on public.shop_reviews (product_id, status, created_at desc);

-- ── Carts & wishlists ───────────────────────────────────────────────────────
-- owner_key: 'c:<customer uuid>' for signed-in customers, 'g:<sha256 of guest cookie>' for guests.
create table if not exists public.shop_carts (
  id           uuid primary key default gen_random_uuid(),
  owner_key    text not null unique,
  coupon_code  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists shop_carts_updated_idx on public.shop_carts (updated_at);

create table if not exists public.shop_cart_items (
  id                 uuid primary key default gen_random_uuid(),
  cart_id            uuid not null references public.shop_carts (id) on delete cascade,
  variant_id         uuid not null references public.shop_variants (id) on delete cascade,
  quantity           integer not null check (quantity > 0 and quantity <= 999),
  customization      jsonb not null default '{}'::jsonb,
  customization_key  text not null default '',
  saved_for_later    boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (cart_id, variant_id, customization_key)
);

create table if not exists public.shop_wishlist_items (
  owner_key   text not null,
  product_id  uuid not null references public.shop_products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (owner_key, product_id)
);

-- ── Promotions ──────────────────────────────────────────────────────────────
create table if not exists public.shop_coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null,
  description         text,
  type                text not null check (type in ('percent', 'fixed', 'free_shipping')),
  value               numeric(12, 2) not null default 0 check (value >= 0),
  max_discount        numeric(12, 2),
  min_order_value     numeric(12, 2) not null default 0,
  applies_to          text not null default 'all' check (applies_to in ('all', 'products', 'categories')),
  product_ids         uuid[] not null default '{}',
  category_ids        uuid[] not null default '{}',
  starts_at           timestamptz,
  ends_at             timestamptz,
  usage_limit         integer,
  per_customer_limit  integer,
  first_order_only    boolean not null default false,
  free_shipping       boolean not null default false,   -- percent/fixed coupons can also waive shipping
  is_active           boolean not null default true,
  used_count          integer not null default 0,
  created_at          timestamptz not null default now(),
  constraint shop_coupons_percent check (type <> 'percent' or value <= 100)
);
create unique index if not exists shop_coupons_code_key on public.shop_coupons (upper(code));

-- ── Orders ──────────────────────────────────────────────────────────────────
create table if not exists public.shop_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  idempotency_key     text unique,
  access_key          text not null,                       -- secret for guest order links
  owner_key           text,                                -- cart to clear once paid
  customer_id         uuid references public.shop_customers (id) on delete set null,
  email               text not null,
  phone               text not null,
  customer_name       text not null,
  status              shop_order_status not null default 'pending_payment',
  payment_status      shop_payment_status not null default 'pending',
  payment_method      text not null check (payment_method in ('razorpay', 'cod')),
  shipping_address    jsonb not null,
  billing_address     jsonb not null,
  gstin               text,
  business_name       text,
  shipping_method     text not null,
  shipping_method_label text,
  estimated_delivery_from date,
  estimated_delivery_to   date,
  subtotal            numeric(12, 2) not null,
  discount_total      numeric(12, 2) not null default 0,
  shipping_total      numeric(12, 2) not null default 0,
  cod_fee             numeric(12, 2) not null default 0,
  tax_total           numeric(12, 2) not null default 0,
  grand_total         numeric(12, 2) not null check (grand_total >= 0),
  prices_include_tax  boolean not null default true,
  tax_breakdown       jsonb not null default '{}'::jsonb,  -- { type: 'intra'|'inter', cgst, sgst, igst, lines… }
  coupon_id           uuid references public.shop_coupons (id) on delete set null,
  coupon_code         text,
  notes               text,
  invoice_number      text unique,
  invoice_date        timestamptz,
  stock_released      boolean not null default false,
  needs_review        boolean not null default false,
  ip_hash             text,
  paid_at             timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists shop_orders_created_idx on public.shop_orders (created_at desc);
create index if not exists shop_orders_customer_idx on public.shop_orders (customer_id, created_at desc);
create index if not exists shop_orders_status_idx on public.shop_orders (status, created_at desc);
create index if not exists shop_orders_payment_idx on public.shop_orders (payment_status, created_at desc);
create index if not exists shop_orders_email_idx on public.shop_orders (lower(email));

create table if not exists public.shop_order_items (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.shop_orders (id) on delete cascade,
  product_id           uuid references public.shop_products (id) on delete set null,
  variant_id           uuid references public.shop_variants (id) on delete set null,
  product_name         text not null,
  variant_title        text,
  sku                  text,
  image_url            text,
  hsn_code             text,
  quantity             integer not null check (quantity > 0),
  unit_price           numeric(12, 2) not null,       -- incl. customisation surcharges
  customization        jsonb not null default '{}'::jsonb,
  line_subtotal        numeric(12, 2) not null,       -- unit_price × quantity
  discount             numeric(12, 2) not null default 0,
  tax_rate             numeric(5, 2) not null default 0,
  tax_amount           numeric(12, 2) not null default 0,
  line_total           numeric(12, 2) not null
);
create index if not exists shop_order_items_order_idx on public.shop_order_items (order_id);
create index if not exists shop_order_items_product_idx on public.shop_order_items (product_id);

create table if not exists public.shop_order_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.shop_orders (id) on delete cascade,
  status          shop_order_status,
  payment_status  shop_payment_status,
  note            text,
  actor           text not null default 'system',
  is_customer_visible boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists shop_order_events_order_idx on public.shop_order_events (order_id, created_at);

create table if not exists public.shop_coupon_redemptions (
  id           uuid primary key default gen_random_uuid(),
  coupon_id    uuid not null references public.shop_coupons (id) on delete cascade,
  order_id     uuid not null unique references public.shop_orders (id) on delete cascade,
  customer_id  uuid,
  email        text not null,
  created_at   timestamptz not null default now()
);
create index if not exists shop_coupon_redemptions_coupon_idx on public.shop_coupon_redemptions (coupon_id, lower(email));

create table if not exists public.shop_payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.shop_orders (id) on delete cascade,
  provider             text not null,
  provider_order_id    text unique,
  provider_payment_id  text unique,
  amount               numeric(12, 2) not null,
  currency             text not null default 'INR',
  status               text not null default 'created' check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  method               text,
  error_code           text,
  error_description    text,
  raw                  jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists shop_payments_order_idx on public.shop_payments (order_id);

create table if not exists public.shop_refunds (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.shop_orders (id) on delete cascade,
  payment_id          uuid references public.shop_payments (id) on delete set null,
  provider_refund_id  text unique,
  amount              numeric(12, 2) not null check (amount > 0),
  reason              text,
  status              text not null default 'pending' check (status in ('pending', 'processed', 'failed', 'manual')),
  admin_id            uuid references public.shop_admins (id) on delete set null,
  created_at          timestamptz not null default now()
);

create table if not exists public.shop_shipments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.shop_orders (id) on delete cascade,
  provider         text not null default 'manual',
  carrier          text,
  tracking_number  text,
  tracking_url     text,
  provider_ref     text,
  status           text not null default 'pending' check (status in ('pending', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'cancelled')),
  events           jsonb not null default '[]'::jsonb,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists shop_shipments_order_idx on public.shop_shipments (order_id);

-- Payment gateway webhooks: event ids are recorded so retries are processed once.
create table if not exists public.shop_webhook_events (
  id           text primary key,
  provider     text not null,
  event        text not null,
  payload      jsonb,
  received_at  timestamptz not null default now()
);

create table if not exists public.shop_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.shop_newsletter (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  status      text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source      text,
  created_at  timestamptz not null default now()
);
create unique index if not exists shop_newsletter_email_key on public.shop_newsletter (lower(email));

-- GST invoices must be numbered consecutively per financial year.
create table if not exists public.shop_invoice_counters (
  financial_year  text primary key,
  last_number     integer not null default 0
);

-- ── updated_at triggers ────────────────────────────────────────────────────
create or replace function public.shop_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['shop_customers', 'shop_admins', 'shop_products', 'shop_variants', 'shop_carts', 'shop_orders', 'shop_payments', 'shop_shipments'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.shop_touch_updated_at()', t, t);
  end loop;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
--  Transactional business functions (called by the server through RPC)
-- ═════════════════════════════════════════════════════════════════════════════

-- Place an order atomically: lock & decrement stock, record movements, enforce
-- coupon limits, insert the order + items + first event. Either everything is
-- saved or nothing is. Re-sending the same idempotency key returns the first order.
create or replace function public.shop_place_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing   record;
  v_order_id   uuid;
  v_item       jsonb;
  v_variant    record;
  v_qty        integer;
  v_coupon     record;
  v_email      text := lower(p_order->>'email');
  v_customer   uuid := nullif(p_order->>'customer_id', '')::uuid;
  v_used       integer;
  v_prior      integer;
  v_stock      integer;
begin
  if p_order->>'idempotency_key' is not null then
    select id, order_number into v_existing from shop_orders where idempotency_key = p_order->>'idempotency_key';
    if found then
      return jsonb_build_object('id', v_existing.id, 'order_number', v_existing.order_number, 'duplicate', true);
    end if;
  end if;

  -- Lock variants in a stable order to avoid deadlocks between concurrent checkouts.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
    v_qty := (v_item->>'quantity')::integer;
    select v.id, v.stock, v.track_inventory, v.is_active, p.status, p.name
      into v_variant
      from shop_variants v join shop_products p on p.id = v.product_id
     where v.id = (v_item->>'variant_id')::uuid
     for update of v;
    if not found or not v_variant.is_active or v_variant.status <> 'active' then
      raise exception 'SHOP_UNAVAILABLE:%', coalesce(v_item->>'product_name', v_item->>'variant_id');
    end if;
    if v_variant.track_inventory and v_variant.stock < v_qty then
      raise exception 'SHOP_OUT_OF_STOCK:%:%', v_variant.name, v_variant.stock;
    end if;
  end loop;

  -- Coupon limits are checked under a row lock so concurrent orders can't exceed them.
  if p_order->>'coupon_id' is not null then
    select * into v_coupon from shop_coupons where id = (p_order->>'coupon_id')::uuid for update;
    if not found or not v_coupon.is_active then raise exception 'SHOP_COUPON_INVALID'; end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'SHOP_COUPON_EXHAUSTED';
    end if;
    if v_coupon.per_customer_limit is not null then
      select count(*) into v_used from shop_coupon_redemptions r
       where r.coupon_id = v_coupon.id and (lower(r.email) = v_email or (v_customer is not null and r.customer_id = v_customer));
      if v_used >= v_coupon.per_customer_limit then raise exception 'SHOP_COUPON_CUSTOMER_LIMIT'; end if;
    end if;
    if v_coupon.first_order_only then
      select count(*) into v_prior from shop_orders o
       where (lower(o.email) = v_email or (v_customer is not null and o.customer_id = v_customer))
         and o.status not in ('cancelled') and o.payment_status in ('paid', 'cod_pending', 'refunded', 'partially_refunded');
      if v_prior > 0 then raise exception 'SHOP_COUPON_FIRST_ORDER'; end if;
    end if;
  end if;

  insert into shop_orders (
    order_number, idempotency_key, access_key, owner_key, customer_id, email, phone, customer_name,
    status, payment_status, payment_method, shipping_address, billing_address, gstin, business_name,
    shipping_method, shipping_method_label, estimated_delivery_from, estimated_delivery_to,
    subtotal, discount_total, shipping_total, cod_fee, tax_total, grand_total, prices_include_tax, tax_breakdown,
    coupon_id, coupon_code, notes, ip_hash
  ) values (
    p_order->>'order_number', p_order->>'idempotency_key', p_order->>'access_key', p_order->>'owner_key', v_customer,
    p_order->>'email', p_order->>'phone', p_order->>'customer_name',
    (p_order->>'status')::shop_order_status, (p_order->>'payment_status')::shop_payment_status, p_order->>'payment_method',
    p_order->'shipping_address', p_order->'billing_address', nullif(p_order->>'gstin', ''), nullif(p_order->>'business_name', ''),
    p_order->>'shipping_method', p_order->>'shipping_method_label',
    nullif(p_order->>'estimated_delivery_from', '')::date, nullif(p_order->>'estimated_delivery_to', '')::date,
    (p_order->>'subtotal')::numeric, (p_order->>'discount_total')::numeric, (p_order->>'shipping_total')::numeric,
    (p_order->>'cod_fee')::numeric, (p_order->>'tax_total')::numeric, (p_order->>'grand_total')::numeric,
    coalesce((p_order->>'prices_include_tax')::boolean, true), coalesce(p_order->'tax_breakdown', '{}'::jsonb),
    nullif(p_order->>'coupon_id', '')::uuid, nullif(p_order->>'coupon_code', ''), nullif(p_order->>'notes', ''), p_order->>'ip_hash'
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    insert into shop_order_items (
      order_id, product_id, variant_id, product_name, variant_title, sku, image_url, hsn_code, quantity,
      unit_price, customization, line_subtotal, discount, tax_rate, tax_amount, line_total
    ) values (
      v_order_id, (v_item->>'product_id')::uuid, (v_item->>'variant_id')::uuid, v_item->>'product_name', v_item->>'variant_title',
      v_item->>'sku', v_item->>'image_url', v_item->>'hsn_code', v_qty, (v_item->>'unit_price')::numeric,
      coalesce(v_item->'customization', '{}'::jsonb), (v_item->>'line_subtotal')::numeric, (v_item->>'discount')::numeric,
      (v_item->>'tax_rate')::numeric, (v_item->>'tax_amount')::numeric, (v_item->>'line_total')::numeric
    );
    update shop_variants set stock = stock - v_qty
     where id = (v_item->>'variant_id')::uuid and track_inventory
     returning stock into v_stock;
    if found then
      insert into shop_inventory_movements (variant_id, delta, stock_after, reason, order_id, note)
      values ((v_item->>'variant_id')::uuid, -v_qty, v_stock, 'order', v_order_id, p_order->>'order_number');
    end if;
  end loop;

  if p_order->>'coupon_id' is not null then
    update shop_coupons set used_count = used_count + 1 where id = (p_order->>'coupon_id')::uuid;
    insert into shop_coupon_redemptions (coupon_id, order_id, customer_id, email)
    values ((p_order->>'coupon_id')::uuid, v_order_id, v_customer, p_order->>'email');
  end if;

  insert into shop_order_events (order_id, status, payment_status, note, actor)
  values (v_order_id, (p_order->>'status')::shop_order_status, (p_order->>'payment_status')::shop_payment_status, 'Order placed', 'customer');

  return jsonb_build_object('id', v_order_id, 'order_number', p_order->>'order_number', 'duplicate', false);
end $$;

-- Return reserved stock (unpaid order expired, cancellation, refund). Runs once per order.
create or replace function public.shop_release_order_stock(p_order_id uuid, p_reason text, p_release_coupon boolean default true)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item  record;
  v_stock integer;
begin
  select * into v_order from shop_orders where id = p_order_id for update;
  if not found or v_order.stock_released then return false; end if;

  for v_item in select variant_id, quantity from shop_order_items where order_id = p_order_id and variant_id is not null order by variant_id loop
    update shop_variants set stock = stock + v_item.quantity
     where id = v_item.variant_id and track_inventory
     returning stock into v_stock;
    if found then
      insert into shop_inventory_movements (variant_id, delta, stock_after, reason, order_id, note)
      values (v_item.variant_id, v_item.quantity, v_stock, p_reason, p_order_id, v_order.order_number);
    end if;
  end loop;

  if p_release_coupon and v_order.coupon_id is not null then
    delete from shop_coupon_redemptions where order_id = p_order_id;
    if found then update shop_coupons set used_count = greatest(used_count - 1, 0) where id = v_order.coupon_id; end if;
  end if;

  update shop_orders set stock_released = true where id = p_order_id;
  return true;
end $$;

-- Record a verified payment. Idempotent: only the first call changes the order
-- (returns transitioned = true), so webhooks + browser callbacks can't double-process.
create or replace function public.shop_mark_order_paid(
  p_order_id uuid, p_provider_order_id text, p_provider_payment_id text, p_amount numeric, p_method text, p_raw jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_late  boolean := false;
begin
  select * into v_order from shop_orders where id = p_order_id for update;
  if not found then raise exception 'SHOP_ORDER_NOT_FOUND'; end if;

  insert into shop_payments (order_id, provider, provider_order_id, provider_payment_id, amount, status, method, raw)
  values (p_order_id, 'razorpay', p_provider_order_id, p_provider_payment_id, p_amount, 'captured', p_method, p_raw)
  on conflict (provider_order_id) do update
    set provider_payment_id = excluded.provider_payment_id, status = 'captured', method = excluded.method,
        raw = excluded.raw, amount = excluded.amount, error_code = null, error_description = null;

  if v_order.payment_status = 'paid' then
    return jsonb_build_object('transitioned', false, 'order_number', v_order.order_number);
  end if;

  -- Payment arrived after the unpaid order had expired: keep the money, flag for review.
  v_late := v_order.stock_released or v_order.status = 'cancelled';

  update shop_orders
     set payment_status = 'paid',
         status = case when status in ('pending_payment', 'cancelled') then 'payment_confirmed'::shop_order_status else status end,
         paid_at = now(),
         needs_review = needs_review or v_late or abs(p_amount - grand_total) > 0.01,
         cancelled_at = case when v_late then null else cancelled_at end
   where id = p_order_id;

  update shop_products p set sold_count = sold_count + i.qty
    from (select product_id, sum(quantity) qty from shop_order_items where order_id = p_order_id and product_id is not null group by product_id) i
   where p.id = i.product_id;

  insert into shop_order_events (order_id, status, payment_status, note, actor)
  values (p_order_id, 'payment_confirmed', 'paid',
          case when v_late then 'Payment received after the order expired — stock must be re-checked' else 'Payment received' end, 'system');

  return jsonb_build_object('transitioned', true, 'order_number', v_order.order_number, 'late', v_late);
end $$;

-- Manual stock change from the admin (adjustment / restock / import), with history.
create or replace function public.shop_adjust_stock(p_variant_id uuid, p_delta integer, p_reason text, p_note text, p_admin_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_stock integer;
begin
  update shop_variants set stock = stock + p_delta where id = p_variant_id returning stock into v_stock;
  if not found then raise exception 'SHOP_VARIANT_NOT_FOUND'; end if;
  if v_stock < 0 then raise exception 'SHOP_NEGATIVE_STOCK'; end if;
  insert into shop_inventory_movements (variant_id, delta, stock_after, reason, admin_id, note)
  values (p_variant_id, p_delta, v_stock, p_reason, p_admin_id, p_note);
  return v_stock;
end $$;

-- Consecutive GST invoice numbers per Indian financial year (April–March), e.g. "PM/2026-27/00042".
create or replace function public.shop_assign_invoice_number(p_order_id uuid, p_prefix text default 'PM')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_now      timestamp := (now() at time zone 'Asia/Kolkata');
  v_start    integer := case when extract(month from v_now) >= 4 then extract(year from v_now)::int else extract(year from v_now)::int - 1 end;
  v_fy       text := v_start::text || '-' || lpad(((v_start + 1) % 100)::text, 2, '0');
  v_n        integer;
  v_number   text;
begin
  select invoice_number into v_existing from shop_orders where id = p_order_id for update;
  if not found then raise exception 'SHOP_ORDER_NOT_FOUND'; end if;
  if v_existing is not null then return v_existing; end if;
  insert into shop_invoice_counters (financial_year, last_number) values (v_fy, 1)
  on conflict (financial_year) do update set last_number = shop_invoice_counters.last_number + 1
  returning last_number into v_n;
  v_number := p_prefix || '/' || v_fy || '/' || lpad(v_n::text, 5, '0');
  update shop_orders set invoice_number = v_number, invoice_date = now() where id = p_order_id;
  return v_number;
end $$;

-- Catalogue listing: search, filters, sorting and pagination in one round trip.
create or replace function public.shop_catalog(
  p_query text default null,
  p_category_ids uuid[] default null,
  p_collection_id uuid default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_in_stock boolean default false,
  p_on_sale boolean default false,
  p_material text default null,
  p_technology text default null,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0,
  p_product_ids uuid[] default null
) returns table (
  id uuid, slug text, name text, short_description text, category_id uuid, material text, print_technology text,
  is_featured boolean, is_bestseller boolean, is_new boolean, rating_avg numeric, rating_count integer, sold_count integer,
  created_at timestamptz, price numeric, sale_price numeric, effective_price numeric, max_price numeric,
  in_stock boolean, variant_count integer, image_url text, image_alt text, hover_image_url text, is_customizable boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select case when coalesce(trim(p_query), '') = '' then null else websearch_to_tsquery('simple', p_query) end as tsq,
           nullif(trim(p_query), '') as raw
  ),
  base as (
    select p.*,
           (select min(coalesce(v.sale_price, v.price)) from shop_variants v where v.product_id = p.id and v.is_active) as eff_price,
           (select min(v.price) from shop_variants v where v.product_id = p.id and v.is_active) as min_price,
           (select max(coalesce(v.sale_price, v.price)) from shop_variants v where v.product_id = p.id and v.is_active) as top_price,
           (select bool_or(v.sale_price is not null and v.sale_price < v.price) from shop_variants v where v.product_id = p.id and v.is_active) as has_sale,
           (select bool_or(not v.track_inventory or v.stock > 0) from shop_variants v where v.product_id = p.id and v.is_active) as available,
           (select count(*)::int from shop_variants v where v.product_id = p.id and v.is_active) as n_variants,
           case when (select tsq from q) is null then 0 else ts_rank(p.search, (select tsq from q)) end as rank
      from shop_products p
     where p.status = 'active'
       and (p.publish_at is null or p.publish_at <= now())
       and (p_category_ids is null or p.category_id = any (p_category_ids))
       and (p_product_ids is null or p.id = any (p_product_ids))
       and (p_collection_id is null or exists (select 1 from shop_collection_products cp where cp.collection_id = p_collection_id and cp.product_id = p.id))
       and (p_material is null or p.material ilike p_material)
       and (p_technology is null or p.print_technology = p_technology or (p.print_technology = 'fdm_sla' and p_technology in ('fdm', 'sla')))
       and ((select raw from q) is null
            or p.search @@ (select tsq from q)
            or p.name ilike '%' || replace(replace((select raw from q), '%', ''), '_', '') || '%')
  ),
  filtered as (
    select * from base
     where n_variants > 0
       and (p_min_price is null or eff_price >= p_min_price)
       and (p_max_price is null or eff_price <= p_max_price)
       and (not p_in_stock or available)
       and (not p_on_sale or has_sale)
  )
  select f.id, f.slug, f.name, f.short_description, f.category_id, f.material, f.print_technology,
         f.is_featured, f.is_bestseller, f.is_new, f.rating_avg, f.rating_count, f.sold_count, f.created_at,
         f.min_price, (select min(v.sale_price) from shop_variants v where v.product_id = f.id and v.is_active and v.sale_price < v.price),
         f.eff_price, f.top_price, f.available, f.n_variants,
         (select i.url from shop_product_images i where i.product_id = f.id order by i.sort_order, i.created_at limit 1),
         (select i.alt from shop_product_images i where i.product_id = f.id order by i.sort_order, i.created_at limit 1),
         (select i.url from shop_product_images i where i.product_id = f.id order by i.sort_order, i.created_at offset 1 limit 1),
         jsonb_array_length(f.customization) > 0,
         count(*) over ()
    from filtered f
   order by
     case when p_sort = 'price_asc' then f.eff_price end asc nulls last,
     case when p_sort = 'price_desc' then f.eff_price end desc nulls last,
     case when p_sort = 'newest' then f.created_at end desc,
     case when p_sort = 'popular' then f.sold_count end desc,
     case when p_sort = 'rating' then f.rating_avg end desc,
     case when p_sort = 'relevance' then f.rank end desc,
     f.available desc, f.is_featured desc, f.sold_count desc, f.created_at desc
   limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
$$;

-- Dashboard figures for a date range (paid + COD orders count as sales).
create or replace function public.shop_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with sales as (
    select * from shop_orders
     where created_at >= p_from and created_at < p_to
       and payment_status in ('paid', 'cod_pending', 'partially_refunded')
       and status not in ('cancelled', 'refunded')
  )
  select jsonb_build_object(
    'total_sales', coalesce((select sum(grand_total) from sales), 0),
    'total_orders', (select count(*) from sales),
    'average_order_value', coalesce((select round(avg(grand_total), 2) from sales), 0),
    'new_customers', (select count(*) from shop_customers where created_at >= p_from and created_at < p_to and status <> 'deleted'),
    'total_customers', (select count(*) from shop_customers where status <> 'deleted'),
    'pending_payment', (select count(*) from shop_orders where status = 'pending_payment' and created_at > now() - interval '2 days'),
    'to_process', (select count(*) from shop_orders where status in ('payment_confirmed', 'processing')),
    'awaiting_shipment', (select count(*) from shop_orders where status = 'ready_for_shipment'),
    'needs_review', (select count(*) from shop_orders where needs_review),
    'revenue_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'revenue', d.revenue, 'orders', d.orders) order by d.day)
        from (
          select to_char(gs.day, 'YYYY-MM-DD') as day,
                 coalesce(sum(s.grand_total), 0) as revenue,
                 count(s.id) as orders
            from generate_series(date_trunc('day', p_from at time zone 'Asia/Kolkata'),
                                 date_trunc('day', (p_to - interval '1 second') at time zone 'Asia/Kolkata'),
                                 interval '1 day') as gs(day)
            left join sales s on date_trunc('day', s.created_at at time zone 'Asia/Kolkata') = gs.day
           group by gs.day
        ) d), '[]'::jsonb),
    'bestsellers', coalesce((
      select jsonb_agg(b order by b.units desc)
        from (
          select i.product_id, max(i.product_name) as name, sum(i.quantity) as units, sum(i.line_total) as revenue
            from shop_order_items i join sales s on s.id = i.order_id
           group by i.product_id
           order by sum(i.quantity) desc
           limit 5
        ) b), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(l)
        from (
          select v.id as variant_id, v.sku, v.stock, v.low_stock_threshold, p.id as product_id, p.name, v.title
            from shop_variants v join shop_products p on p.id = v.product_id
           where v.track_inventory and v.is_active and p.status = 'active' and v.stock <= v.low_stock_threshold
           order by v.stock asc
           limit 10
        ) l), '[]'::jsonb)
  );
$$;

-- ── Privileges & Row Level Security ────────────────────────────────────────
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Functions are callable by the server only (not by anon/authenticated API keys).
revoke execute on function public.shop_place_order(jsonb, jsonb) from public;
revoke execute on function public.shop_release_order_stock(uuid, text, boolean) from public;
revoke execute on function public.shop_mark_order_paid(uuid, text, text, numeric, text, jsonb) from public;
revoke execute on function public.shop_adjust_stock(uuid, integer, text, text, uuid) from public;
revoke execute on function public.shop_assign_invoice_number(uuid, text) from public;
revoke execute on function public.shop_catalog(text, uuid[], uuid, numeric, numeric, boolean, boolean, text, text, text, integer, integer, uuid[]) from public;
revoke execute on function public.shop_dashboard(timestamptz, timestamptz) from public;
grant execute on function public.shop_place_order(jsonb, jsonb) to service_role;
grant execute on function public.shop_release_order_stock(uuid, text, boolean) to service_role;
grant execute on function public.shop_mark_order_paid(uuid, text, text, numeric, text, jsonb) to service_role;
grant execute on function public.shop_adjust_stock(uuid, integer, text, text, uuid) to service_role;
grant execute on function public.shop_assign_invoice_number(uuid, text) to service_role;
grant execute on function public.shop_catalog(text, uuid[], uuid, numeric, numeric, boolean, boolean, text, text, text, integer, integer, uuid[]) to service_role;
grant execute on function public.shop_dashboard(timestamptz, timestamptz) to service_role;

do $$
declare t text;
begin
  foreach t in array array[
    'shop_customers', 'shop_customer_sessions', 'shop_admins', 'shop_admin_sessions', 'shop_auth_tokens', 'shop_admin_audit',
    'shop_addresses', 'shop_categories', 'shop_products', 'shop_product_images', 'shop_variants', 'shop_inventory_movements',
    'shop_collections', 'shop_collection_products', 'shop_banners', 'shop_reviews', 'shop_carts', 'shop_cart_items',
    'shop_wishlist_items', 'shop_coupons', 'shop_orders', 'shop_order_items', 'shop_order_events', 'shop_coupon_redemptions',
    'shop_payments', 'shop_refunds', 'shop_shipments', 'shop_webhook_events', 'shop_settings', 'shop_newsletter', 'shop_invoice_counters'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ── Storage: public bucket for product photos, 3D preview models and banners ─
-- Uploads happen only from the admin dashboard (server-side, validated).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-media', 'shop-media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'model/stl', 'application/octet-stream', 'model/3mf', 'text/plain'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- ── v2: courier tracking (Delhivery) — safe to re-run ──────────────────────
alter table public.shop_shipments add column if not exists last_status text;          -- courier's own wording, e.g. "In Transit"
alter table public.shop_shipments add column if not exists last_status_type text;     -- Delhivery StatusType: UD / DL / RT / PU / CN …
alter table public.shop_shipments add column if not exists last_location text;
alter table public.shop_shipments add column if not exists last_event_at timestamptz;
alter table public.shop_shipments add column if not exists expected_delivery date;
alter table public.shop_shipments add column if not exists last_synced_at timestamptz;
alter table public.shop_shipments add column if not exists sync_error text;
create index if not exists shop_shipments_tracking_idx on public.shop_shipments (provider, status) where tracking_number is not null;
create index if not exists shop_shipments_awb_idx on public.shop_shipments (tracking_number);
