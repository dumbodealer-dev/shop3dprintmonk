-- ─────────────────────────────────────────────────────────────────────────────
-- 3D PRINTMONK — database schema (PostgreSQL / Supabase)
-- Run once in Supabase → SQL Editor. Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Lifecycle of an enquiry. Later stages support future order tracking.
do $$ begin
  create type enquiry_status as enum (
    'received', 'under_review', 'quotation_sent', 'approved',
    'printing', 'finishing', 'quality_check', 'dispatched', 'delivered',
    'closed', 'spam'
  );
exception when duplicate_object then null; end $$;

-- ── Enquiries (quote, design and bulk requests) ─────────────────────────────
create table if not exists public.enquiries (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,
  enquiry_type          text not null default 'quote' check (enquiry_type in ('quote', 'design', 'bulk')),
  status                enquiry_status not null default 'received',

  full_name             text not null,
  company               text,
  email                 text not null,
  phone                 text not null,
  city                  text not null,
  customer_type         text not null,

  project_title         text not null,
  technology            text not null,
  material              text,
  quantity              integer not null check (quantity > 0),
  dimensions            text,
  delivery_date         date,
  application           text,
  finishing             text[] not null default '{}',
  design_inputs         text[] not null default '{}',
  needs_design          boolean not null default false,
  notes                 text,

  permission_confirmed  boolean not null default false,
  privacy_accepted_at   timestamptz not null default now(),

  -- Internal
  internal_notes        text,
  quoted_amount_inr     numeric(12, 2),
  email_business_status text,
  email_customer_status text,
  email_error           text,
  ip_hash               text,
  user_agent            text,
  customer_id           uuid,          -- reserved for future customer accounts
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_status_idx on public.enquiries (status);
create index if not exists enquiries_ip_hash_idx on public.enquiries (ip_hash, created_at desc);
create index if not exists enquiries_email_idx on public.enquiries (lower(email));

create table if not exists public.enquiry_files (
  id            uuid primary key default gen_random_uuid(),
  enquiry_id    uuid not null references public.enquiries (id) on delete cascade,
  storage_path  text not null unique,
  original_name text not null,
  size_bytes    bigint not null,
  extension     text not null,
  kind          text not null check (kind in ('model', 'reference')),
  created_at    timestamptz not null default now()
);
create index if not exists enquiry_files_enquiry_idx on public.enquiry_files (enquiry_id);

-- Status history (feeds future order-tracking timeline)
create table if not exists public.enquiry_events (
  id          uuid primary key default gen_random_uuid(),
  enquiry_id  uuid not null references public.enquiries (id) on delete cascade,
  status      enquiry_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ── Contact form messages ───────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text,
  subject      text,
  message      text not null,
  email_status text,
  ip_hash      text,
  created_at   timestamptz not null default now()
);

-- ── Materials library (editable in Supabase Table Editor) ───────────────────
create table if not exists public.materials (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  technology       text not null check (technology in ('fdm', 'sla')),
  family           text not null,
  summary          text not null,
  description      text not null,
  strength         text,
  flexibility      text,
  heat_resistance  text,
  surface_finish   text,
  applications     text[] not null default '{}',
  colors           text,
  cost_level       smallint check (cost_level between 1 and 3),
  limitations      text[] not null default '{}',
  availability     text not null default 'on_request' check (availability in ('in_stock', 'on_request', 'unavailable')),
  price_note       text,          -- optional, INR wording shown as-is (e.g. "From ₹… per part")
  is_published     boolean not null default true,
  sort_order       integer not null default 100,
  updated_at       timestamptz not null default now()
);

-- ── Portfolio (editable in Supabase Table Editor) ───────────────────────────
-- images: JSON array of { "src": "<public URL>", "alt": "...", "width": 1600, "height": 1200 }
create table if not exists public.portfolio_projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text not null,
  categories    text[] not null default '{}',
  technology    text not null check (technology in ('fdm', 'sla', 'fdm_sla')),
  material      text,
  quantity      text,
  finishing     text,
  intended_use  text,
  images        jsonb not null default '[]'::jsonb,
  is_featured   boolean not null default false,
  is_published  boolean not null default false,   -- publish only with client approval
  sort_order    integer not null default 100,
  created_at    timestamptz not null default now()
);

-- ── v2: instant estimates & per-material pricing (safe to re-run) ─────────────
alter table public.materials add column if not exists rate_per_gram_inr numeric(8, 2);  -- overrides src/config/pricing.ts
alter table public.materials add column if not exists density_g_cm3 numeric(5, 3);
alter table public.enquiries add column if not exists quote_mode text check (quote_mode in ('instant', 'manual'));
alter table public.enquiries add column if not exists estimate_min_inr numeric(12, 2);
alter table public.enquiries add column if not exists estimate_max_inr numeric(12, 2);
alter table public.enquiries add column if not exists estimate_details jsonb;   -- browser-computed, indicative only

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists enquiries_touch on public.enquiries;
create trigger enquiries_touch before update on public.enquiries for each row execute function public.touch_updated_at();
drop trigger if exists materials_touch on public.materials;
create trigger materials_touch before update on public.materials for each row execute function public.touch_updated_at();

-- Log every status change automatically
create or replace function public.log_enquiry_status() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.enquiry_events (enquiry_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;
drop trigger if exists enquiries_status_log on public.enquiries;
create trigger enquiries_status_log after insert or update of status on public.enquiries
  for each row execute function public.log_enquiry_status();

-- ── Privileges ─────────────────────────────────────────────────────────────
-- Newer Supabase projects don't grant API roles access to tables created in SQL.
-- The website's server (service_role / sb_secret key) needs read/write access.
-- anon/authenticated get nothing: the browser never talks to the database directly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- ── Row Level Security ─────────────────────────────────────────────────────
-- RLS on, no public policies: only the server (service-role key) can read/write.
alter table public.enquiries          enable row level security;
alter table public.enquiry_files      enable row level security;
alter table public.enquiry_events     enable row level security;
alter table public.contact_messages   enable row level security;
alter table public.materials          enable row level security;
alter table public.portfolio_projects enable row level security;

-- ── Storage buckets ────────────────────────────────────────────────────────
-- quote-uploads: PRIVATE. Customer files are only reachable through
-- short-lived signed URLs generated on the server.
-- No bucket-level size cap: large 3D files are welcome. The effective limit is the
-- project's global "Upload file size limit" (Storage → Settings; Free plan = 50 MB).
insert into storage.buckets (id, name, public, file_size_limit)
values ('quote-uploads', 'quote-uploads', false, null)
on conflict (id) do update set public = false, file_size_limit = null;

-- portfolio: PUBLIC. Published marketing photos only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = true;
