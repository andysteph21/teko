-- Chantier « alerte de course » (décision du porteur du 17 novembre 2026) :
-- la proposition de course arrive sur un canal Android dédié (sonnerie
-- longue, vibration forte, visible écran verrouillé). Un canal absent du
-- téléphone ferait disparaître la notification : l'app déclare donc, à
-- l'enregistrement de l'appareil, qu'elle possède ce canal. Les APK
-- antérieurs n'envoient pas ce paramètre et gardent le canal « teko-alerts ».
alter table public.devices add column offer_channel boolean not null default false;

drop function public.register_push_device(uuid, text, text);
create function public.register_push_device(
  p_user uuid, p_token text, p_platform text, p_offer_channel boolean default false)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null or auth.uid()<>p_user
    or coalesce(auth.jwt()->>'session_id','')='' then
    raise exception 'Session propriétaire requise' using errcode='42501';
  end if;
  if p_token !~ '^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{8,250}\]$'
    or p_token is null or p_platform not in ('android','ios') or p_platform is null then
    raise exception 'Jeton Expo ou plateforme invalide' using errcode='22023';
  end if;
  insert into public.devices(user_id,push_token,platform,session_id,last_seen,offer_channel)
    values(auth.uid(),p_token,p_platform,auth.jwt()->>'session_id',now(),coalesce(p_offer_channel,false))
  on conflict(push_token) do update set user_id=excluded.user_id,platform=excluded.platform,
    session_id=excluded.session_id,last_seen=now(),offer_channel=excluded.offer_channel;
end;
$$;
revoke all on function public.register_push_device(uuid,text,text,boolean) from public,anon;
grant execute on function public.register_push_device(uuid,text,text,boolean) to authenticated;

drop function public.claim_push_deliveries(uuid);
create function public.claim_push_deliveries(p_notification uuid default null)
returns table(id uuid,device_id uuid,push_token text,notification_id uuid,
  type text,payload jsonb,expires_at timestamptz,offer_channel boolean)
language sql security definer set search_path=public
as $$
  with candidates as (
    select q.id from public.push_deliveries q
    join public.notifications n on n.id=q.notification_id
    join public.devices d on d.id=q.device_id and d.user_id=n.user_id
    where q.status='pending' and q.next_attempt_at<=now() and q.expires_at>now()
      and q.attempts<5 and (p_notification is null or q.notification_id=p_notification)
    order by q.expires_at for update of q skip locked limit 10
  ), claimed as (
    update public.push_deliveries q set attempts=q.attempts+1,
      next_attempt_at=now()+interval '2 minutes',updated_at=now()
    where q.id in(select c.id from candidates c) returning q.*
  )
  select c.id,c.device_id,d.push_token,n.id,n.type,n.payload,c.expires_at,d.offer_channel
    from claimed c join public.notifications n on n.id=c.notification_id
    join public.devices d on d.id=c.device_id and d.user_id=n.user_id;
$$;
revoke all on function public.claim_push_deliveries(uuid) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(uuid) to service_role;
notify pgrst,'reload schema';
