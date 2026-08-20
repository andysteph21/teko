-- ============================================================================
-- Teko — 0005 : Tarification & configuration + RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Règles tarifaires (versionnées par valid_from), par catégorie et zone optionnelle
-- ----------------------------------------------------------------------------
create table public.pricing_rules (
  id            uuid primary key default gen_random_uuid(),
  category      public.vehicle_category not null,
  zone_id       uuid references public.zones(id) on delete cascade,  -- null = règle globale
  base_fare     numeric(12,2) not null default 0,   -- prise en charge (XAF)
  per_km        numeric(12,2) not null default 0,
  per_min       numeric(12,2) not null default 0,
  min_fare      numeric(12,2) not null default 0,
  multipliers   jsonb not null default '{}',        -- ex. {"night":1.2,"zone_x":1.1}
  valid_from    timestamptz not null default now(),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index pricing_rules_lookup_idx on public.pricing_rules (category, zone_id, valid_from desc);

comment on table public.pricing_rules
  is 'Barème par catégorie/zone. La devise est le XAF. Historisé via valid_from.';

-- ----------------------------------------------------------------------------
-- Configuration applicative (clé/valeur typée jsonb) — commission, frais, seuils…
-- Ex. de clés : commission, cancellation_fee, settlement_cutoff_hour (=4),
--               reminder_window_min, payout_threshold, badge_min_rating (=4.5),
--               road_detect_thresholds, landmark_search_radius_m
-- ----------------------------------------------------------------------------
create table public.app_config (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

create trigger app_config_set_updated_at before update on public.app_config
  for each row execute function public.set_updated_at();

-- Historique des changements de configuration (audit léger)
create table public.app_config_history (
  id          bigint generated always as identity primary key,
  key         text not null,
  old_value   jsonb,
  new_value   jsonb,
  changed_by  uuid references public.profiles(id),
  changed_at  timestamptz not null default now()
);

create or replace function public.log_app_config_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.app_config_history(key, old_value, new_value, changed_by)
  values (new.key, case when tg_op = 'UPDATE' then old.value else null end, new.value, auth.uid());
  return new;
end;
$$;

create trigger app_config_history_trg
  after insert or update on public.app_config
  for each row execute function public.log_app_config_change();

-- ----------------------------------------------------------------------------
-- Valeurs par défaut (paramétrables ensuite par l'admin ; certaines restent à arrêter)
-- ----------------------------------------------------------------------------
insert into public.app_config (key, value, description) values
  ('commission',             '{"type":"percent","value":null}', 'Commission Teko par course (taux/forme à arrêter).'),
  ('settlement_cutoff_hour', '4',                                 'Heure de coupure quotidienne (Africa/Libreville).'),
  ('reminder_window_min',    '120',                               'Fenêtre de rappel d''échéance (minutes avant coupure).'),
  ('payout_threshold',       '0',                                 'Montant minimal de payout (XAF).'),
  ('badge_min_rating',       '4.5',                               'Note minimale pour le badge Top Service.'),
  ('cancellation_fee',       '{"no_show":null,"no_answer":null,"wait_min":null}', 'Frais d''annulation (à arrêter).'),
  ('road_detect_thresholds', '{"min_passes":null,"min_distinct_drivers":null,"window_days":null}', 'Seuils de détection de routes.'),
  ('landmark_search_radius_m','150',                              'Rayon de recherche du repère par manœuvre (guidage).')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.pricing_rules        enable row level security;
alter table public.app_config           enable row level security;
alter table public.app_config_history   enable row level security;

-- Tarifs : lecture par tout authentifié (nécessaire aux estimations) ; écriture admin.
create policy "pricing_read_authenticated" on public.pricing_rules for select
  using ( auth.uid() is not null );
create policy "pricing_write_admin" on public.pricing_rules for all
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Config : lecture par tout authentifié ; écriture admin.
create policy "config_read_authenticated" on public.app_config for select
  using ( auth.uid() is not null );
create policy "config_write_admin" on public.app_config for all
  using ( public.is_admin() ) with check ( public.is_admin() );

-- Historique config : admin uniquement.
create policy "config_history_admin" on public.app_config_history for select
  using ( public.is_admin() );
