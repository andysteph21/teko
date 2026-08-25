#!/usr/bin/env bash
# Prépare le chauffeur de test (+24107000002) : KYC validé, actif, véhicule.
set -euo pipefail
docker exec supabase_db_teko psql -U postgres -d postgres -Atqc "
set local teko.service = 'on';
insert into public.drivers (id, categories)
select id, array['eco']::vehicle_category[] from auth.users where phone='24107000002'
on conflict (id) do nothing;
update public.drivers d set kyc_status='validated', is_active=true
from auth.users u where u.phone='24107000002' and d.id=u.id;
update public.profiles p set role='driver', full_name=coalesce(p.full_name,'Boris Mba')
from auth.users u where u.phone='24107000002' and p.id=u.id;
insert into public.vehicles (driver_id, category, plate)
select u.id, 'eco', 'GA-482-LBV' from auth.users u
where u.phone='24107000002'
  and not exists (select 1 from public.vehicles v where v.driver_id=u.id);
select 'chauffeur prêt';"
