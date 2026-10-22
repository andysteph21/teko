-- Le départ reste celui du devis confirmé. Aucun repère proche imposé.
-- Le contrat à cinq paramètres reste compatible, avec rencontre explicitement absente.
create function private.request_quoted_ride(
  p_quote uuid, p_origin_hint text, p_dest_hint text,
  p_origin_landmark uuid, p_dest_landmark uuid, p_meeting_landmark uuid
) returns public.rides language plpgsql security definer
set search_path = public, extensions
as $$
declare q public.ride_quotes; r public.rides;
begin
  perform private.assert_alpha_invited('client');
  -- Verrou par passager : deux devis concurrents ne créent pas deux courses.
  perform 1 from public.profiles where id=auth.uid() and role='client'
    and deleted_at is null for update;
  if not found then raise exception 'Compte passager requis' using errcode='42501'; end if;
  select * into q from public.ride_quotes where id=p_quote for update;
  if not found or q.client_id is distinct from auth.uid() then
    raise exception 'Devis introuvable' using errcode='42501';
  end if;
  if q.ride_id is not null then
    select * into r from public.rides where id=q.ride_id;
    return r;
  end if;
  if q.expires_at <= now() then raise exception 'Devis expiré' using errcode='22023'; end if;
  if exists (select 1 from public.rides where client_id=auth.uid()
    and status in ('requested','accepted','enroute','arrived','started')) then
    raise exception 'Une course est en cours' using errcode='22023';
  end if;
  if p_origin_landmark is not null and not exists(
    select 1 from public.landmarks where id=p_origin_landmark and status='validated'
      and st_dwithin(geom::geography,q.origin_geom::geography,0.1)) then
    raise exception 'Repère de départ différent du devis' using errcode='22023';
  end if;
  if p_dest_landmark is not null and not exists(
    select 1 from public.landmarks where id=p_dest_landmark and status='validated'
      and st_dwithin(geom::geography,q.dest_geom::geography,0.1)) then
    raise exception 'Repère de destination différent du devis' using errcode='22023';
  end if;
  if p_meeting_landmark is not null and not exists(
    select 1 from public.landmarks where id=p_meeting_landmark and status='validated'
      and st_dwithin(geom::geography,q.origin_geom::geography,0.1)) then
    raise exception 'Un devis au point de rencontre confirmé est requis' using errcode='22023';
  end if;
  insert into public.rides(client_id,category,status,origin_geom,dest_geom,
    origin_landmark_id,dest_landmark_id,origin_hint,dest_hint,meeting_landmark_id,
    distance_est_m,duration_est_s,price_est,payment_method)
  values (q.client_id,q.category,'requested',q.origin_geom,q.dest_geom,
    p_origin_landmark,p_dest_landmark,p_origin_hint,p_dest_hint,p_meeting_landmark,
    q.distance_m,q.duration_s,q.price,'cash') returning * into r;
  update public.ride_quotes set ride_id=r.id where id=q.id;
  insert into public.ride_events(ride_id,type,actor,meta)
    values(r.id,'requested',auth.uid(),jsonb_build_object('quote_id',q.id,'price_est',q.price));
  return r;
end;
$$;
revoke all on function private.request_quoted_ride(uuid,text,text,uuid,uuid,uuid) from public,anon,authenticated;

create or replace function public.request_quoted_ride(
  p_quote uuid, p_origin_hint text default null, p_dest_hint text default null,
  p_origin_landmark uuid default null, p_dest_landmark uuid default null
) returns public.rides language sql security definer set search_path=public
as $$ select private.request_quoted_ride(p_quote,p_origin_hint,p_dest_hint,p_origin_landmark,p_dest_landmark,null); $$;

create function public.request_quoted_pickup(
  p_quote uuid, p_meeting_landmark uuid,
  p_origin_hint text default null, p_dest_hint text default null, p_dest_landmark uuid default null
) returns public.rides language plpgsql security definer set search_path=public
as $$
begin
  if p_meeting_landmark is null then
    raise exception 'Repère confirmé requis' using errcode='22023';
  end if;
  return private.request_quoted_ride(p_quote,p_origin_hint,p_dest_hint,p_meeting_landmark,p_dest_landmark,p_meeting_landmark);
end;
$$;
revoke all on function public.request_quoted_pickup(uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.request_quoted_pickup(uuid,uuid,text,text,uuid) to authenticated,service_role;
notify pgrst,'reload schema';
