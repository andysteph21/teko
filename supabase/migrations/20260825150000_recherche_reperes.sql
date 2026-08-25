-- ============================================================================
-- Teko — Recherche de repères par nom (C-08), constat sur appareil réel :
-- « Marche » ne trouvait pas « Marché » (ilike sensible aux accents) et les
-- alias (« Mont Bouet ») étaient ignorés. La recherche est LE geste central
-- de l'adressage par repères : insensible aux accents et à la casse, sur le
-- nom ET les alias, repères validés seulement, saillance d'abord.
-- ============================================================================

create extension if not exists unaccent with schema extensions;

create or replace function public.search_landmarks(p_query text, p_limit int default 8)
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
   order by l.salience desc, l.name
   limit greatest(1, least(p_limit, 25));
$$;

revoke all on function public.search_landmarks(text, int) from public;
grant execute on function public.search_landmarks(text, int) to authenticated;
