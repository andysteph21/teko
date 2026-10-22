-- L'invitation porte sur le numéro vérifié par Auth, jamais sur un champ
-- de profil modifiable par l'utilisateur.
create table public.alpha_invites (
  id uuid primary key default gen_random_uuid(),
  phone text not null check(phone ~ '^[0-9]{8,15}$'),
  role text not null check(role in ('client','driver')),
  is_active boolean not null default true,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(phone,role)
);
alter table public.alpha_invites enable row level security;
revoke all on public.alpha_invites from public,anon,authenticated;
grant select on public.alpha_invites to authenticated;
grant all on public.alpha_invites to service_role;
create policy alpha_invites_ops_read on public.alpha_invites for select to authenticated
  using(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')));

create function public.is_alpha_invited(p_role text)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from auth.users u join public.alpha_invites i
    on i.phone=regexp_replace(u.phone,'[^0-9]','','g')
    where u.id=auth.uid() and u.phone_confirmed_at is not null and u.deleted_at is null
      and i.is_active and i.role=p_role);
$$;
revoke all on function public.is_alpha_invited(text) from public,anon;
grant execute on function public.is_alpha_invited(text) to authenticated,service_role;

create function private.assert_alpha_invited(p_role text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_alpha_invited(p_role) then
    raise exception 'Invitation alpha requise pour ce numéro vérifié' using errcode='42501';
  end if;
end;
$$;
revoke all on function private.assert_alpha_invited(text) from public,anon,authenticated;

create function public.invite_alpha(p_phone text,p_role text,p_active boolean default true)
returns public.alpha_invites language plpgsql security definer set search_path=public
as $$
declare result public.alpha_invites; digits text;
begin
  if not(public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops'))) then
    raise exception 'Invitations réservées aux opérations' using errcode='42501';
  end if;
  digits:=regexp_replace(p_phone,'[^0-9]','','g');
  insert into public.alpha_invites(phone,role,is_active,invited_by)
    values(digits,p_role,p_active,auth.uid())
    on conflict(phone,role) do update set is_active=excluded.is_active,
      invited_by=excluded.invited_by,updated_at=now() returning * into result;
  insert into public.audit_log(actor,action,entity,entity_id,after)
    values(auth.uid(),'alpha_invitation_changed','alpha_invite',result.id::text,
      jsonb_build_object('role',p_role,'is_active',p_active));
  return result;
end;
$$;
revoke all on function public.invite_alpha(text,text,boolean) from public,anon;
grant execute on function public.invite_alpha(text,text,boolean) to authenticated,service_role;

-- Garde dès le devis (appel de service) puis à la consommation (JWT usager).
alter function public.create_ride_quote(uuid,public.vehicle_category,extensions.geometry,
  extensions.geometry,integer,integer,text) rename to _create_ride_quote;
revoke all on function public._create_ride_quote(uuid,public.vehicle_category,extensions.geometry,
  extensions.geometry,integer,integer,text) from public,anon,authenticated;
create function public.create_ride_quote(p_client uuid,p_category public.vehicle_category,
  p_origin extensions.geometry,p_dest extensions.geometry,p_distance_m integer,p_duration_s integer,p_shape text)
returns public.ride_quotes language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from auth.users u join public.alpha_invites i
    on i.phone=regexp_replace(u.phone,'[^0-9]','','g') where u.id=p_client
      and u.phone_confirmed_at is not null and u.deleted_at is null
      and i.role='client' and i.is_active) then
    raise exception 'Invitation alpha requise pour ce numéro vérifié' using errcode='42501';
  end if;
  return public._create_ride_quote(p_client,p_category,p_origin,p_dest,p_distance_m,p_duration_s,p_shape);
end;
$$;
revoke all on function public.create_ride_quote(uuid,public.vehicle_category,extensions.geometry,
  extensions.geometry,integer,integer,text) from public,anon,authenticated;
grant execute on function public.create_ride_quote(uuid,public.vehicle_category,extensions.geometry,
  extensions.geometry,integer,integer,text) to service_role;

-- Le trigger protège aussi les anciens chemins de création conservés pour le service.
create function private.guard_alpha_request()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is not null and coalesce(auth.role(),'')='authenticated' then
    perform private.assert_alpha_invited('client');
    if new.client_id is distinct from auth.uid() or new.scheduled_at is not null
      or new.payment_method<>'cash' then
      raise exception 'Course immédiate en cash requise pour l''alpha' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_alpha_request() from public,anon,authenticated;
create trigger rides_alpha_request before insert on public.rides
  for each row execute function private.guard_alpha_request();

alter function public.driver_heartbeat(extensions.geometry) rename to _driver_heartbeat;
revoke all on function public._driver_heartbeat(extensions.geometry) from public,anon,authenticated;
create function public.driver_heartbeat(p_point extensions.geometry)
returns void language plpgsql security definer set search_path=public
as $$
begin
  perform private.assert_alpha_invited('driver');
  perform public._driver_heartbeat(p_point);
end;
$$;
revoke all on function public.driver_heartbeat(extensions.geometry) from public,anon;
grant execute on function public.driver_heartbeat(extensions.geometry) to authenticated,service_role;
revoke insert,update on public.driver_presence from authenticated;

alter function public.respond_offer(uuid,boolean) rename to _respond_offer;
revoke all on function public._respond_offer(uuid,boolean) from public,anon,authenticated;
create function public.respond_offer(p_offer uuid,p_accept boolean)
returns public.rides language plpgsql security definer set search_path=public
as $$
begin
  if p_accept then perform private.assert_alpha_invited('driver'); end if;
  return public._respond_offer(p_offer,p_accept);
end;
$$;
revoke all on function public.respond_offer(uuid,boolean) from public,anon;
grant execute on function public.respond_offer(uuid,boolean) to authenticated,service_role;

-- Un ancien heartbeat ne suffit pas si Ops a retiré l'invitation depuis.
do $$
declare definition text; updated text;
begin
  definition:=pg_get_functiondef('public.offer_next_driver(uuid)'::regprocedure);
  updated:=replace(definition,'where d.is_active and',
    'where exists(select 1 from auth.users u join public.alpha_invites i on i.phone=u.phone
      where u.id=d.id and u.phone_confirmed_at is not null and u.deleted_at is null
        and i.role=''driver'' and i.is_active) and d.is_active and');
  if updated=definition then raise exception 'Garde invitation du dispatch non installée'; end if;
  execute updated;
end;
$$;

-- Une invitation retirée après le devis interdit une nouvelle course, mais
-- un nouvel essai du devis déjà consommé retrouve la course existante.
do $$
declare definition text;
begin
  definition:=pg_get_functiondef('public.request_quoted_ride(uuid,text,text,uuid,uuid)'::regprocedure);
  definition:=replace(definition,'  if q.expires_at <= now()',
    E'  perform private.assert_alpha_invited(''client'');\n  if q.expires_at <= now()');
  execute definition;
end;
$$;
notify pgrst,'reload schema';
