-- ============================================================================
-- Teko — 0003 : Chauffeurs, véhicules, documents KYC + RLS
-- ============================================================================

create table public.drivers (
  id                     uuid primary key references public.profiles(id) on delete cascade,
  kyc_status             public.kyc_status not null default 'pending',
  is_active              boolean not null default false,
  deactivated_reason     text,                                  -- ex. overdue_balance, admin
  rating_avg             numeric(3,2) not null default 0,
  categories             public.vehicle_category[] not null default '{}',
  gps_consent            boolean not null default false,
  current_balance_cache  numeric(14,2) not null default 0,      -- indicatif ; source de vérité = public.ledger
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on column public.drivers.current_balance_cache
  is 'Cache d''affichage. Le solde fait foi via la somme de public.ledger.';

create index drivers_active_idx on public.drivers (is_active) where is_active;
create index drivers_kyc_idx    on public.drivers (kyc_status);

create trigger drivers_set_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

create table public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  category    public.vehicle_category not null,
  plate       text,
  photo_url   text,
  created_at  timestamptz not null default now()
);
create index vehicles_driver_idx on public.vehicles (driver_id);

create table public.driver_documents (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.drivers(id) on delete cascade,
  type          public.document_type not null,
  storage_path  text not null,               -- chemin dans le bucket privé 'kyc'
  status        public.kyc_status not null default 'pending',
  note          text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index driver_documents_driver_idx on public.driver_documents (driver_id);
create index driver_documents_status_idx on public.driver_documents (status);

-- ----------------------------------------------------------------------------
-- Garde : un chauffeur ne peut pas modifier lui-même son KYC / activation
-- ----------------------------------------------------------------------------
create or replace function public.guard_driver_sensitive_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.kyc_status is distinct from old.kyc_status)
     or (new.is_active is distinct from old.is_active)
     or (new.deactivated_reason is distinct from old.deactivated_reason)
     or (new.rating_avg is distinct from old.rating_avg)
     or (new.current_balance_cache is distinct from old.current_balance_cache) then
    if not public.is_admin() then
      raise exception 'Champs sensibles chauffeur modifiables uniquement par un admin ou le service';
    end if;
  end if;
  return new;
end;
$$;

create trigger drivers_guard_sensitive
  before update on public.drivers
  for each row execute function public.guard_driver_sensitive_change();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.drivers           enable row level security;
alter table public.vehicles          enable row level security;
alter table public.driver_documents  enable row level security;

-- drivers : le chauffeur voit/édite sa fiche (champs sensibles protégés par trigger) ; admin tout.
create policy "drivers_select_self_or_admin"
  on public.drivers for select
  using ( id = auth.uid() or public.is_admin() );

create policy "drivers_insert_self_or_admin"
  on public.drivers for insert
  with check ( id = auth.uid() or public.is_admin() );

create policy "drivers_update_self_or_admin"
  on public.drivers for update
  using ( id = auth.uid() or public.is_admin() )
  with check ( id = auth.uid() or public.is_admin() );

-- vehicles : propriété du chauffeur ; admin tout.
create policy "vehicles_rw_owner_or_admin"
  on public.vehicles for all
  using ( driver_id = auth.uid() or public.is_admin() )
  with check ( driver_id = auth.uid() or public.is_admin() );

-- driver_documents : le chauffeur gère ses pièces ; seul l'admin revoit/valide.
create policy "documents_select_owner_or_admin"
  on public.driver_documents for select
  using ( driver_id = auth.uid() or public.is_admin() );

create policy "documents_insert_owner"
  on public.driver_documents for insert
  with check ( driver_id = auth.uid() );

create policy "documents_update_admin"
  on public.driver_documents for update
  using ( public.is_admin() )
  with check ( public.is_admin() );
