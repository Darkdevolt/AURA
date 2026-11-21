-- Luxus Asaad — Reçu client (lien secret : référence + jeton de suivi)
create or replace function public.luxus_receipt(p_token text, p_reference text, p_tracking text)
returns table (
  reference text, created_at timestamptz, customer_name text, customer_phone text,
  pickup_address text, pickup_note text, dropoff_address text, start_at timestamptz,
  passengers smallint, distance_km numeric, duration_min integer, estimated_price integer,
  final_price integer, payment_method public.luxus_payment_method, paid_online boolean,
  status public.luxus_booking_status, service text, driver_name text, vehicle_name text,
  vehicle_model text, vehicle_plate text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform luxus_private.check_token(p_token);
  return query
    select b.reference, b.created_at, b.customer_name, b.customer_phone, b.pickup_address, b.pickup_note,
           b.dropoff_address, b.start_at, b.passengers, b.distance_km, b.duration_min, b.estimated_price,
           b.final_price, b.payment_method, b.paid_online, b.status, b.service,
           d.name, v.name, v.model, v.plate
      from public.luxus_bookings b
      left join public.luxus_drivers d on d.id = b.driver_id
      left join public.luxus_vehicles v on v.id = coalesce(b.vehicle_id, d.vehicle_id)
     where b.reference = upper(p_reference) and b.tracking_token = p_tracking;
end;
$$;
revoke all on function public.luxus_receipt(text, text, text) from public, anon, authenticated;
grant execute on function public.luxus_receipt(text, text, text) to anon;
