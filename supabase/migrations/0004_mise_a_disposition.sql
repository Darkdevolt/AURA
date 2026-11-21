-- Luxus Asaad — Mise à disposition avec chauffeur (demi-journée / journée)

alter table public.luxus_settings
  add column if not exists half_day_enabled boolean not null default true,
  add column if not exists half_day_hours smallint not null default 5 check (half_day_hours between 1 and 12),
  add column if not exists half_day_price integer not null default 25000 check (half_day_price >= 0),
  add column if not exists full_day_enabled boolean not null default true,
  add column if not exists full_day_hours smallint not null default 10 check (full_day_hours between 1 and 14),
  add column if not exists full_day_price integer not null default 45000 check (full_day_price >= 0);

alter table public.luxus_bookings
  add column if not exists service text not null default 'course'
    check (service in ('course', 'demi_journee', 'journee'));

-- Réglages : la fonction renvoie la ligne entière, recréée pour inclure les nouvelles colonnes
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

-- Création de réservation : ajoute le type de service
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

revoke all on function public.luxus_get_settings(text) from public, anon, authenticated;
grant execute on function public.luxus_get_settings(text) to anon;
revoke all on function public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.luxus_create_booking(text, text, text, text, double precision, double precision, text, text, double precision, double precision, timestamptz, timestamptz, smallint, text, numeric, integer, integer, text, text) to anon;
