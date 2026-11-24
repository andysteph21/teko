-- Arbitrage A5 du 23 novembre 2026 : des frais d'annulation dus bloquent la
-- commande, y compris depuis un compte ouvert ensuite avec le même numéro
-- déclaré ou sur le même appareil. Réglable : cancellation_fee.block_orders.

-- Mémoire des comptes vus sur un appareil : `devices` ne garde que le dernier
-- propriétaire d'un jeton, ce qui effacerait le lien au changement de compte.
create table public.device_accounts (
  push_token text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_seen timestamptz not null default now(),
  primary key (push_token, user_id)
);
create index device_accounts_user on public.device_accounts(user_id);
alter table public.device_accounts enable row level security;
revoke all on public.device_accounts from public, anon, authenticated;
grant all on public.device_accounts to service_role;

insert into public.device_accounts(push_token, user_id, first_seen)
  select push_token, user_id, created_at from public.devices
  on conflict do nothing;

create function private.remember_device_account()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.device_accounts(push_token, user_id)
    values(new.push_token, new.user_id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.remember_device_account() from public, anon, authenticated;
create trigger devices_remember_account after insert or update of user_id, push_token
  on public.devices for each row execute function private.remember_device_account();

-- Le lien ne joue que d'un compte plus ancien vers un compte plus récent :
-- déclarer le numéro d'autrui ne bloque pas son compte déjà ouvert.
create function private.fees_due(p_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  with me as (
    select id, created_at, nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') as digits
    from public.profiles where id = p_user
  ), linked as (
    select p_user as id
    union
    select o.id from me join public.profiles o on o.id <> me.id
      and o.created_at < me.created_at and me.digits is not null
      and regexp_replace(coalesce(o.phone, ''), '\D', '', 'g') = me.digits
    union
    select theirs.user_id from me
      join public.device_accounts mine on mine.user_id = me.id
      join public.device_accounts theirs on theirs.push_token = mine.push_token
        and theirs.user_id <> me.id
      join public.profiles o on o.id = theirs.user_id and o.created_at < me.created_at
  )
  select coalesce((select (value->>'block_orders')::boolean from public.app_config
      where key = 'cancellation_fee'), true)
    and exists(select 1 from public.cancellation_claims c
      join linked on linked.id = c.client_id where c.status = 'pending');
$$;
revoke all on function private.fees_due(uuid) from public, anon, authenticated;

do $$
declare definition text; updated text; target regprocedure;
  anchor text := 'if not found then raise exception ''Compte passager requis'' using errcode=''42501''; end if;';
begin
  target := 'private.request_quoted_ride(uuid,text,text,uuid,uuid,uuid)'::regprocedure;
  definition := pg_get_functiondef(target);
  updated := replace(definition, anchor, anchor || '
  if private.fees_due(auth.uid()) then
    raise exception ''Frais d''''annulation à régler avant de commander'' using errcode=''42501'';
  end if;');
  if updated = definition then raise exception 'Garde des frais dus non installée'; end if;
  execute updated;
end;
$$;

notify pgrst, 'reload schema';
