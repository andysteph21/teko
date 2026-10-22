-- Les frais deviennent une créance en attente ; aucun crédit chauffeur
-- n'est créé avant encaissement et validation Finance (18 octobre 2026).
alter table public.rides add column arrived_at timestamptz;
update public.rides set arrived_at=now() where status='arrived';

create function private.record_arrival()
returns trigger language plpgsql set search_path=public
as $$
begin
  if new.status='arrived' and old.status is distinct from 'arrived' then
    new.arrived_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.record_arrival() from public,anon,authenticated;
create trigger rides_record_arrival before update on public.rides
  for each row execute function private.record_arrival();

create table public.cancellation_claims (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides(id),
  client_id uuid not null references public.profiles(id),
  driver_id uuid not null references public.drivers(id),
  amount numeric(12,2) not null check(amount>0),
  driver_share numeric(12,2) not null check(driver_share>=0 and driver_share<=amount),
  status text not null default 'pending' check(status in ('pending','collected')),
  created_at timestamptz not null default now(),
  collected_at timestamptz
);
alter table public.cancellation_claims enable row level security;
revoke all on public.cancellation_claims from public,anon,authenticated;
grant select on public.cancellation_claims to authenticated;
grant all on public.cancellation_claims to service_role;
create policy claims_read_participant on public.cancellation_claims for select to authenticated
  using(client_id=auth.uid() or driver_id=auth.uid() or public.is_superadmin()
    or(public.is_admin() and public.has_admin_role('finance')));

create or replace function public.cancel_ride(
  p_ride uuid,p_reason text default null,p_status public.ride_status default null
) returns public.rides language plpgsql security definer set search_path=public
as $$
declare r public.rides; next_status public.ride_status; cfg jsonb;
  fee numeric:=0; share numeric:=0; wait_min integer;
begin
  select * into r from public.rides where id=p_ride for update;
  if not found then raise exception 'Course introuvable'; end if;
  if r.status not in ('requested','accepted','enroute','arrived') then
    raise exception 'Annulation impossible depuis le statut %',r.status;
  end if;
  if auth.uid()=r.client_id then next_status:='cancelled_client';
  elsif auth.uid()=r.driver_id then
    next_status:=coalesce(p_status,'cancelled_driver');
    if next_status not in ('cancelled_driver','no_show','no_answer') then
      raise exception 'Statut d''annulation invalide pour un chauffeur';
    end if;
  elsif public.is_superadmin() or(public.is_admin() and public.has_admin_role('ops')) then
    next_status:=coalesce(p_status,'cancelled_driver');
    if next_status not in ('cancelled_driver','cancelled_client') then
      raise exception 'Statut d''annulation invalide pour un admin';
    end if;
  else raise exception 'Non autorisé à annuler cette course' using errcode='42501';
  end if;
  select value into cfg from public.app_config where key='cancellation_fee';
  if next_status in ('no_show','no_answer') then
    wait_min:=coalesce((cfg->>'wait_min')::integer,5);
    if r.status<>'arrived' or r.arrived_at is null
      or now()<r.arrived_at+make_interval(mins=>wait_min) then
      raise exception 'Attente passager non écoulée' using errcode='22023';
    end if;
    fee:=coalesce((cfg->>next_status::text)::numeric,0);
  elsif next_status='cancelled_client' and r.driver_id is not null then
    fee:=greatest(coalesce((cfg->>'fixed')::numeric,0),
      coalesce((cfg->>'percent')::numeric,0)*r.price_est/100);
  end if;
  share:=public.cancellation_driver_share(fee,cfg);
  update public.rides set status=next_status,cancel_reason=p_reason,completed_at=now()
    where id=p_ride returning * into r;
  update public.ride_offers set status='cancelled',responded_at=now()
    where ride_id=p_ride and status='pending';
  if fee>0 and r.driver_id is not null then
    insert into public.cancellation_claims(ride_id,client_id,driver_id,amount,driver_share)
      values(r.id,r.client_id,r.driver_id,fee,share);
    perform public.enqueue_notification(r.client_id,'cancellation_fee',
      jsonb_build_object('ride_id',p_ride,'fee',fee,'status','pending'));
  end if;
  insert into public.ride_events(ride_id,type,actor,meta) values(p_ride,'cancelled',auth.uid(),
    jsonb_build_object('status',next_status,'fee',fee,'driver_share',share,'fee_status','pending'));
  perform public.enqueue_notification(r.client_id,'ride_cancelled',jsonb_build_object('ride_id',p_ride));
  if r.driver_id is not null then
    perform public.enqueue_notification(r.driver_id,'ride_cancelled',jsonb_build_object('ride_id',p_ride));
  end if;
  return r;
end;
$$;
notify pgrst,'reload schema';
