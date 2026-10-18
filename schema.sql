-- PASSIBO starter schema for Supabase/PostgreSQL.
-- Apply only in a new development project. This schema does NOT enable live bookings.
-- Keep personal data minimal and do not store identity documents in ordinary table columns.

create extension if not exists pgcrypto;

create type public.vehicle_kind as enum ('car', 'bike');
create type public.journey_mode as enum ('expense_share', 'commercial');
create type public.journey_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.request_status as enum ('preview', 'requested', 'accepted', 'rejected', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind public.vehicle_kind not null,
  make_model text,
  registration_verified boolean not null default false,
  passenger_capacity integer not null check (passenger_capacity between 1 and 4),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  mode public.journey_mode not null,
  origin_label text not null check (char_length(origin_label) between 1 and 160),
  destination_label text not null check (char_length(destination_label) between 1 and 160),
  -- Store coordinates only after location consent; production should use PostGIS geography.
  origin_lat double precision,
  origin_lng double precision,
  destination_lat double precision,
  destination_lng double precision,
  departure_at timestamptz not null,
  available_seats integer not null check (available_seats between 1 and 4),
  max_detour_minutes integer not null default 10 check (max_detour_minutes between 0 and 60),
  suggested_amount_paise integer not null default 0 check (suggested_amount_paise >= 0),
  status public.journey_status not null default 'draft',
  live_booking_enabled boolean not null default false check (live_booking_enabled = false),
  created_at timestamptz not null default now()
);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  pickup_label text not null,
  dropoff_label text not null,
  suggested_amount_paise integer not null default 0 check (suggested_amount_paise >= 0),
  status public.request_status not null default 'preview',
  live_booking_enabled boolean not null default false check (live_booking_enabled = false),
  created_at timestamptz not null default now(),
  unique (journey_id, passenger_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  subject_profile_id uuid references public.profiles(id) on delete set null,
  journey_id uuid references public.journeys(id) on delete set null,
  category text not null check (char_length(category) between 2 and 80),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- Enable RLS by default. Policies below allow a user to read/update only their own
-- profile and own vehicles/journeys. Public journey discovery should be implemented
-- with a reviewed RPC that returns minimal fields and excludes exact coordinates
-- and private profile data.
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.journeys enable row level security;
alter table public.ride_requests enable row level security;
alter table public.reports enable row level security;

create policy "profile owner can read own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profile owner can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profile owner can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "owner manages own vehicles"
  on public.vehicles for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "driver manages own journeys"
  on public.journeys for all to authenticated
  using (auth.uid() = driver_id) with check (auth.uid() = driver_id);

create policy "passenger manages own requests"
  on public.ride_requests for all to authenticated
  using (auth.uid() = passenger_id) with check (auth.uid() = passenger_id);

create policy "reporter can submit and view own reports"
  on public.reports for all to authenticated
  using (auth.uid() = reporter_id) with check (auth.uid() = reporter_id);

-- NOTE: No policy exposes published journeys publicly and no payment/acceptance RPC exists.
-- This is intentional: the current build is a non-live prototype pending legal review.
