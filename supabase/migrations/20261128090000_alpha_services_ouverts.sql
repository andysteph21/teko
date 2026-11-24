-- Les apps lisent l'ouverture du covoiturage et de la livraison sans créer
-- de devis d'essai. Le serveur reste seul juge : un devis est toujours refusé
-- tant que le service est fermé.
create function public.service_availability()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'shared_ride', coalesce((select (value->>'enabled')::boolean from public.app_config
      where key = 'shared_ride'), false),
    'delivery', coalesce((select (value->>'enabled')::boolean from public.app_config
      where key = 'delivery'), false));
$$;
revoke all on function public.service_availability() from public, anon;
grant execute on function public.service_availability() to authenticated;
notify pgrst, 'reload schema';
