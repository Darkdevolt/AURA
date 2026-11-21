-- Luxus Asaad — Clients absents, recharge / autonomie des véhicules électriques, validation des demandes
-- (à appliquer après 0004_mise_a_disposition.sql)

-- ---------------------------------------------------------------------------
-- Réglages
-- ---------------------------------------------------------------------------
alter table public.luxus_settings
  add column if not exists noshow_wait_minutes smallint not null default 10 check (noshow_wait_minutes between 0 and 60),
  add column if not exists noshow_block_after smallint not null default 2 check (noshow_block_after between 0 and 10),
  add column if not exists noshow_fee integer not null default 0 check (noshow_fee >= 0),
  add column if not exists range_km integer not null default 180 check (range_km between 0 and 1000),
  add column if not exists disposal_km_per_hour smallint not null default 15 check (disposal_km_per_hour between 0 and 100),
  add column if not exists charge_windows jsonb not null default '[{"start": "13:00", "end": "14:00", "label": "Recharge"}]'::jsonb;

-- ---------------------------------------------------------------------------
-- Réservations : absence, contre-proposition d'horaire, note admin
-- ---------------------------------------------------------------------------
alter table public.luxus_bookings
  add column if not exists noshow_at timestamptz,
  add column if not exists noshow_fee_due integer not null default 0 check (noshow_fee_due >= 0),
  add column if not exists proposed_start_at timestamptz,
  add column if not exists admin_note text check (char_length(admin_note) <= 500);

-- Réglages : la fonction renvoie la ligne entière, recréée pour les nouvelles colonnes
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
-- Créneaux occupés : ajoute les km prévus (pour l'autonomie)
-- ---------------------------------------------------------------------------
drop function if exists public.luxus_get_busy(text, timestamptz, timestamptz);
create function public.luxus_get_busy(p_token text, p_from timestamptz, p_to timestamptz)
returns table (start_at timestamptz, end_at timestamptz, kind text, km numeric, booking_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare cfg public.luxus_settings;
begin
  perform luxus_private.check_token(p_token);
  select * into cfg from public.luxus_settings s where s.id;
  return query
    select b.start_at, b.blocked_until, 'booking'::text,
           case when b.service = 'course'
                then b.distance_km + (cfg.approach_minutes / 60.0) * 20
                else (b.duration_min / 60.0) * cfg.disposal_km_per_hour end,
           b.id
      from public.luxus_bookings b
     where b.status not in ('cancelled', 'no_show', 'completed')
       and b.start_at < p_to and b.blocked_until > p_from
    union all
    select s.start_at, s.end_at, 'blocked'::text, 0::numeric, null::uuid
      from public.luxus_blocked_slots s
     where s.start_at < p_to and s.end_at > p_from;
end;
$$;

-- ---------------------------------------------------------------------------
-- Création : refuse les clients avec trop d'absences (ils doivent appeler)
-- ---------------------------------------------------------------------------
drop function if exists public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text, text);
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
  p_ip_hash text,
  p_service text default 'course'
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
  perform pg_advisory_xact_lock(hashtext('luxus_asaad_booking'));

  -- « luxus_settings.id » est qualifié : « id » est aussi une colonne de retour de la fonction
  select * into cfg from public.luxus_settings where luxus_settings.id;

  if p_service not in ('course', 'demi_journee', 'journee') then
    raise exception 'bad_service' using errcode = 'P0001';
  end if;

  if cfg.noshow_block_after > 0 and (select count(*) from public.luxus_bookings b
       where b.customer_phone = p_customer_phone and b.status = 'no_show') >= cfg.noshow_block_after then
    raise exception 'limit_noshow' using errcode = 'P0001';
  end if;

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
    comment, distance_km, duration_min, estimated_price, ip_hash, service
  ) values (
    p_customer_name, p_customer_phone, p_pickup_address, p_pickup_lat, p_pickup_lng, nullif(p_pickup_note, ''),
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng, p_start_at, p_blocked_until, p_passengers,
    nullif(p_comment, ''), p_distance_km, p_duration_min, p_estimated_price, p_ip_hash, p_service
  ) returning luxus_bookings.reference, luxus_bookings.id, luxus_bookings.tracking_token
    into v_ref, v_id, v_track;

  return query select v_ref, v_id, v_track;
end;
$$;

-- ---------------------------------------------------------------------------
-- Consultation client : ajoute la contre-proposition d'horaire et la formule
-- ---------------------------------------------------------------------------
drop function if exists public.luxus_get_booking(text, text, text);
create function public.luxus_get_booking(p_token text, p_reference text, p_phone text)
returns table (
  reference text, customer_name text, pickup_address text, pickup_note text,
  dropoff_address text, start_at timestamptz, passengers smallint, distance_km numeric,
  duration_min integer, estimated_price integer, status public.luxus_booking_status,
  tracking_token text, proposed_start_at timestamptz, service text
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
           b.tracking_token, b.proposed_start_at, b.service
      from public.luxus_bookings b
     where b.reference = upper(p_reference) and b.customer_phone = p_phone;
end;
$$;

-- ---------------------------------------------------------------------------
-- Réponse du client à une proposition d'horaire
-- (la disponibilité du nouvel horaire est vérifiée par le serveur avant l'appel)
-- ---------------------------------------------------------------------------
create or replace function public.luxus_respond_proposal(p_token text, p_reference text, p_phone text, p_accept boolean)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare b public.luxus_bookings;
begin
  perform luxus_private.check_token(p_token);
  perform pg_advisory_xact_lock(hashtext('luxus_asaad_booking'));
  select * into b from public.luxus_bookings x
   where x.reference = upper(p_reference) and x.customer_phone = p_phone for update;
  if not found then return 'not_found'; end if;
  if b.proposed_start_at is null or b.status not in ('pending', 'confirmed') then return 'no_proposal'; end if;
  if not p_accept then
    update public.luxus_bookings x set status = 'cancelled', proposed_start_at = null where x.id = b.id;
    return 'declined';
  end if;
  if b.proposed_start_at <= now() then return 'expired'; end if;
  update public.luxus_bookings x
     set start_at = b.proposed_start_at,
         blocked_until = b.proposed_start_at + (b.blocked_until - b.start_at),
         proposed_start_at = null,
         status = 'confirmed'
   where x.id = b.id;
  return 'accepted';
end;
$$;

-- ---------------------------------------------------------------------------
-- Chauffeur : « client absent » seulement après le délai d'attente
-- ---------------------------------------------------------------------------
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
declare
  v_vehicle uuid;
  cfg public.luxus_settings;
  v_start timestamptz;
begin
  perform luxus_private.check_token(p_token);
  select d.vehicle_id into v_vehicle from public.luxus_drivers d where d.id = p_driver and d.active;
  if not found then return 'unauthorized'; end if;
  if p_status not in ('confirmed', 'in_progress', 'completed', 'no_show') then return 'bad_status'; end if;
  select * into cfg from public.luxus_settings s where s.id;
  if p_status = 'no_show' then
    select b.start_at into v_start from public.luxus_bookings b where b.id = p_booking;
    if v_start is null then return 'not_found'; end if;
    if now() < v_start + make_interval(mins => cfg.noshow_wait_minutes) then return 'too_early'; end if;
  end if;
  update public.luxus_bookings b
     set status = p_status::public.luxus_booking_status,
         driver_id = p_driver,
         vehicle_id = coalesce(b.vehicle_id, v_vehicle),
         final_price = coalesce(p_final_price, b.final_price),
         payment_method = coalesce(nullif(p_payment_method, '')::public.luxus_payment_method, b.payment_method),
         noshow_at = case when p_status = 'no_show' then now() else b.noshow_at end,
         noshow_fee_due = case when p_status = 'no_show' then cfg.noshow_fee else b.noshow_fee_due end
   where b.id = p_booking and (b.driver_id = p_driver or b.driver_id is null)
     and b.status <> 'cancelled';
  if not found then return 'not_found'; end if;
  return 'ok';
end;
$$;

-- Le chauffeur voit aussi le nombre d'absences passées du client et la formule
drop function if exists public.luxus_driver_bookings(text, uuid, timestamptz, timestamptz);
create function public.luxus_driver_bookings(p_token text, p_driver uuid, p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, reference text, customer_name text, customer_phone text,
  pickup_address text, pickup_lat double precision, pickup_lng double precision, pickup_note text,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision,
  start_at timestamptz, passengers smallint, comment text, distance_km numeric, duration_min integer,
  estimated_price integer, final_price integer, payment_method public.luxus_payment_method,
  status public.luxus_booking_status, mine boolean, service text, noshow_wait_minutes smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare cfg public.luxus_settings;
begin
  perform luxus_private.check_token(p_token);
  if not exists (select 1 from public.luxus_drivers d where d.id = p_driver and d.active) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select * into cfg from public.luxus_settings s where s.id;
  return query
    select b.id, b.reference, b.customer_name, b.customer_phone, b.pickup_address, b.pickup_lat,
           b.pickup_lng, b.pickup_note, b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.start_at,
           b.passengers, b.comment, b.distance_km, b.duration_min, b.estimated_price, b.final_price,
           b.payment_method, b.status, (b.driver_id = p_driver), b.service, cfg.noshow_wait_minutes
      from public.luxus_bookings b
     where b.start_at >= p_from and b.start_at < p_to
       and (b.driver_id = p_driver or b.driver_id is null)
       and b.status <> 'cancelled'
     order by b.start_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
revoke all on function public.luxus_get_settings(text) from public, anon, authenticated;
revoke all on function public.luxus_get_busy(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.luxus_get_booking(text, text, text) from public, anon, authenticated;
revoke all on function public.luxus_respond_proposal(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.luxus_driver_update(text, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.luxus_driver_bookings(text, uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.luxus_get_settings(text) to anon;
grant execute on function public.luxus_get_busy(text, timestamptz, timestamptz) to anon;
grant execute on function public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text, text) to anon;
grant execute on function public.luxus_get_booking(text, text, text) to anon;
grant execute on function public.luxus_respond_proposal(text, text, text, boolean) to anon;
grant execute on function public.luxus_driver_update(text, uuid, uuid, text, integer, text) to anon;
grant execute on function public.luxus_driver_bookings(text, uuid, timestamptz, timestamptz) to anon;
