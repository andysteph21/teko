-- À activer uniquement pour Auth terrain. La configuration des bancs ne change pas.
create function public.alpha_before_phone_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone_digits text := regexp_replace(coalesce(event->'user'->>'phone', ''), '^\+', '');
begin
  if phone_digits ~ '^241[0-9]{8,9}$' and exists (
    select 1 from public.alpha_invites where phone=phone_digits and is_active
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Invitation alpha requise'));
end;
$$;

revoke all on function public.alpha_before_phone_signup(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.alpha_before_phone_signup(jsonb) to supabase_auth_admin;
