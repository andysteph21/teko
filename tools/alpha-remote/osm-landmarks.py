#!/usr/bin/env python3
"""Génère le SQL d'import des repères nommés OpenStreetMap (Gabon entier).

Retour terrain du 10 novembre 2026 : deux repères validés ne permettent pas
de commander hors du centre de Libreville. Les repères produits sont publiés
`validated` avec source et provenance `osm` (ODbL) ; Ops peut les repasser en
brouillon depuis Cartographie. L'import est rejouable : un repère du même
nom à moins de 150 m n'est pas dupliqué.

Usage (pyosmium requis, hors dépendances du dépôt) :
  python3 tools/alpha-remote/osm-landmarks.py \
    infra/_data/osm/gabon-latest.osm.pbf > .local/alpha-remote/jour2/reperes-osm.sql
"""

import sys

import osmium

AMENITY = {
    "fuel": ("fuel_station", 7),
    "marketplace": ("market", 8),
    "place_of_worship": ("church", 5),
    "school": ("school", 5),
    "college": ("school", 6),
    "university": ("school", 7),
    "pharmacy": ("pharmacy", 6),
    "hospital": ("building", 8),
    "clinic": ("building", 6),
    "bank": ("building", 5),
    "police": ("building", 6),
    "townhall": ("building", 7),
    "bus_station": ("junction", 7),
    "bar": ("bar", 3),
    "restaurant": ("bar", 3),
}
OTHER = {
    ("shop", "supermarket"): ("building", 6),
    ("shop", "mall"): ("building", 7),
    ("tourism", "hotel"): ("building", 5),
    ("aeroway", "terminal"): ("building", 9),
    ("junction", "roundabout"): ("roundabout", 8),
    ("leisure", "stadium"): ("building", 7),
}
GRID = 0.0015  # ~150 m : un seul repère du même nom par maille.


def classify(tags):
    amenity = tags.get("amenity")
    if amenity in AMENITY:
        return AMENITY[amenity]
    for (key, value), result in OTHER.items():
        if tags.get(key) == value:
            return result
    return None


class Landmarks(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.rows = {}

    def keep(self, tags, lon, lat):
        name = (tags.get("name:fr") or tags.get("name") or "").strip()
        kind = classify(tags)
        if not kind or len(name) < 3 or len(name) > 80:
            return
        key = (name.casefold(), round(lon / GRID), round(lat / GRID))
        self.rows.setdefault(key, (name, kind[0], kind[1], lon, lat))

    def node(self, n):
        if n.tags and n.location.valid():
            self.keep(n.tags, n.location.lon, n.location.lat)

    def way(self, w):
        if not w.tags or "name" not in w.tags:
            return
        points = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
        if points:
            self.keep(
                w.tags,
                sum(p[0] for p in points) / len(points),
                sum(p[1] for p in points) / len(points),
            )


def quote(text):
    return "'" + text.replace("'", "''") + "'"


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    handler = Landmarks()
    handler.apply_file(sys.argv[1], locations=True)
    rows = sorted(handler.rows.values())
    print("-- Généré par tools/alpha-remote/osm-landmarks.py — © contributeurs OpenStreetMap, ODbL.")
    print(f"-- {len(rows)} repères nommés. Exécuter après sauvegarde de public.landmarks.")
    print("begin;")
    print("create temporary table osm_import(name text, category text, salience numeric,")
    print("  lon double precision, lat double precision) on commit drop;")
    print("insert into osm_import values")
    print(
        ",\n".join(
            f"  ({quote(name)},{quote(category)},{salience},{lon:.7f},{lat:.7f})"
            for name, category, salience, lon, lat in rows
        )
        + ";"
    )
    print(
        """insert into public.landmarks (name, category, geom, source, provenance, status, salience)
select i.name, i.category::public.landmark_category,
       extensions.ST_SetSRID(extensions.ST_MakePoint(i.lon, i.lat), 4326),
       'osm', 'osm', 'validated', i.salience
from osm_import i
where not exists (
  select 1 from public.landmarks l
  where lower(l.name) = lower(i.name)
    and extensions.ST_DWithin(l.geom::extensions.geography,
      extensions.ST_SetSRID(extensions.ST_MakePoint(i.lon, i.lat), 4326)::extensions.geography, 150)
);
commit;"""
    )


if __name__ == "__main__":
    main()
