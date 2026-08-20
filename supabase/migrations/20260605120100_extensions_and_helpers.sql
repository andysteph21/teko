-- ============================================================================
-- Teko — 0001 : Extensions, types (enums) et fonctions utilitaires
-- Postgres 17 + PostGIS. Les types/fonctions transverses sont créés ici,
-- avant les tables qui les utilisent.
-- ============================================================================

-- PostGIS installé dans le schéma `extensions` (convention Supabase).
-- Les colonnes géométriques sont donc typées `extensions.geometry(...)`.
create schema if not exists extensions;            -- déjà présent sur Supabase (idempotent)
create extension if not exists postgis with schema extensions;

-- gen_random_uuid() est natif dans Postgres 17 (pas d'extension requise).

-- ----------------------------------------------------------------------------
-- Types énumérés
-- ----------------------------------------------------------------------------
create type public.user_role          as enum ('client','driver','admin');
create type public.admin_role         as enum ('ops','carto','finance','superadmin');
create type public.kyc_status         as enum ('pending','validated','rejected');
create type public.vehicle_category   as enum ('eco','moto','confort','covoiturage');
create type public.document_type      as enum ('id_card','license','registration','insurance','vehicle_photo','criminal_record','profile_photo');

create type public.ride_status        as enum ('requested','accepted','enroute','arrived','started','completed',
                                               'cancelled_client','cancelled_driver','no_show','no_answer','failed');
create type public.payment_method     as enum ('cash','airtel');

create type public.payment_kind       as enum ('ride_collection','driver_settlement','payout','cancellation_fee','refund');
create type public.payment_direction  as enum ('in','out');
create type public.payment_status     as enum ('initiated','pending','success','failed','ambiguous');

create type public.ledger_kind        as enum ('commission_due','mobile_credit','settlement','payout','cancellation','adjustment');
create type public.statement_status   as enum ('open','settled','overdue','paid_out');

create type public.geo_source         as enum ('osm','admin','driver','client','proposed');
create type public.geo_status         as enum ('draft','proposed','validated','rejected','merged');
create type public.landmark_category  as enum ('fuel_station','roundabout','market','church','school',
                                               'pharmacy','bar','building','junction','other');
create type public.coverage_status    as enum ('insufficient','ready');

-- ----------------------------------------------------------------------------
-- Fonction : maintien automatique de updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Fonction : jour ouvré Teko (coupure quotidienne à 04:00 Africa/Libreville)
-- Une transaction à 03:59 est rattachée au jour précédent ; à 04:00 au jour même.
-- ----------------------------------------------------------------------------
create or replace function public.business_day(ts timestamptz default now())
returns date
language sql
stable
as $$
  select ((ts at time zone 'Africa/Libreville') - interval '4 hours')::date;
$$;

comment on function public.business_day(timestamptz)
  is 'Jour ouvré Teko : coupure à 04:00 Africa/Libreville (modèle de solde journalier).';
