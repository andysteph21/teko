-- File d'envoi durable : ticket Expo distinct de l'acceptation par FCM/APNs.
create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','ticket','accepted','error','expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ticket_id text,
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(notification_id,device_id)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public,anon,authenticated;
grant all on public.push_deliveries to service_role;
create index push_deliveries_pending_idx on public.push_deliveries(status,next_attempt_at);

create or replace function public.notify_push_webhook()
returns trigger language plpgsql security definer set search_path=public,extensions
as $$
declare v_url text; v_secret text; v_expiry timestamptz;
begin
  v_expiry:=case when new.type='ride_offer' then (new.payload->>'expires_at')::timestamptz
    else now()+interval '24 hours' end;
  insert into public.push_deliveries(notification_id,device_id,expires_at)
    select new.id,d.id,v_expiry from public.devices d
      where d.user_id=new.user_id and d.last_seen>now()-interval '7 days'
        and v_expiry>now();
  select value #>> '{}' into v_url from public.app_config where key='push_webhook_url';
  select value #>> '{}' into v_secret from public.app_config where key='push_webhook_secret';
  if coalesce(v_url,'')<>'' and coalesce(v_secret,'')<>'' then
    begin
      perform net.http_post(url:=v_url,
        headers:=jsonb_build_object('Content-Type','application/json','x-teko-push-secret',v_secret),
        body:=jsonb_build_object('notification_id',new.id));
    exception when others then null; end;
  end if;
  return new;
end;
$$;

create function public.claim_push_deliveries(p_notification uuid default null)
returns table(id uuid,device_id uuid,push_token text,notification_id uuid,
  type text,payload jsonb,expires_at timestamptz)
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
  select c.id,c.device_id,d.push_token,n.id,n.type,n.payload,c.expires_at
    from claimed c join public.notifications n on n.id=c.notification_id
    join public.devices d on d.id=c.device_id and d.user_id=n.user_id;
$$;
revoke all on function public.claim_push_deliveries(uuid) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(uuid) to service_role;

create function public.sweep_push_delivery()
returns void language plpgsql security definer set search_path=public,extensions
as $$
declare v_url text; v_secret text;
begin
  update public.push_deliveries set status='expired',updated_at=now()
    where status='pending' and (expires_at<=now() or attempts>=5);
  -- Les tokens transférés à un nouveau compte ne reçoivent pas son prédécesseur.
  delete from public.push_deliveries q using public.notifications n,public.devices d
    where q.notification_id=n.id and q.device_id=d.id and n.user_id<>d.user_id;
  delete from public.push_deliveries where created_at<now()-interval '7 days';
  select value #>> '{}' into v_url from public.app_config where key='push_webhook_url';
  select value #>> '{}' into v_secret from public.app_config where key='push_webhook_secret';
  if coalesce(v_url,'')<>'' and coalesce(v_secret,'')<>'' then
    perform net.http_post(url:=v_url,
      headers:=jsonb_build_object('Content-Type','application/json','x-teko-push-secret',v_secret),
      body:='{}'::jsonb);
  end if;
end;
$$;
revoke all on function public.sweep_push_delivery() from public,anon,authenticated;
grant execute on function public.sweep_push_delivery() to service_role;
select cron.schedule('teko-alpha-push-delivery','* * * * *',$$select public.sweep_push_delivery();$$);
