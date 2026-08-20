-- ============================================================================
-- Teko — 0002 : Profils + helpers de rôle + RLS
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role  not null default 'client',
  admin_role  public.admin_role,                       -- renseigné seulement si role = 'admin'
  phone       text unique,
  email       text,
  full_name   text,
  photo_url   text,
  locale      text not null default 'fr',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Profil applicatif lié à auth.users. Porte le rôle (client/driver/admin).';

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Helpers de rôle (SECURITY DEFINER : contournent la RLS pour éviter la récursion)
-- ----------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.is_driver()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'driver'); $$;

-- Vérifie qu'un admin possède un sous-rôle donné (superadmin couvre tout).
create or replace function public.has_admin_role(req public.admin_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and (admin_role = req or admin_role = 'superadmin')
  );
$$;

-- ----------------------------------------------------------------------------
-- Création auto du profil à l'inscription (OTP SMS → auth.users)
-- Rôle par défaut : client. Le passage en 'driver' se fait via le flux
-- d'onboarding chauffeur ; le rôle 'admin' est attribué côté back-office.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, email, role)
  values (new.id, new.phone, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Garde : empêche un non-admin d'élever son rôle (role / admin_role)
-- ----------------------------------------------------------------------------
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role)
     or (new.admin_role is distinct from old.admin_role) then
    if not public.is_admin() then
      raise exception 'Modification du rôle non autorisée';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using ( id = auth.uid() or public.is_admin() );

create policy "profiles_update_self_or_admin"
  on public.profiles for update
  using ( id = auth.uid() or public.is_admin() )
  with check ( id = auth.uid() or public.is_admin() );

-- L'insertion est gérée par le trigger handle_new_user (service role).
create policy "profiles_admin_insert"
  on public.profiles for insert
  with check ( public.is_admin() );
