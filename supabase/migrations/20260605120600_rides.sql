-- ============================================================================
-- Teko — 0006 : Courses, événements, positions live, évaluations + RLS
-- ============================================================================

create table public.rides (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.profiles(id) on delete restrict,
  driver_id            uuid references public.drivers(id) on delete set null,
  category             public.vehicle_category not null,
  status               public.ride_status not null default 'requested',
  scheduled_at         timestamptz,                                 -- null = course immédiate

  -- Localisation : épingles exactes + repères (adressage par point de repère)
  origin_geom          extensions.geometry(Point, 4326) not null,
  dest_geom            extensions.geometry(Point, 4326) not null,
  origin_landmark_id   uuid references public.landmarks(id) on delete set null,
  dest_landmark_id     uuid references public.landmarks(id) on delete set null,
  origin_hint          text,                                        -- « derrière », « à côté de »…
  dest_hint            text,
  meeting_landmark_id  uuid references public.landmarks(id) on delete set null, -- point de RDV suggéré

  -- Estimation / tarif
  distance_est_m       integer,
  duration_est_s       integer,
  price_est            numeric(12,2),
  price_final          numeric(12,2),
  payment_method       public.payment_method,
  pin_code             text,                                        -- code de démarrage

  -- Horodatages du cycle de vie
  created_at           timestamptz not null default now(),
  accepted_at          timestamptz,
  started_at           timestamptz,
  completed_at         timestamptz,
  cancel_reason        text,
  updated_at           timestamptz not null default now()
);

create index rides_client_idx    on public.rides (client_id, created_at desc);
create index rides_driver_idx    on public.rides (driver_id, created_at desc);
create index rides_status_idx    on public.rides (status);
create index rides_scheduled_idx on public.rides (scheduled_at) where scheduled_at is not null;
create index rides_origin_gix    on public.rides using gist (origin_geom);

create trigger rides_set_updated_at before update on public.rides
  for each row execute function public.set_updated_at();

-- FK différée de gps_traces.ride_id (table rides désormais créée)
alter table public.gps_traces
  add constraint gps_traces_ride_fk
  foreign key (ride_id) references public.rides(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Journal immuable des transitions de course
-- ----------------------------------------------------------------------------
create table public.ride_events (
  id         bigint generated always as identity primary key,
  ride_id    uuid not null references public.rides(id) on delete cascade,
  type       text not null,            -- requested, accepted, arrived, started, completed, sos, share…
  actor      uuid references public.profiles(id),
  meta       jsonb not null default '{}',
  at         timestamptz not null default now()
);
create index ride_events_ride_idx on public.ride_events (ride_id, at);

-- ----------------------------------------------------------------------------
-- Positions live (échantillonnées, rétention courte ; diffusion via Realtime)
-- ----------------------------------------------------------------------------
create table public.ride_locations (
  id         bigint generated always as identity primary key,
  ride_id    uuid not null references public.rides(id) on delete cascade,
  driver_id  uuid references public.drivers(id) on delete set null,
  geom       extensions.geometry(Point, 4326) not null,
  recorded_at timestamptz not null default now()
);
create index ride_locations_ride_idx on public.ride_locations (ride_id, recorded_at desc);
-- NOTE : prévoir un job de purge (rétention courte) ou un partitionnement par date.

-- ----------------------------------------------------------------------------
-- Évaluations (bidirectionnelles)
-- ----------------------------------------------------------------------------
create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (ride_id, from_user)
);
create index ratings_to_user_idx on public.ratings (to_user);

-- ----------------------------------------------------------------------------
-- Helper : l'utilisateur courant participe-t-il à la course ?
-- ----------------------------------------------------------------------------
create or replace function public.is_ride_participant(p_ride uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.rides r
    where r.id = p_ride
      and (r.client_id = auth.uid() or r.driver_id = auth.uid())
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.rides           enable row level security;
alter table public.ride_events     enable row level security;
alter table public.ride_locations  enable row level security;
alter table public.ratings         enable row level security;

-- rides : client propriétaire, chauffeur assigné, admin.
create policy "rides_select_participant_or_admin" on public.rides for select
  using ( client_id = auth.uid() or driver_id = auth.uid() or public.is_admin() );
create policy "rides_insert_client" on public.rides for insert
  with check ( client_id = auth.uid() );
create policy "rides_update_participant_or_admin" on public.rides for update
  using ( client_id = auth.uid() or driver_id = auth.uid() or public.is_admin() )
  with check ( client_id = auth.uid() or driver_id = auth.uid() or public.is_admin() );

-- ride_events : participants + admin (lecture/insertion) ; pas de modif/suppression.
create policy "ride_events_select" on public.ride_events for select
  using ( public.is_ride_participant(ride_id) or public.is_admin() );
create policy "ride_events_insert" on public.ride_events for insert
  with check ( public.is_ride_participant(ride_id) or public.is_admin() );

-- ride_locations : participants + admin.
create policy "ride_locations_select" on public.ride_locations for select
  using ( public.is_ride_participant(ride_id) or public.is_admin() );
create policy "ride_locations_insert_driver" on public.ride_locations for insert
  with check ( driver_id = auth.uid() );

-- ratings : participant note la course ; lecture par participants + admin ; note publique agrégée via rating_avg.
create policy "ratings_insert_participant" on public.ratings for insert
  with check ( from_user = auth.uid() and public.is_ride_participant(ride_id) );
create policy "ratings_select_participant_or_admin" on public.ratings for select
  using ( from_user = auth.uid() or to_user = auth.uid() or public.is_admin() );
