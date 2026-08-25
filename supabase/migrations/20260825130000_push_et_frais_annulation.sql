-- ============================================================================
-- Teko — Livraison des notifications (push FCM) + estimation des frais
-- d'annulation côté client.
--
-- 1) `notifications` rejoint la publication Realtime : les apps au premier
--    plan reçoivent leurs notifications en direct (RLS-scopées) — dont
--    l'offre chauffeur `ride_offer` (fenêtre de 12 s, spike doc 11 : le
--    Realtime seul ne suffit pas en arrière-plan → push FCM ci-dessous).
-- 2) Webhook push : AFTER INSERT sur notifications → pg_net POST vers
--    l'Edge Function notify-push (URL + secret dans app_config ; absents →
--    no-op silencieux, l'écriture métier n'est JAMAIS bloquée).
-- 3) `estimate_cancellation_fee(p_ride)` : montant affiché en C-21 — la
--    config n'est pas lisible côté client, le calcul fait foi côté serveur.
-- ============================================================================

-- 1) Publication Realtime -----------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- 2) Webhook push -------------------------------------------------------------
insert into public.app_config (key, value, description) values
  ('push_webhook_url',    'null'::jsonb, 'URL de l''Edge Function notify-push (null = push désactivé)'),
  ('push_webhook_secret', 'null'::jsonb, 'Secret partagé du webhook push (en-tête x-teko-push-secret)')
on conflict (key) do nothing;

create or replace function public.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value #>> '{}' into v_url    from public.app_config where key = 'push_webhook_url';
  select value #>> '{}' into v_secret from public.app_config where key = 'push_webhook_secret';
  if v_url is null or v_url = '' then
    return new;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-teko-push-secret', coalesce(v_secret, '')
    ),
    body    := jsonb_build_object(
      'notification_id', new.id,
      'user_id',         new.user_id,
      'type',            new.type,
      'payload',         new.payload
    )
  );
  return new;
exception when others then
  -- Le push est du meilleur-effort : ne jamais faire échouer l'insertion.
  return new;
end;
$$;

drop trigger if exists notifications_push_webhook on public.notifications;
create trigger notifications_push_webhook
  after insert on public.notifications
  for each row execute function public.notify_push_webhook();

-- 3) Frais d'annulation estimés ----------------------------------------------
create or replace function public.estimate_cancellation_fee(p_ride uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_ride   public.rides;
  v_config jsonb;
  v_fixed  numeric;
  v_pct    numeric;
begin
  select * into v_ride from public.rides where id = p_ride;
  if v_ride.id is null then
    raise exception 'Course introuvable';
  end if;
  if v_ride.client_id <> auth.uid()
     and coalesce(v_ride.driver_id, '00000000-0000-0000-0000-000000000000') <> auth.uid()
     and not public.is_admin() then
    raise exception 'Réservé aux participants';
  end if;
  -- Avant attribution, l'annulation est gratuite (décision n° 5).
  if v_ride.status = 'requested' then
    return 0;
  end if;
  select value into v_config from public.app_config where key = 'cancellation_fee';
  v_fixed := coalesce((v_config ->> 'fixed')::numeric, 0);
  v_pct   := coalesce((v_config ->> 'percent')::numeric, 0);
  return round(greatest(v_fixed, v_pct / 100.0 * coalesce(v_ride.price_est, 0)));
end;
$$;

revoke all on function public.estimate_cancellation_fee(uuid) from public;
grant execute on function public.estimate_cancellation_fee(uuid) to authenticated;
