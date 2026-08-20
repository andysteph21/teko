-- ============================================================================
-- Teko — 0004 : Référentiels géographiques (zones, repères, routes, traces) + RLS
-- Géométries PostGIS en SRID 4326 (type qualifié extensions.geometry).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Zones (découpage de service + grille tarifaire de repli)
-- ----------------------------------------------------------------------------
create table public.zones (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  geom             extensions.geometry(MultiPolygon, 4326) not null,
  is_active        boolean not null default false,
  coverage_status  public.coverage_status not null default 'insufficient',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index zones_geom_gix on public.zones using gist (geom);
create trigger zones_set_updated_at before update on public.zones
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Points de repère (landmarks) : adressage + guidage
-- ----------------------------------------------------------------------------
create table public.landmarks (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  aliases       text[] not null default '{}',
  category      public.landmark_category not null default 'other',
  geom          extensions.geometry(Point, 4326) not null,
  photo_url     text,
  zone_id       uuid references public.zones(id) on delete set null,
  salience      numeric(6,3) not null default 0,   -- score « connu/visible » pour le guidage
  usage_count   integer not null default 0,        -- nb de sélections comme repère/destination
  source        public.geo_source not null default 'admin',
  status        public.geo_status not null default 'proposed',
  created_by    uuid references public.profiles(id),
  validated_by  uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index landmarks_geom_gix   on public.landmarks using gist (geom);
create index landmarks_status_idx on public.landmarks (status);
create index landmarks_zone_idx   on public.landmarks (zone_id);
create trigger landmarks_set_updated_at before update on public.landmarks
  for each row execute function public.set_updated_at();

-- Propositions de repères (chauffeurs/clients) → revue admin
create table public.landmark_proposals (
  id            uuid primary key default gen_random_uuid(),
  landmark_id   uuid references public.landmarks(id) on delete set null, -- si rattaché à un existant
  name          text not null,
  category      public.landmark_category not null default 'other',
  geom          extensions.geometry(Point, 4326) not null,
  aliases       text[] not null default '{}',
  photo_url     text,
  proposed_by   uuid references public.profiles(id),
  role          public.user_role,
  status        public.geo_status not null default 'proposed',
  reviewed_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index landmark_proposals_geom_gix   on public.landmark_proposals using gist (geom);
create index landmark_proposals_status_idx on public.landmark_proposals (status);

-- ----------------------------------------------------------------------------
-- Routes Teko (couche routable custom)
-- ----------------------------------------------------------------------------
create table public.road_segments (
  id            uuid primary key default gen_random_uuid(),
  geom          extensions.geometry(LineString, 4326) not null,
  source        public.geo_source not null default 'admin',
  status        public.geo_status not null default 'draft',
  attributes    jsonb not null default '{}',        -- sens, type, praticabilité…
  created_by    uuid references public.profiles(id),
  validated_by  uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index road_segments_geom_gix   on public.road_segments using gist (geom);
create index road_segments_status_idx on public.road_segments (status);
create trigger road_segments_set_updated_at before update on public.road_segments
  for each row execute function public.set_updated_at();

-- Propositions de routes (générées depuis les traces GPS) → revue admin
create table public.road_proposals (
  id               uuid primary key default gen_random_uuid(),
  geom             extensions.geometry(LineString, 4326) not null,
  support_count    integer not null default 0,        -- nb de passages
  distinct_drivers integer not null default 0,         -- nb de chauffeurs distincts
  window_start     timestamptz,
  window_end       timestamptz,
  status           public.geo_status not null default 'proposed',
  derived_from     jsonb not null default '{}',
  reviewed_by      uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);
create index road_proposals_geom_gix   on public.road_proposals using gist (geom);
create index road_proposals_status_idx on public.road_proposals (status);

-- ----------------------------------------------------------------------------
-- Traces GPS (matière première du pipeline) — collecte consentie
-- ----------------------------------------------------------------------------
create table public.gps_traces (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  ride_id     uuid,                                    -- FK ajoutée après création de rides
  points      extensions.geometry(LineString, 4326) not null,
  consented   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index gps_traces_geom_gix   on public.gps_traces using gist (points);
create index gps_traces_driver_idx on public.gps_traces (driver_id);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.zones               enable row level security;
alter table public.landmarks           enable row level security;
alter table public.landmark_proposals  enable row level security;
alter table public.road_segments       enable row level security;
alter table public.road_proposals      enable row level security;
alter table public.gps_traces          enable row level security;

-- Zones : lecture par tout utilisateur authentifié ; écriture admin.
create policy "zones_read_authenticated" on public.zones for select
  using ( auth.uid() is not null );
create policy "zones_write_admin" on public.zones for all
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Landmarks : les repères VALIDÉS sont lisibles par tous ; les autres par l'admin.
create policy "landmarks_read_validated_or_admin" on public.landmarks for select
  using ( status = 'validated' or public.is_admin() );
create policy "landmarks_write_admin" on public.landmarks for all
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Propositions de repères : chauffeurs et clients peuvent proposer ; lecture par l'auteur ou l'admin ; validation admin.
create policy "landmark_proposals_insert_author" on public.landmark_proposals for insert
  with check ( proposed_by = auth.uid() );
create policy "landmark_proposals_select_author_or_admin" on public.landmark_proposals for select
  using ( proposed_by = auth.uid() or public.is_admin() );
create policy "landmark_proposals_update_admin" on public.landmark_proposals for update
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Routes : segments VALIDÉS lisibles par tous ; édition admin.
create policy "roads_read_validated_or_admin" on public.road_segments for select
  using ( status = 'validated' or public.is_admin() );
create policy "roads_write_admin" on public.road_segments for all
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Propositions de routes : admin uniquement (générées par le service).
create policy "road_proposals_admin_all" on public.road_proposals for all
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Traces GPS : le chauffeur insère/lit les siennes (si consenties) ; admin lit tout.
create policy "gps_traces_insert_owner" on public.gps_traces for insert
  with check ( driver_id = auth.uid() and consented );
create policy "gps_traces_select_owner_or_admin" on public.gps_traces for select
  using ( driver_id = auth.uid() or public.is_admin() );
