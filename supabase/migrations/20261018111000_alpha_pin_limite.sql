-- Les refus de PIN sont des résultats, pas des exceptions : une exception
-- annulerait aussi l'incrément du compteur dans la transaction PostgreSQL.
alter table private.ride_pins add column failed_attempts integer not null default 0;
alter table private.ride_pins add column blocked_until timestamptz;
revoke execute on function public.start_ride(uuid,text) from public,anon,authenticated;

create function public.start_ride_checked(p_ride uuid,p_pin text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare r public.rides; secret private.ride_pins; attempts integer; blocked timestamptz;
begin
  select * into r from public.rides where id=p_ride for update;
  if not found or r.driver_id is distinct from auth.uid() then
    raise exception 'Action réservée au chauffeur assigné' using errcode='42501';
  end if;
  if r.status<>'arrived' then raise exception 'Transition invalide depuis le statut %',r.status; end if;
  select * into secret from private.ride_pins where ride_id=p_ride for update;
  if not found then raise exception 'Code indisponible'; end if;
  if secret.blocked_until>now() then
    return jsonb_build_object('error','pin_blocked','retry_after_s',
      ceil(extract(epoch from secret.blocked_until-now())));
  end if;
  if p_pin is null or p_pin is distinct from secret.pin_code then
    attempts:=case when secret.blocked_until is not null then 1 else secret.failed_attempts+1 end;
    blocked:=case when attempts>=5 then now()+interval '5 minutes' else null end;
    update private.ride_pins set failed_attempts=attempts,blocked_until=blocked where ride_id=p_ride;
    insert into public.ride_events(ride_id,type,actor,meta) values(p_ride,'pin_failed',auth.uid(),
      jsonb_build_object('attempt',attempts,'blocked',blocked is not null));
    return jsonb_build_object('error',case when blocked is null then 'pin_incorrect' else 'pin_blocked' end,
      'attempts_remaining',greatest(0,5-attempts),'retry_after_s',case when blocked is null then 0 else 300 end);
  end if;
  update private.ride_pins set failed_attempts=0,blocked_until=null where ride_id=p_ride;
  r:=public.start_ride(p_ride,p_pin);
  return jsonb_build_object('ride',to_jsonb(r));
end;
$$;
revoke all on function public.start_ride_checked(uuid,text) from public,anon;
grant execute on function public.start_ride_checked(uuid,text) to authenticated,service_role;
notify pgrst,'reload schema';
