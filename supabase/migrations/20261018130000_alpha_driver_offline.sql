-- La mise hors ligne est confirmée par le serveur ; aucune offre ne reste
-- acceptée après le retrait de présence. Les offres expirées sont reprises
-- par la cascade existante.
create function public.driver_offline()
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise' using errcode='42501';
  end if;
  delete from public.driver_presence where driver_id=auth.uid();
  update public.ride_offers set expires_at=least(expires_at,now())
    where driver_id=auth.uid() and status='pending';
end;
$$;
revoke all on function public.driver_offline() from public,anon;
grant execute on function public.driver_offline() to authenticated;
revoke delete on public.driver_presence from authenticated;
