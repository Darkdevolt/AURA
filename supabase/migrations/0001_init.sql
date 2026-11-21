-- Luxus Asaad — schéma initial
-- Toutes les tables ont RLS activé. Le public n'a AUCUN accès direct aux tables :
-- il passe par des fonctions SECURITY DEFINER appelées uniquement par les routes
-- serveur Next.js (protégées par un jeton serveur stocké dans private.app_secrets).
-- L'admin (utilisateur Supabase Auth listé dans public.admins) a accès complet.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Secrets internes (jeton partagé avec les routes serveur)
-- ---------------------------------------------------------------------------
create table if not exists private.app_secrets (
  id boolean primary key default true check (id),
  server_token text not null default encode(gen_random_bytes(32), 'hex')
);
insert into private.app_secrets (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "admins: lecture de sa propre ligne"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Réglages (une seule ligne)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id boolean primary key default true check (id),
  pickup_fee integer not null default 500,
  price_per_km integer not null default 300,
  min_fare integer not null default 1000,
  round_to integer not null default 100,
  airport_enabled boolean not null default true,
  airport_fixed_price integer not null default 15000,
  open_time time not null default '08:00',
  close_time time not null default '20:00',
  open_days smallint[] not null default '{1,2,3,4,5,6}', -- 0 = dimanche … 6 = samedi
  slot_minutes smallint not null default 30,
  approach_minutes smallint not null default 30,
  margin_minutes smallint not null default 15,
  min_notice_minutes smallint not null default 60,
  max_days_ahead smallint not null default 14,
  vehicles smallint not null default 1 check (vehicles between 1 and 20),
  whatsapp_number text not null default '+221770000000',
  phone_number text not null default '+221770000000',
  max_active_per_phone smallint not null default 3,
  max_per_ip_per_day smallint not null default 6,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true) on conflict do nothing;
alter table public.settings enable row level security;

create policy "settings: admin lecture" on public.settings
  for select to authenticated using ((select public.is_admin()));
create policy "settings: admin mise à jour" on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Réservations
-- ---------------------------------------------------------------------------
create sequence if not exists public.booking_reference_seq;

do $$ begin
  create type public.booking_status as enum
    ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'wave', 'orange_money');
exception when duplicate_object then null; end $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('LA-' || lpad(nextval('public.booking_reference_seq')::text, 4, '0')),
  created_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text not null check (customer_phone ~ '^\+2217[015678][0-9]{7}$'),
  pickup_address text not null check (char_length(pickup_address) <= 300),
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_note text check (char_length(pickup_note) <= 300),
  dropoff_address text not null check (char_length(dropoff_address) <= 300),
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  start_at timestamptz not null,
  blocked_until timestamptz not null,
  passengers smallint not null default 1 check (passengers between 1 and 4),
  comment text check (char_length(comment) <= 500),
  distance_km numeric(7, 2) not null,
  duration_min integer not null,
  estimated_price integer not null,
  final_price integer,
  payment_method public.payment_method,
  status public.booking_status not null default 'pending',
  ip_hash text,
  check (blocked_until > start_at)
);
create index if not exists bookings_start_idx on public.bookings (start_at);
create index if not exists bookings_phone_idx on public.bookings (customer_phone);
create index if not exists bookings_ip_idx on public.bookings (ip_hash, created_at);
alter table public.bookings enable row level security;

create policy "bookings: admin tout" on public.bookings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Plages bloquées
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index if not exists blocked_slots_start_idx on public.blocked_slots (start_at);
alter table public.blocked_slots enable row level security;

create policy "blocked_slots: admin tout" on public.blocked_slots
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Fonctions publiques (appelées par les routes serveur avec le jeton serveur)
-- ---------------------------------------------------------------------------
create or replace function private.check_token(p_token text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token <> (select s.server_token from private.app_secrets s) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end;
$$;

-- Réglages publics (aucune donnée sensible)
create or replace function public.public_get_settings(p_token text)
returns public.settings
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r public.settings;
begin
  perform private.check_token(p_token);
  select * into r from public.settings where id;
  return r;
end;
$$;

-- Créneaux occupés entre deux dates (aucune donnée personnelle)
create or replace function public.public_get_busy(p_token text, p_from timestamptz, p_to timestamptz)
returns table (start_at timestamptz, end_at timestamptz, kind text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_token(p_token);
  return query
    select b.start_at, b.blocked_until, 'booking'::text
      from public.bookings b
     where b.status not in ('cancelled', 'no_show', 'completed')
       and b.start_at < p_to and b.blocked_until > p_from
    union all
    select s.start_at, s.end_at, 'blocked'::text
      from public.blocked_slots s
     where s.start_at < p_to and s.end_at > p_from;
end;
$$;

-- Création atomique d'une réservation (verrou + vérification de disponibilité)
create or replace function public.public_create_booking(
  p_token text,
  p_customer_name text,
  p_customer_phone text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_pickup_note text,
  p_dropoff_address text,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_start_at timestamptz,
  p_blocked_until timestamptz,
  p_passengers smallint,
  p_comment text,
  p_distance_km numeric,
  p_duration_min integer,
  p_estimated_price integer,
  p_ip_hash text
)
returns table (reference text, id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cfg public.settings;
  v_conc integer;
  v_ref text;
  v_id uuid;
begin
  perform private.check_token(p_token);
  -- Un seul enregistrement à la fois : évite les doubles réservations
  perform pg_advisory_xact_lock(hashtext('luxus_asaad_booking'));

  select * into cfg from public.settings where id;

  -- Anti-spam : réservations actives par téléphone
  if (select count(*) from public.bookings b
       where b.customer_phone = p_customer_phone
         and b.status in ('pending', 'confirmed')
         and b.start_at > now()) >= cfg.max_active_per_phone then
    raise exception 'limit_phone' using errcode = 'P0001';
  end if;

  -- Anti-spam : réservations par IP sur 24 h
  if p_ip_hash is not null and (select count(*) from public.bookings b
       where b.ip_hash = p_ip_hash and b.created_at > now() - interval '24 hours')
       >= cfg.max_per_ip_per_day then
    raise exception 'limit_ip' using errcode = 'P0001';
  end if;

  -- Plage bloquée par l'admin
  if exists (select 1 from public.blocked_slots s
              where s.start_at < p_blocked_until and s.end_at > p_start_at) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  -- Nombre maximal de réservations simultanées sur l'intervalle demandé
  select coalesce(max(c), 0) into v_conc from (
    select (select count(*) from public.bookings b2
             where b2.status not in ('cancelled', 'no_show', 'completed')
               and b2.start_at <= pt and b2.blocked_until > pt) as c
      from (
        select p_start_at as pt
        union
        select b.start_at from public.bookings b
         where b.status not in ('cancelled', 'no_show', 'completed')
           and b.start_at > p_start_at and b.start_at < p_blocked_until
      ) points
  ) t;

  if v_conc >= cfg.vehicles then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    customer_name, customer_phone, pickup_address, pickup_lat, pickup_lng, pickup_note,
    dropoff_address, dropoff_lat, dropoff_lng, start_at, blocked_until, passengers,
    comment, distance_km, duration_min, estimated_price, ip_hash
  ) values (
    p_customer_name, p_customer_phone, p_pickup_address, p_pickup_lat, p_pickup_lng, nullif(p_pickup_note, ''),
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng, p_start_at, p_blocked_until, p_passengers,
    nullif(p_comment, ''), p_distance_km, p_duration_min, p_estimated_price, p_ip_hash
  ) returning bookings.reference, bookings.id into v_ref, v_id;

  return query select v_ref, v_id;
end;
$$;

-- Lecture de SA réservation (référence + téléphone)
create or replace function public.public_get_booking(p_token text, p_reference text, p_phone text)
returns table (
  reference text, customer_name text, pickup_address text, pickup_note text,
  dropoff_address text, start_at timestamptz, passengers smallint, distance_km numeric,
  duration_min integer, estimated_price integer, status public.booking_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_token(p_token);
  return query
    select b.reference, b.customer_name, b.pickup_address, b.pickup_note, b.dropoff_address,
           b.start_at, b.passengers, b.distance_km, b.duration_min, b.estimated_price, b.status
      from public.bookings b
     where b.reference = upper(p_reference) and b.customer_phone = p_phone;
end;
$$;

-- Annulation par le client
create or replace function public.public_cancel_booking(p_token text, p_reference text, p_phone text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare v_status public.booking_status; v_start timestamptz;
begin
  perform private.check_token(p_token);
  select b.status, b.start_at into v_status, v_start
    from public.bookings b
   where b.reference = upper(p_reference) and b.customer_phone = p_phone
   for update;
  if not found then return 'not_found'; end if;
  if v_status not in ('pending', 'confirmed') then return 'not_cancellable'; end if;
  if v_start <= now() then return 'too_late'; end if;
  update public.bookings set status = 'cancelled'
   where bookings.reference = upper(p_reference) and bookings.customer_phone = p_phone;
  return 'cancelled';
end;
$$;

-- Seules les routes serveur (rôle anon + jeton) appellent ces fonctions
revoke all on function public.public_get_settings(text) from public;
revoke all on function public.public_get_busy(text, timestamptz, timestamptz) from public;
revoke all on function public.public_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text) from public;
revoke all on function public.public_get_booking(text, text, text) from public;
revoke all on function public.public_cancel_booking(text, text, text) from public;
grant execute on function public.public_get_settings(text) to anon, authenticated;
grant execute on function public.public_get_busy(text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.public_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text) to anon, authenticated;
grant execute on function public.public_get_booking(text, text, text) to anon, authenticated;
grant execute on function public.public_cancel_booking(text, text, text) to anon, authenticated;
revoke all on function private.check_token(text) from public;
