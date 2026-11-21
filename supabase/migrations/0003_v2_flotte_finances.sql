-- Luxus Asaad — V2 : flotte (véhicules, chauffeurs), finances (dépenses, revenus, reçus),
-- suivi du chauffeur en temps réel, espace client, notifications, paiement Wave.
-- Tous les objets sont préfixés « luxus_ ».

-- ---------------------------------------------------------------------------
-- Véhicules
-- ---------------------------------------------------------------------------
create table if not exists public.luxus_vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  plate text check (char_length(plate) <= 20),
  model text check (char_length(model) <= 60),
  color text check (char_length(color) <= 30),
  active boolean not null default true,
  purchase_price integer check (purchase_price >= 0),
  purchase_date date,
  created_at timestamptz not null default now()
);
alter table public.luxus_vehicles enable row level security;
create policy "vehicles: admin tout" on public.luxus_vehicles
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

insert into public.luxus_vehicles (name)
select 'Asaad 1' where not exists (select 1 from public.luxus_vehicles);

-- Le nombre de véhicules actifs pilote la disponibilité des créneaux
create or replace function luxus_private.sync_vehicle_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.luxus_settings
     set vehicles = greatest(1, (select count(*) from public.luxus_vehicles v where v.active))
   where luxus_settings.id;
  return null;
end;
$$;
drop trigger if exists luxus_vehicles_sync on public.luxus_vehicles;
create trigger luxus_vehicles_sync after insert or update or delete on public.luxus_vehicles
  for each statement execute function luxus_private.sync_vehicle_count();

-- ---------------------------------------------------------------------------
-- Chauffeurs (connexion à la page chauffeur par téléphone + code PIN)
-- ---------------------------------------------------------------------------
create table if not exists public.luxus_drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  phone text not null unique check (phone ~ '^\+2217[015678][0-9]{7}$'),
  vehicle_id uuid references public.luxus_vehicles (id) on delete set null,
  pin_hash text, -- empreinte SHA-256 calculée par le serveur (jamais le code en clair)
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.luxus_drivers enable row level security;
create policy "drivers: admin tout" on public.luxus_drivers
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

-- ---------------------------------------------------------------------------
-- Réservations : véhicule, chauffeur, suivi, paiement en ligne
-- ---------------------------------------------------------------------------
alter table public.luxus_bookings
  add column if not exists vehicle_id uuid references public.luxus_vehicles (id) on delete set null,
  add column if not exists driver_id uuid references public.luxus_drivers (id) on delete set null,
  add column if not exists tracking_token text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists driver_lat double precision,
  add column if not exists driver_lng double precision,
  add column if not exists driver_pos_at timestamptz,
  add column if not exists paid_online boolean not null default false,
  add column if not exists wave_session_id text;
create index if not exists luxus_bookings_driver_idx on public.luxus_bookings (driver_id, start_at);

-- ---------------------------------------------------------------------------
-- Dépenses et revenus hors site (Yango, courses directes…)
-- ---------------------------------------------------------------------------
create table if not exists public.luxus_expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default (now() at time zone 'Africa/Dakar')::date,
  vehicle_id uuid references public.luxus_vehicles (id) on delete set null,
  category text not null check (category in (
    'recharge', 'carburant', 'entretien', 'pneus', 'lavage', 'peage', 'parking', 'assurance',
    'salaire', 'credit', 'amende', 'telephone', 'autre')),
  amount integer not null check (amount > 0),
  payment_method text check (payment_method in ('cash', 'wave', 'orange_money', 'carte', 'autre')),
  supplier text check (char_length(supplier) <= 120),
  note text check (char_length(note) <= 500),
  odometer_km integer check (odometer_km >= 0),
  receipt_path text,
  source text not null default 'manuel' check (source in ('manuel', 'scan')),
  created_at timestamptz not null default now()
);
create index if not exists luxus_expenses_date_idx on public.luxus_expenses (spent_on);
alter table public.luxus_expenses enable row level security;
create policy "expenses: admin tout" on public.luxus_expenses
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

create table if not exists public.luxus_incomes (
  id uuid primary key default gen_random_uuid(),
  earned_on date not null default (now() at time zone 'Africa/Dakar')::date,
  vehicle_id uuid references public.luxus_vehicles (id) on delete set null,
  source text not null check (source in ('direct', 'yango', 'heetch', 'mise_a_disposition', 'autre')),
  amount integer not null check (amount > 0),
  trips integer not null default 1 check (trips >= 0),
  payment_method text check (payment_method in ('cash', 'wave', 'orange_money', 'carte', 'autre')),
  note text check (char_length(note) <= 500),
  receipt_path text,
  source_kind text not null default 'manuel' check (source_kind in ('manuel', 'scan')),
  created_at timestamptz not null default now()
);
create index if not exists luxus_incomes_date_idx on public.luxus_incomes (earned_on);
alter table public.luxus_incomes enable row level security;
create policy "incomes: admin tout" on public.luxus_incomes
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

-- ---------------------------------------------------------------------------
-- Réglages : notifications
-- ---------------------------------------------------------------------------
alter table public.luxus_settings
  add column if not exists ntfy_topic text
    default 'luxus-asaad-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
update public.luxus_settings
   set ntfy_topic = 'luxus-asaad-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
 where ntfy_topic is null;

-- La fonction de réglages renvoie la ligne entière : recréée pour inclure les nouvelles colonnes
create or replace function public.luxus_get_settings(p_token text)
returns public.luxus_settings
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r public.luxus_settings;
begin
  perform luxus_private.check_token(p_token);
  select * into r from public.luxus_settings where id;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Photos de reçus : stockage privé, réservé à l'admin
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('luxus-receipts', 'luxus-receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "luxus receipts: admin lecture" on storage.objects;
drop policy if exists "luxus receipts: admin ajout" on storage.objects;
drop policy if exists "luxus receipts: admin suppression" on storage.objects;
create policy "luxus receipts: admin lecture" on storage.objects
  for select to authenticated using (bucket_id = 'luxus-receipts' and (select public.luxus_is_admin()));
create policy "luxus receipts: admin ajout" on storage.objects
  for insert to authenticated with check (bucket_id = 'luxus-receipts' and (select public.luxus_is_admin()));
create policy "luxus receipts: admin suppression" on storage.objects
  for delete to authenticated using (bucket_id = 'luxus-receipts' and (select public.luxus_is_admin()));

-- ---------------------------------------------------------------------------
-- Consultation de réservation : ajoute le lien de suivi et le véhicule
-- ---------------------------------------------------------------------------
drop function if exists public.luxus_get_booking(text, text, text);
create function public.luxus_get_booking(p_token text, p_reference text, p_phone text)
returns table (
  reference text, customer_name text, pickup_address text, pickup_note text,
  dropoff_address text, start_at timestamptz, passengers smallint, distance_km numeric,
  duration_min integer, estimated_price integer, status public.luxus_booking_status,
  tracking_token text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  return query
    select b.reference, b.customer_name, b.pickup_address, b.pickup_note, b.dropoff_address,
           b.start_at, b.passengers, b.distance_km, b.duration_min, b.estimated_price, b.status,
           b.tracking_token
      from public.luxus_bookings b
     where b.reference = upper(p_reference) and b.customer_phone = p_phone;
end;
$$;

-- La création renvoie aussi le jeton de suivi
drop function if exists public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text);
create function public.luxus_create_booking(
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
returns table (reference text, id uuid, tracking_token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  cfg public.luxus_settings;
  v_conc integer;
  v_ref text;
  v_id uuid;
  v_track text;
begin
  perform luxus_private.check_token(p_token);
  -- Un seul enregistrement à la fois : évite les doubles réservations
  perform pg_advisory_xact_lock(hashtext('luxus_asaad_booking'));

  -- « luxus_settings.id » est qualifié : « id » est aussi une colonne de retour de la fonction
  select * into cfg from public.luxus_settings where luxus_settings.id;

  if (select count(*) from public.luxus_bookings b
       where b.customer_phone = p_customer_phone
         and b.status in ('pending', 'confirmed')
         and b.start_at > now()) >= cfg.max_active_per_phone then
    raise exception 'limit_phone' using errcode = 'P0001';
  end if;

  if p_ip_hash is not null and (select count(*) from public.luxus_bookings b
       where b.ip_hash = p_ip_hash and b.created_at > now() - interval '24 hours')
       >= cfg.max_per_ip_per_day then
    raise exception 'limit_ip' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.luxus_blocked_slots s
              where s.start_at < p_blocked_until and s.end_at > p_start_at) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  select coalesce(max(c), 0) into v_conc from (
    select (select count(*) from public.luxus_bookings b2
             where b2.status not in ('cancelled', 'no_show', 'completed')
               and b2.start_at <= pt and b2.blocked_until > pt) as c
      from (
        select p_start_at as pt
        union
        select b.start_at from public.luxus_bookings b
         where b.status not in ('cancelled', 'no_show', 'completed')
           and b.start_at > p_start_at and b.start_at < p_blocked_until
      ) points
  ) t;

  if v_conc >= cfg.vehicles then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  insert into public.luxus_bookings (
    customer_name, customer_phone, pickup_address, pickup_lat, pickup_lng, pickup_note,
    dropoff_address, dropoff_lat, dropoff_lng, start_at, blocked_until, passengers,
    comment, distance_km, duration_min, estimated_price, ip_hash
  ) values (
    p_customer_name, p_customer_phone, p_pickup_address, p_pickup_lat, p_pickup_lng, nullif(p_pickup_note, ''),
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng, p_start_at, p_blocked_until, p_passengers,
    nullif(p_comment, ''), p_distance_km, p_duration_min, p_estimated_price, p_ip_hash
  ) returning luxus_bookings.reference, luxus_bookings.id, luxus_bookings.tracking_token
    into v_ref, v_id, v_track;

  return query select v_ref, v_id, v_track;
end;
$$;

-- ---------------------------------------------------------------------------
-- Espace client : toutes les réservations d'un numéro
-- (preuve d'identité : un numéro de réservation existant + le téléphone)
-- ---------------------------------------------------------------------------
create or replace function public.luxus_customer_bookings(p_token text, p_reference text, p_phone text)
returns table (
  reference text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  pickup_note text, dropoff_address text, dropoff_lat double precision, dropoff_lng double precision,
  start_at timestamptz, passengers smallint, estimated_price integer, final_price integer,
  status public.luxus_booking_status, tracking_token text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  if not exists (select 1 from public.luxus_bookings b
                  where b.reference = upper(p_reference) and b.customer_phone = p_phone) then
    return;
  end if;
  return query
    select b.reference, b.pickup_address, b.pickup_lat, b.pickup_lng, b.pickup_note,
           b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.start_at, b.passengers,
           b.estimated_price, b.final_price, b.status, b.tracking_token
      from public.luxus_bookings b
     where b.customer_phone = p_phone
     order by b.start_at desc
     limit 50;
end;
$$;

-- ---------------------------------------------------------------------------
-- Suivi client : position du chauffeur pour une réservation (lien secret)
-- ---------------------------------------------------------------------------
create or replace function public.luxus_track(p_token text, p_reference text, p_tracking text)
returns table (
  reference text, status public.luxus_booking_status, start_at timestamptz,
  pickup_address text, pickup_lat double precision, pickup_lng double precision,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision,
  driver_name text, vehicle_name text, vehicle_plate text, vehicle_color text, vehicle_model text,
  driver_lat double precision, driver_lng double precision, driver_pos_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  return query
    select b.reference, b.status, b.start_at, b.pickup_address, b.pickup_lat, b.pickup_lng,
           b.dropoff_address, b.dropoff_lat, b.dropoff_lng,
           d.name, v.name, v.plate, v.color, v.model,
           case when b.status in ('confirmed', 'in_progress') then b.driver_lat end,
           case when b.status in ('confirmed', 'in_progress') then b.driver_lng end,
           case when b.status in ('confirmed', 'in_progress') then b.driver_pos_at end
      from public.luxus_bookings b
      left join public.luxus_drivers d on d.id = b.driver_id
      left join public.luxus_vehicles v on v.id = coalesce(b.vehicle_id, d.vehicle_id)
     where b.reference = upper(p_reference) and b.tracking_token = p_tracking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Page chauffeur
-- ---------------------------------------------------------------------------
create or replace function public.luxus_driver_login(p_token text, p_phone text, p_pin_hash text)
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  return query
    select d.id, d.name from public.luxus_drivers d
     where d.phone = p_phone and d.active and d.pin_hash is not null and d.pin_hash = p_pin_hash;
end;
$$;

-- Courses visibles par un chauffeur : les siennes, et celles non attribuées
create or replace function public.luxus_driver_bookings(p_token text, p_driver uuid, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, reference text, customer_name text, customer_phone text,
  pickup_address text, pickup_lat double precision, pickup_lng double precision, pickup_note text,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision,
  start_at timestamptz, passengers smallint, comment text, distance_km numeric, duration_min integer,
  estimated_price integer, final_price integer, payment_method public.luxus_payment_method,
  status public.luxus_booking_status, mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  if not exists (select 1 from public.luxus_drivers d where d.id = p_driver and d.active) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  return query
    select b.id, b.reference, b.customer_name, b.customer_phone, b.pickup_address, b.pickup_lat,
           b.pickup_lng, b.pickup_note, b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.start_at,
           b.passengers, b.comment, b.distance_km, b.duration_min, b.estimated_price, b.final_price,
           b.payment_method, b.status, (b.driver_id = p_driver)
      from public.luxus_bookings b
     where b.start_at >= p_from and b.start_at < p_to
       and (b.driver_id = p_driver or b.driver_id is null)
       and b.status <> 'cancelled'
     order by b.start_at;
end;
$$;

create or replace function public.luxus_driver_update(
  p_token text, p_driver uuid, p_booking uuid, p_status text,
  p_final_price integer, p_payment_method text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare v_vehicle uuid;
begin
  perform luxus_private.check_token(p_token);
  select d.vehicle_id into v_vehicle from public.luxus_drivers d where d.id = p_driver and d.active;
  if not found then return 'unauthorized'; end if;
  if p_status not in ('confirmed', 'in_progress', 'completed', 'no_show') then return 'bad_status'; end if;
  update public.luxus_bookings b
     set status = p_status::public.luxus_booking_status,
         driver_id = p_driver,
         vehicle_id = coalesce(b.vehicle_id, v_vehicle),
         final_price = coalesce(p_final_price, b.final_price),
         payment_method = coalesce(nullif(p_payment_method, '')::public.luxus_payment_method, b.payment_method)
   where b.id = p_booking and (b.driver_id = p_driver or b.driver_id is null)
     and b.status <> 'cancelled';
  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

create or replace function public.luxus_driver_position(
  p_token text, p_driver uuid, p_booking uuid, p_lat double precision, p_lng double precision
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  update public.luxus_bookings b
     set driver_lat = p_lat, driver_lng = p_lng, driver_pos_at = now(),
         driver_id = coalesce(b.driver_id, p_driver)
   where b.id = p_booking and (b.driver_id = p_driver or b.driver_id is null)
     and b.status in ('confirmed', 'in_progress')
     and exists (select 1 from public.luxus_drivers d where d.id = p_driver and d.active);
  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Paiement Wave confirmé (appelé par le webhook Wave, signature vérifiée côté serveur)
-- ---------------------------------------------------------------------------
create or replace function public.luxus_mark_paid(p_token text, p_reference text, p_amount integer, p_session text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  update public.luxus_bookings b
     set paid_online = true, payment_method = 'wave', final_price = p_amount, wave_session_id = p_session
   where b.reference = upper(p_reference);
  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits : seules les routes serveur (jeton) appellent ces fonctions
-- ---------------------------------------------------------------------------
revoke all on function public.luxus_get_settings(text) from public, anon, authenticated;
revoke all on function public.luxus_get_booking(text, text, text) from public, anon, authenticated;
revoke all on function public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text) from public, anon, authenticated;
revoke all on function public.luxus_customer_bookings(text, text, text) from public, anon, authenticated;
revoke all on function public.luxus_track(text, text, text) from public, anon, authenticated;
revoke all on function public.luxus_driver_login(text, text, text) from public, anon, authenticated;
revoke all on function public.luxus_driver_bookings(text, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.luxus_driver_update(text, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.luxus_driver_position(text, uuid, uuid, double precision, double precision) from public, anon, authenticated;
revoke all on function public.luxus_mark_paid(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.luxus_get_settings(text) to anon;
grant execute on function public.luxus_get_booking(text, text, text) to anon;
grant execute on function public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text) to anon;
grant execute on function public.luxus_customer_bookings(text, text, text) to anon;
grant execute on function public.luxus_track(text, text, text) to anon;
grant execute on function public.luxus_driver_login(text, text, text) to anon;
grant execute on function public.luxus_driver_bookings(text, uuid, timestamptz, timestamptz) to anon;
grant execute on function public.luxus_driver_update(text, uuid, uuid, text, integer, text) to anon;
grant execute on function public.luxus_driver_position(text, uuid, uuid, double precision, double precision) to anon;
grant execute on function public.luxus_mark_paid(text, text, integer, text) to anon;
revoke all on function luxus_private.sync_vehicle_count() from public;
