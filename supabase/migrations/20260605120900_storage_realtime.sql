-- ============================================================================
-- Teko — 0010 : Storage (bucket KYC privé) + publication Realtime
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bucket privé pour les documents KYC (un dossier par chauffeur : "<uid>/...")
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Politiques d'accès au bucket kyc (RLS sur storage.objects, déjà activée par Supabase)
drop policy if exists "kyc_insert_own" on storage.objects;
create policy "kyc_insert_own"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text );

drop policy if exists "kyc_select_own_or_admin" on storage.objects;
create policy "kyc_select_own_or_admin"
  on storage.objects for select to authenticated
  using ( bucket_id = 'kyc'
          and ( (storage.foldername(name))[1] = auth.uid()::text or public.is_admin() ) );

drop policy if exists "kyc_update_own" on storage.objects;
create policy "kyc_update_own"
  on storage.objects for update to authenticated
  using ( bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text );

drop policy if exists "kyc_delete_admin" on storage.objects;
create policy "kyc_delete_admin"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'kyc' and public.is_admin() );

-- ----------------------------------------------------------------------------
-- Realtime : diffuser positions live + changements d'état de course
-- (publication supabase_realtime créée par Supabase ; on ajoute si absent)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ride_locations'
  ) then
    alter publication supabase_realtime add table public.ride_locations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rides'
  ) then
    alter publication supabase_realtime add table public.rides;
  end if;
exception
  when undefined_object then
    -- la publication n'existe pas (hors Supabase) : ignorer
    null;
end $$;
