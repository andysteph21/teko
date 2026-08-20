-- ============================================================================
-- Teko — 0007 : Finance (paiements, grand livre immuable, relevés) + RLS
-- Les écritures financières sont réalisées par les Edge Functions (service role,
-- qui contourne la RLS). Les politiques ci-dessous régissent la LECTURE par les
-- utilisateurs ; aucune écriture directe n'est ouverte aux clients/chauffeurs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Paiements (mobile money / cash) — idempotence via partner_txn_id
-- ----------------------------------------------------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  ride_id         uuid references public.rides(id) on delete set null,
  driver_id       uuid references public.drivers(id) on delete set null,
  kind            public.payment_kind not null,
  provider        text not null default 'airtel',     -- 'airtel' (MVP) ; 'moov' (futur) ; 'cash'
  direction       public.payment_direction not null,
  amount          numeric(14,2) not null check (amount >= 0),
  currency        text not null default 'XAF',
  partner_txn_id  text not null unique,                -- clé d'idempotence (= transaction.id Airtel)
  provider_txn_id text,                                -- id généré par l'opérateur
  status          public.payment_status not null default 'initiated',
  raw             jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index payments_ride_idx   on public.payments (ride_id);
create index payments_driver_idx on public.payments (driver_id);
create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Grand livre (ledger) — source de vérité du solde, IMMUABLE
-- amount_signed < 0 = le chauffeur DOIT à Teko ; > 0 = Teko doit au chauffeur.
-- ----------------------------------------------------------------------------
create table public.ledger (
  id             bigint generated always as identity primary key,
  driver_id      uuid not null references public.drivers(id) on delete restrict,
  business_day   date not null,
  kind           public.ledger_kind not null,
  amount_signed  numeric(14,2) not null,
  balance_after  numeric(14,2) not null,
  ride_id        uuid references public.rides(id) on delete set null,
  payment_id     uuid references public.payments(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index ledger_driver_day_idx on public.ledger (driver_id, business_day);
create index ledger_driver_idx     on public.ledger (driver_id, created_at);

comment on table public.ledger
  is 'Journal immuable des mouvements de solde. Le solde courant = somme des amount_signed du chauffeur.';

-- Immuabilité : interdit UPDATE et DELETE (corrections via écriture d''ajustement).
create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Table % en append-only : % interdit', tg_table_name, tg_op;
end;
$$;

create trigger ledger_no_update before update on public.ledger
  for each row execute function public.prevent_mutation();
create trigger ledger_no_delete before delete on public.ledger
  for each row execute function public.prevent_mutation();

-- ----------------------------------------------------------------------------
-- Relevés journaliers (générés à la clôture 04:00)
-- ----------------------------------------------------------------------------
create table public.daily_statements (
  id                  uuid primary key default gen_random_uuid(),
  driver_id           uuid not null references public.drivers(id) on delete cascade,
  business_day        date not null,
  opening             numeric(14,2) not null default 0,
  closing             numeric(14,2) not null default 0,
  total_commission    numeric(14,2) not null default 0,
  total_mobile_credit numeric(14,2) not null default 0,
  settled_amount      numeric(14,2),
  payout_amount       numeric(14,2),
  status              public.statement_status not null default 'open',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (driver_id, business_day)
);
create index daily_statements_driver_idx on public.daily_statements (driver_id, business_day desc);

create trigger daily_statements_set_updated_at before update on public.daily_statements
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS (lecture seule pour les utilisateurs ; écriture via service role)
-- ----------------------------------------------------------------------------
alter table public.payments          enable row level security;
alter table public.ledger            enable row level security;
alter table public.daily_statements  enable row level security;

-- payments : le chauffeur voit les siens ; le client voit ceux de ses courses ; admin tout.
create policy "payments_select_scoped" on public.payments for select
  using (
    driver_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.rides r where r.id = payments.ride_id and r.client_id = auth.uid())
  );

-- ledger : chauffeur (le sien) + admin.
create policy "ledger_select_owner_or_admin" on public.ledger for select
  using ( driver_id = auth.uid() or public.is_admin() );

-- daily_statements : chauffeur (le sien) + admin.
create policy "statements_select_owner_or_admin" on public.daily_statements for select
  using ( driver_id = auth.uid() or public.is_admin() );

-- Aucune politique INSERT/UPDATE/DELETE pour les rôles utilisateurs :
-- ces opérations passent par les Edge Functions (service role, hors RLS).
