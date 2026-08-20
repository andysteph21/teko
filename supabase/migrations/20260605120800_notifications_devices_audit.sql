-- ============================================================================
-- Teko — 0008 : Notifications, appareils (push), conso data, audit + RLS
-- ============================================================================

create table public.devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  push_token  text not null,
  platform    text not null check (platform in ('android','ios')),
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, push_token)
);
create index devices_user_idx on public.devices (user_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Conso data journalière (alimente le widget ; mesure surtout côté app)
create table public.data_usage (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  day             date not null,
  bytes_estimated bigint not null default 0,
  unique (user_id, day)
);
create index data_usage_user_idx on public.data_usage (user_id, day desc);

-- Journal d'audit des actions admin (KYC, paramètres, validation routes/repères, finance)
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid references public.profiles(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_actor_idx  on public.audit_log (actor, at desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.devices        enable row level security;
alter table public.notifications  enable row level security;
alter table public.data_usage     enable row level security;
alter table public.audit_log      enable row level security;

-- devices : l'utilisateur gère ses appareils.
create policy "devices_rw_owner" on public.devices for all
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- notifications : l'utilisateur lit/met à jour (read_at) les siennes ; envoi via service role.
create policy "notifications_select_owner" on public.notifications for select
  using ( user_id = auth.uid() );
create policy "notifications_update_owner" on public.notifications for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- data_usage : l'utilisateur lit/écrit ses propres mesures.
create policy "data_usage_rw_owner" on public.data_usage for all
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- audit_log : lecture admin uniquement ; écriture via service role.
create policy "audit_log_select_admin" on public.audit_log for select
  using ( public.is_admin() );
