-- Le PIN n'apparaît plus dans la ligne publiée par Realtime ou renvoyée
-- aux chauffeurs. Seul le passager peut le lire via ride_pin.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.ride_pins (
  ride_id uuid primary key references public.rides(id) on delete cascade
    deferrable initially deferred,
  pin_code text not null check (pin_code ~ '^[0-9]{4}$')
);
alter table private.ride_pins enable row level security;
revoke all on private.ride_pins from public, anon, authenticated;

insert into private.ride_pins(ride_id, pin_code)
select id, pin_code from public.rides where pin_code ~ '^[0-9]{4}$';
update public.rides set pin_code = null where pin_code is not null;
alter table public.rides add constraint rides_pin_is_private check (pin_code is null);

create function private.capture_ride_pin()
returns trigger language plpgsql security definer set search_path = public, extensions
as $$
begin
  insert into private.ride_pins(ride_id, pin_code)
  values (new.id, coalesce(new.pin_code,
    lpad((get_byte(gen_random_bytes(2), 0) * 256
      + get_byte(gen_random_bytes(2), 1)) % 10000 || '', 4, '0')));
  new.pin_code := null;
  return new;
end;
$$;
revoke all on function private.capture_ride_pin() from public, anon, authenticated;
create trigger rides_capture_private_pin before insert on public.rides
  for each row execute function private.capture_ride_pin();

create function public.ride_pin(p_ride uuid)
returns text language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.rides where id = p_ride and client_id = auth.uid()) then
    raise exception 'Code réservé au passager' using errcode = '42501';
  end if;
  return (select pin_code from private.ride_pins where ride_id = p_ride);
end;
$$;
revoke all on function public.ride_pin(uuid) from public, anon;
grant execute on function public.ride_pin(uuid) to authenticated, service_role;

create or replace function public.start_ride(p_ride uuid, p_pin text)
returns public.rides language plpgsql security definer set search_path = public
as $$
declare r public.rides; expected text;
begin
  select * into r from public.rides where id = p_ride for update;
  if not found then raise exception 'Course introuvable'; end if;
  if r.driver_id is distinct from auth.uid() then
    raise exception 'Action réservée au chauffeur assigné' using errcode = '42501';
  end if;
  if r.status <> 'arrived' then
    raise exception 'Transition invalide depuis le statut %', r.status;
  end if;
  select pin_code into expected from private.ride_pins where ride_id = p_ride;
  if p_pin is null or p_pin is distinct from expected then raise exception 'PIN incorrect'; end if;
  update public.rides set status = 'started', started_at = now()
    where id = p_ride returning * into r;
  insert into public.ride_events(ride_id, type, actor) values (p_ride, 'started', auth.uid());
  return r;
end;
$$;
notify pgrst, 'reload schema';
