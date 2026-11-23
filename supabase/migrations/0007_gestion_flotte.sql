-- Luxus Asaad — Étape 1 de l'outil de gestion : fiche véhicule, documents, charges fixes, prêt,
-- journées d'activité, courses détaillées, mouvements de trésorerie et soldes.
-- Toutes les tables sont réservées à l'admin connecté (RLS).

-- ---------------------------------------------------------------------------
-- Fiche véhicule
-- ---------------------------------------------------------------------------
alter table public.luxus_vehicles
  add column if not exists version text check (char_length(version) <= 80),
  add column if not exists plug text check (char_length(plug) <= 30),
  add column if not exists in_service_on date,
  add column if not exists odometer_start_km integer check (odometer_start_km >= 0),
  add column if not exists notes text check (char_length(notes) <= 1000);

create table if not exists public.luxus_vehicle_docs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.luxus_vehicles (id) on delete cascade,
  kind text not null check (kind in ('photo', 'carte_grise', 'assurance', 'visite_technique', 'autre')),
  title text check (char_length(title) <= 120),
  number text check (char_length(number) <= 80),
  issued_on date,
  expires_on date,
  file_path text,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists luxus_vehicle_docs_vehicle_idx on public.luxus_vehicle_docs (vehicle_id);
alter table public.luxus_vehicle_docs enable row level security;
create policy "vehicle_docs: admin tout" on public.luxus_vehicle_docs
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('luxus-vehicles', 'luxus-vehicles', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
create policy "luxus vehicles: admin lecture" on storage.objects
  for select to authenticated using (bucket_id = 'luxus-vehicles' and (select public.luxus_is_admin()));
create policy "luxus vehicles: admin ajout" on storage.objects
  for insert to authenticated with check (bucket_id = 'luxus-vehicles' and (select public.luxus_is_admin()));
create policy "luxus vehicles: admin suppression" on storage.objects
  for delete to authenticated using (bucket_id = 'luxus-vehicles' and (select public.luxus_is_admin()));

-- ---------------------------------------------------------------------------
-- Charges fixes mensuelles (par véhicule) et prêt
-- ---------------------------------------------------------------------------
create table if not exists public.luxus_fixed_costs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.luxus_vehicles (id) on delete cascade,
  kind text not null check (kind in ('salaire', 'pret', 'entretien', 'amortissement', 'autre')),
  label text not null check (char_length(label) between 1 and 80),
  monthly_amount integer not null check (monthly_amount >= 0),
  -- false : n'entre que dans les états financiers (ex. amortissement), pas dans le résultat de gestion
  in_result boolean not null default true,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.luxus_fixed_costs enable row level security;
create policy "fixed_costs: admin tout" on public.luxus_fixed_costs
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

create table if not exists public.luxus_loans (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.luxus_vehicles (id) on delete cascade,
  label text not null default 'Prêt véhicule',
  lender text check (char_length(lender) <= 80),
  principal integer check (principal >= 0),        -- capital emprunté (à saisir)
  annual_rate numeric(6, 3) not null default 10.49, -- taux annuel en %
  months smallint not null default 84 check (months between 1 and 360),
  monthly_payment integer not null check (monthly_payment >= 0),
  first_due_on date,                                -- date de la 1re échéance (à saisir)
  created_at timestamptz not null default now()
);
alter table public.luxus_loans enable row level security;
create policy "loans: admin tout" on public.luxus_loans
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

-- ---------------------------------------------------------------------------
-- Journées d'activité Yango (une ligne par jour et par véhicule)
-- ---------------------------------------------------------------------------
create table if not exists public.luxus_days (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  vehicle_id uuid not null references public.luxus_vehicles (id) on delete cascade,
  trips integer not null default 0 check (trips >= 0),
  cash_collected integer not null default 0 check (cash_collected >= 0), -- encaissé passagers
  commissions integer not null default 0 check (commissions >= 0),
  net_yango integer not null default 0,
  bonus integer not null default 0 check (bonus >= 0),
  yango_topup integer not null default 0 check (yango_topup >= 0),        -- recharge du solde Yango
  yango_balance integer,                                                 -- solde Yango du soir
  km_start integer check (km_start >= 0),
  km_end integer check (km_end >= 0),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, day)
);
create index if not exists luxus_days_day_idx on public.luxus_days (day);
alter table public.luxus_days enable row level security;
create policy "days: admin tout" on public.luxus_days
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

-- Courses Yango détaillées (captures / liste du jour)
create table if not exists public.luxus_rides (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  at_time time,
  vehicle_id uuid references public.luxus_vehicles (id) on delete set null,
  amount_paid integer not null default 0 check (amount_paid >= 0),
  commission_service integer not null default 0,
  commission_partner integer not null default 0,
  net integer not null default 0,
  km numeric(6, 1),
  duration_min integer,
  payment text,
  pickup text check (char_length(pickup) <= 200),
  dropoff text check (char_length(dropoff) <= 200),
  order_no text check (char_length(order_no) <= 40),
  tariff text check (char_length(tariff) <= 30),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists luxus_rides_day_idx on public.luxus_rides (day);
alter table public.luxus_rides enable row level security;
create policy "rides: admin tout" on public.luxus_rides
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

-- ---------------------------------------------------------------------------
-- Recharges détaillées (colonnes ajoutées aux dépenses) et nouvelles catégories
-- Le péage est un frais personnel : il n'est plus une catégorie de dépense du véhicule.
-- ---------------------------------------------------------------------------
alter table public.luxus_expenses
  add column if not exists kwh numeric(6, 2),
  add column if not exists price_per_kwh integer,
  add column if not exists started_at time,
  add column if not exists ended_at time,
  add column if not exists battery_start smallint check (battery_start between 0 and 100),
  add column if not exists battery_end smallint check (battery_end between 0 and 100);
alter table public.luxus_expenses drop constraint if exists luxus_expenses_category_check;
alter table public.luxus_expenses add constraint luxus_expenses_category_check check (category in (
  'recharge', 'carburant', 'entretien', 'reparation', 'pneus', 'lavage', 'police', 'parking', 'assurance',
  'salaire', 'credit', 'amende', 'telephone', 'divers', 'autre'));

-- ---------------------------------------------------------------------------
-- Trésorerie : mouvements (coffre Wave, solde Yango, espèces chez le chauffeur) et soldes constatés
-- ---------------------------------------------------------------------------
create table if not exists public.luxus_cash_moves (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  at timestamptz,
  vehicle_id uuid references public.luxus_vehicles (id) on delete set null,
  account text not null default 'coffre' check (account in ('coffre', 'yango', 'especes')),
  direction text not null check (direction in ('entree', 'sortie')),
  amount integer not null check (amount > 0),
  kind text not null check (kind in (
    'versement_chauffeur',   -- le chauffeur verse au coffre
    'envoi_chauffeur',       -- envoi au chauffeur pour recharge / solde Yango (dépense de la voiture, PAS une avance)
    'retrait',               -- retrait pour une dépense
    'ancien_partenaire',     -- versements de l'ancien partenaire Yango
    'apport', 'salaire', 'avance_salaire', 'pret', 'autre')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists luxus_cash_moves_day_idx on public.luxus_cash_moves (day);
alter table public.luxus_cash_moves enable row level security;
create policy "cash_moves: admin tout" on public.luxus_cash_moves
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));

create table if not exists public.luxus_balances (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null,
  account text not null check (account in ('coffre', 'yango', 'especes')),
  amount integer not null,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
alter table public.luxus_balances enable row level security;
create policy "balances: admin tout" on public.luxus_balances
  for all to authenticated using ((select public.luxus_is_admin())) with check ((select public.luxus_is_admin()));
