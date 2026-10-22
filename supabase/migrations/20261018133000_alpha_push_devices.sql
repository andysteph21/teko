-- Un jeton Expo ne doit jamais notifier deux comptes successifs d'un même téléphone.
delete from public.devices a using public.devices b
  where a.push_token=b.push_token and (a.last_seen,a.id)<(b.last_seen,b.id);
alter table public.devices add constraint devices_push_token_unique unique(push_token);
alter table public.devices add column session_id text;
revoke insert,update,delete on public.devices from authenticated;

create function public.register_push_device(p_user uuid,p_token text,p_platform text)
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
  insert into public.devices(user_id,push_token,platform,session_id,last_seen)
    values(auth.uid(),p_token,p_platform,auth.jwt()->>'session_id',now())
  on conflict(push_token) do update set user_id=excluded.user_id,platform=excluded.platform,
    session_id=excluded.session_id,last_seen=now();
end;
$$;
create function public.unregister_session_devices()
returns void language sql security definer set search_path=public
as $$
  delete from public.devices where user_id=auth.uid()
    and session_id=auth.jwt()->>'session_id';
$$;
revoke all on function public.register_push_device(uuid,text,text),public.unregister_session_devices()
  from public,anon;
grant execute on function public.register_push_device(uuid,text,text),public.unregister_session_devices()
  to authenticated;
