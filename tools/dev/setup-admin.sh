#!/usr/bin/env bash
# Prépare l'admin de test (+24107000003) : rôle admin, superadmin, nommée.
# (L'utilisateur doit s'être connecté une fois — OTP test 123456 — pour
# exister dans auth.users.)
set -euo pipefail
docker exec supabase_db_teko psql -U postgres -d postgres -Atqc "
set local teko.service = 'on';
update public.profiles p
   set role='admin', admin_role='superadmin',
       full_name=coalesce(p.full_name,'Aline Koumba')
  from auth.users u
 where u.phone='24107000003' and p.id=u.id;
select 'admin prête : ' || count(*) from public.profiles p
  join auth.users u on u.id=p.id
 where u.phone='24107000003' and p.role='admin';"
