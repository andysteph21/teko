-- Ops doit pouvoir sélectionner la créance qu'il prépare, sans droit de crédit.
alter policy claims_read_participant on public.cancellation_claims to authenticated
  using(client_id=auth.uid() or driver_id=auth.uid() or public.is_superadmin()
    or(public.is_admin() and(public.has_admin_role('finance') or public.has_admin_role('ops'))));

-- La console réserve déjà la clôture au superadmin ; même garde sur la RPC.
create or replace function public.daily_close(p_day date default public.business_day())
returns integer language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is not null and not public.is_superadmin()
    and coalesce(auth.role(),'')<>'service_role' then
    raise exception 'Clôture réservée au superadmin' using errcode='42501';
  end if;
  return public._daily_close_unguarded(p_day);
end;
$$;

-- Deux offres différentes ne peuvent pas attribuer simultanément un même chauffeur.
create or replace function private.guard_alpha_assignment()
returns trigger language plpgsql set search_path=public
as $$
begin
  if old.status='requested' and new.status='accepted' then
    if now()>=old.created_at+make_interval(secs=>coalesce(
      (select value::text::integer from public.app_config where key='dispatch_timeout_s'),180)) then
      raise exception 'Recherche expirée' using errcode='22023';
    end if;
    perform 1 from public.drivers where id=new.driver_id for update;
    if exists(select 1 from public.rides where driver_id=new.driver_id and id<>new.id
      and status in ('accepted','enroute','arrived','started')) then
      raise exception 'Une course est en cours pour ce chauffeur' using errcode='22023';
    end if;
  end if;
  return new;
end;
$$;
notify pgrst,'reload schema';
