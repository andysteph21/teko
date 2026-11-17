-- Audit du 11 novembre 2026 : avec 1 697 repères publiés dans tout le Gabon,
-- la recherche triée par saillance seule remontait des lieux d'autres villes.
-- p_near (optionnel) classe par tranches de 2 km autour du point fourni,
-- puis par saillance, puis par distance. Sans p_near, l'ordre antérieur est
-- conservé : les APK déjà installés appellent la fonction sans ce paramètre.
drop function public.search_landmarks(text, int);

create function public.search_landmarks(
  p_query text,
  p_limit int default 8,
  p_near extensions.geometry default null
)
returns setof public.landmarks
language sql
stable
security definer
set search_path = public, extensions
as $$
  select l.*
    from public.landmarks l
   where l.status = 'validated'
     and length(trim(p_query)) >= 2
     and (
       extensions.unaccent(lower(l.name))
         like '%' || extensions.unaccent(lower(trim(p_query))) || '%'
       or exists (
         select 1 from unnest(coalesce(l.aliases, '{}')) alias
          where extensions.unaccent(lower(alias))
            like '%' || extensions.unaccent(lower(trim(p_query))) || '%'
       )
     )
   order by
     case when p_near is null then 0
       else floor(extensions.st_distance(l.geom::extensions.geography,
         p_near::extensions.geography) / 2000) end,
     l.salience desc,
     case when p_near is null then 0
       else extensions.st_distance(l.geom::extensions.geography,
         p_near::extensions.geography) end,
     l.name
   limit greatest(1, least(p_limit, 25));
$$;

revoke all on function public.search_landmarks(text, int, extensions.geometry) from public, anon;
grant execute on function public.search_landmarks(text, int, extensions.geometry)
  to authenticated, service_role;
notify pgrst, 'reload schema';
