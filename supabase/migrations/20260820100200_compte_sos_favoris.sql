-- ============================================================================
-- Teko — 0018 : Cycle de vie du compte, sécurité des personnes, confort
-- Écarts E-04 (suppression 30 j), E-05/E-08 (SOS, partage de trajet,
-- incidents/litiges), E-06 (lieux favoris), E-09 (invitations admin),
-- E-10 (re-vérification après inactivité).
-- ============================================================================

insert into public.app_config (key, value, description) values
  ('deletion_grace_days',  '30', 'Fenêtre de rétractation avant purge du compte (jours).'),
  ('reverify_after_days',  '30', 'Inactivité au-delà de laquelle une re-vérification OTP est exigée (numéros recyclés).'),
  ('trip_share_ttl_hours', '24', 'Durée de vie d''un lien de partage de trajet (heures).')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- E-06 · Lieux favoris (C-08 raccourcis, C-19)
-- ----------------------------------------------------------------------------
create type public.saved_place_kind as enum ('home','work','other');

create table public.saved_places (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        public.saved_place_kind not null default 'other',
  label       text not null,
  geom        extensions.geometry(Point, 4326) not null,
  landmark_id uuid references public.landmarks(id) on delete set null,
  hint        text,
  created_at  timestamptz not null default now()
);
create index saved_places_user_idx on public.saved_places (user_id);

alter table public.saved_places enable row level security;
create policy "saved_places_owner" on public.saved_places
  for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

-- ----------------------------------------------------------------------------
-- E-05 · Partage de trajet (C-27) : lien public à jeton, lecture minimale.
-- ----------------------------------------------------------------------------
create table public.trip_shares (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token      text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index trip_shares_ride_idx on public.trip_shares (ride_id);

alter table public.trip_shares enable row level security;
create policy "trip_shares_owner" on public.trip_shares
  for all using ( created_by = auth.uid() or public.is_admin() )
  with check ( created_by = auth.uid() );

create or replace function public.create_trip_share(p_ride uuid)
returns public.trip_shares
language plpgsql security definer set search_path = public
as $$
declare v_row public.trip_shares;
  v_ttl integer := coalesce((select value::text::int from public.app_config where key = 'trip_share_ttl_hours'), 24);
begin
  if not public.is_ride_participant(p_ride) then
    raise exception 'Réservé aux participants de la course';
  end if;
  insert into public.trip_shares (ride_id, created_by, expires_at)
  values (p_ride, auth.uid(), now() + make_interval(hours => v_ttl))
  returning * into v_row;
  insert into public.ride_events (ride_id, type, actor) values (p_ride, 'share', auth.uid());
  return v_row;
end;
$$;

-- Vue publique du trajet partagé : anonyme, minimale, sans numéros ni ids.
create or replace function public.get_shared_trip(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_share public.trip_shares; v_ride public.rides;
begin
  select * into v_share from public.trip_shares
   where token = p_token and revoked_at is null and expires_at > now();
  if v_share is null then return null; end if;
  select * into v_ride from public.rides where id = v_share.ride_id;
  return jsonb_build_object(
    'status',        v_ride.status,
    'category',      v_ride.category,
    'plate',         (select v.plate from public.vehicles v where v.driver_id = v_ride.driver_id order by v.created_at desc limit 1),
    'driver_name',   (select split_part(coalesce(p.full_name, ''), ' ', 1) from public.profiles p where p.id = v_ride.driver_id),
    'dest_landmark', (select name from public.landmarks where id = v_ride.dest_landmark_id),
    'last_position', (select extensions.st_asgeojson(l.geom)::jsonb
                        from public.ride_locations l
                       where l.ride_id = v_ride.id order by l.recorded_at desc limit 1),
    'updated_at',    now()
  );
end;
$$;
grant execute on function public.get_shared_trip(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- E-05 / E-08 · Incidents : SOS, signalements, litiges (A-06, AM-02)
-- ----------------------------------------------------------------------------
create type public.incident_kind   as enum ('sos','report','dispute');
create type public.incident_status as enum ('open','in_progress','resolved');

create table public.incidents (
  id              uuid primary key default gen_random_uuid(),
  ride_id         uuid references public.rides(id) on delete set null,
  reporter        uuid not null references public.profiles(id) on delete cascade,
  kind            public.incident_kind not null,
  message         text,
  status          public.incident_status not null default 'open',
  assigned_to     uuid references public.profiles(id),
  resolution_note text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);
create index incidents_open_idx on public.incidents (status, created_at) where status <> 'resolved';

alter table public.incidents enable row level security;
create policy "incidents_insert_reporter" on public.incidents
  for insert with check ( reporter = auth.uid() );
create policy "incidents_select_reporter_or_admin" on public.incidents
  for select using ( reporter = auth.uid() or public.is_admin() );
create policy "incidents_update_admin" on public.incidents
  for update using ( public.is_admin() ) with check ( public.is_admin() );

create or replace function public.report_incident(
  p_kind public.incident_kind, p_message text default null, p_ride uuid default null
) returns public.incidents
language plpgsql security definer set search_path = public
as $$
declare v_row public.incidents; v_admin record;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_ride is not null and not public.is_ride_participant(p_ride) then
    raise exception 'Réservé aux participants de la course';
  end if;
  insert into public.incidents (ride_id, reporter, kind, message)
  values (p_ride, auth.uid(), p_kind, p_message)
  returning * into v_row;

  if p_ride is not null and p_kind = 'sos' then
    insert into public.ride_events (ride_id, type, actor) values (p_ride, 'sos', auth.uid());
  end if;
  -- Poste de garde (AM-02) : tous les admins ops + superadmins sont alertés.
  for v_admin in select id from public.profiles
                  where role = 'admin' and admin_role in ('ops','superadmin')
  loop
    perform public.enqueue_notification(v_admin.id,
      case when p_kind = 'sos' then 'sos_alert' else 'incident_reported' end,
      jsonb_build_object('incident_id', v_row.id, 'ride_id', p_ride, 'kind', p_kind));
  end loop;
  return v_row;
end;
$$;

-- ----------------------------------------------------------------------------
-- E-04 · Suppression de compte : rétractation 30 j, purge anonymisante (C-28)
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deleted_at            timestamptz,
  add column if not exists last_seen_at          timestamptz not null default now();

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_when timestamptz := now();
begin
  if v_uid is null then raise exception 'Authentification requise'; end if;
  if exists (select 1 from public.rides
              where (client_id = v_uid or driver_id = v_uid)
                and status in ('requested','accepted','enroute','arrived','started')) then
    raise exception 'Impossible : une course est en cours';
  end if;
  if public.is_driver() and public.driver_balance(v_uid) < 0 then
    raise exception 'Impossible : solde chauffeur à régler avant suppression';
  end if;
  perform public.set_service_mode(true);
  update public.profiles set deletion_requested_at = v_when where id = v_uid;
  perform public.set_service_mode(false);
  perform public.enqueue_notification(v_uid, 'deletion_requested',
    jsonb_build_object('purge_after',
      v_when + make_interval(days => coalesce((select value::text::int from public.app_config where key = 'deletion_grace_days'), 30))));
  return v_when;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  perform public.set_service_mode(true);
  update public.profiles set deletion_requested_at = null
   where id = auth.uid() and deleted_at is null;
  perform public.set_service_mode(false);
end;
$$;

-- Purge (job quotidien) : anonymise et fige. Les écritures financières
-- (ledger, payments) et les courses sont conservées, détachées de l'identité.
-- La désactivation du compte auth (bannissement) relève d'une Edge Function.
create or replace function public.purge_deleted_accounts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare r record; v_count integer := 0;
  v_grace integer := coalesce((select value::text::int from public.app_config where key = 'deletion_grace_days'), 30);
begin
  perform public.assert_admin_or_service();
  perform public.set_service_mode(true);
  for r in select id from public.profiles
            where deletion_requested_at is not null
              and deletion_requested_at < now() - make_interval(days => v_grace)
              and deleted_at is null
  loop
    update public.profiles
       set full_name = 'Compte supprimé', email = null, phone = null,
           photo_url = null, deleted_at = now()
     where id = r.id;
    delete from public.saved_places  where user_id = r.id;
    delete from public.devices       where user_id = r.id;
    delete from public.notifications where user_id = r.id;
    delete from public.data_usage    where user_id = r.id;
    delete from public.driver_presence where driver_id = r.id;
    v_count := v_count + 1;
  end loop;
  perform public.set_service_mode(false);
  return v_count;
end;
$$;

-- E-10 · Activité : rafraîchie à chaque ouverture d'app ; l'app force une
-- re-vérification OTP si needs_reverification() est vrai.
create or replace function public.touch_last_seen()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  perform public.set_service_mode(true);
  update public.profiles set last_seen_at = now() where id = auth.uid();
  perform public.set_service_mode(false);
end;
$$;

create or replace function public.needs_reverification()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select last_seen_at < now() - make_interval(days =>
        coalesce((select value::text::int from public.app_config where key = 'reverify_after_days'), 30))
       from public.profiles where id = auth.uid()),
    false);
$$;

-- ----------------------------------------------------------------------------
-- E-09 · Invitations équipe admin (A-08) — réservé superadmin ; l'invitation
-- est réclamée automatiquement à l'inscription du numéro invité.
-- ----------------------------------------------------------------------------
create table public.admin_invites (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  admin_role  public.admin_role not null,
  invited_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id)
);
create index admin_invites_phone_idx on public.admin_invites (phone) where accepted_at is null;

alter table public.admin_invites enable row level security;
create policy "invites_select_admin" on public.admin_invites
  for select using ( public.is_admin() );
create policy "invites_write_superadmin" on public.admin_invites
  for all using ( public.is_superadmin() ) with check ( public.is_superadmin() );

create or replace function public.invite_admin(p_phone text, p_role public.admin_role)
returns public.admin_invites
language plpgsql security definer set search_path = public
as $$
declare v_row public.admin_invites;
begin
  if not public.is_superadmin() then raise exception 'Réservé au superadmin'; end if;
  insert into public.admin_invites (phone, admin_role, invited_by)
  values (p_phone, p_role, auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

-- handle_new_user : rôle client par défaut, sauf invitation admin en attente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_invite public.admin_invites;
begin
  insert into public.profiles (id, phone, email, role)
  values (new.id, new.phone, new.email, 'client')
  on conflict (id) do nothing;

  if new.phone is not null then
    select * into v_invite from public.admin_invites
     where phone = new.phone and accepted_at is null and expires_at > now()
     order by created_at desc limit 1;
    -- NB : « v_invite is not null » serait faux dès qu'un champ est null
    -- (sémantique ROW IS NOT NULL) — on teste `found`.
    if found then
      perform public.set_service_mode(true);
      update public.profiles set role = 'admin', admin_role = v_invite.admin_role where id = new.id;
      perform public.set_service_mode(false);
      update public.admin_invites set accepted_at = now(), accepted_by = new.id where id = v_invite.id;
      insert into public.audit_log (actor, action, entity, entity_id, after)
      values (v_invite.invited_by, 'admin_invite_claimed', 'profile', new.id::text,
              jsonb_build_object('admin_role', v_invite.admin_role));
    end if;
  end if;
  return new;
end;
$$;
