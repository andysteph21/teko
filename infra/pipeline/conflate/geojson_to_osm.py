#!/usr/bin/env python3
"""Convertit les routes Teko validées (GeoJSON LineString) en OSM XML,
prêt à fusionner dans l'extract Gabon (osmium merge).

Identifiants : plage 10^15+ (aucune collision possible avec OSM, dont les
ids réels restent < 10^13) et stables par segment (hash de l'uuid) pour que
les rebuilds successifs produisent les mêmes ids (stratégie « identifiants
stables » du doc 06, §9).

Entrée  : GeoJSON FeatureCollection (stdin ou argv[1])
Sortie  : OSM XML (stdout ou argv[2])
"""

import hashlib
import json
import sys
from xml.sax.saxutils import escape

ID_BASE = 10**15


def stable_id(uuid: str, salt: str) -> int:
    h = hashlib.sha1(f"{salt}:{uuid}".encode()).hexdigest()
    return ID_BASE + int(h[:12], 16)


def main() -> None:
    src = open(sys.argv[1]) if len(sys.argv) > 1 else sys.stdin
    dst = open(sys.argv[2], "w") if len(sys.argv) > 2 else sys.stdout
    fc = json.load(src)

    nodes: list[tuple[int, float, float]] = []
    ways: list[tuple[int, list[int], dict[str, str]]] = []

    for feat in fc.get("features", []):
        geom = feat.get("geometry") or {}
        if geom.get("type") != "LineString":
            continue
        props = feat.get("properties") or {}
        seg_id = str(props.get("id"))
        attrs = props.get("attributes") or {}
        way_id = stable_id(seg_id, "way")
        # Ancrage réseau : si la proposition désigne des nœuds OSM existants
        # (attributes.connect_start_node / connect_end_node), la nouvelle voie
        # les référence — connectivité indispensable au ROUTING (les tuiles
        # d'affichage, elles, n'en ont pas besoin).
        connect_start = attrs.get("connect_start_node")
        connect_end = attrs.get("connect_end_node")
        coords = geom["coordinates"]
        refs: list[int] = []
        for i, (lon, lat) in enumerate(coords):
            if i == 0 and connect_start:
                refs.append(int(connect_start))
                continue
            if i == len(coords) - 1 and connect_end:
                refs.append(int(connect_end))
                continue
            nid = stable_id(seg_id, f"node:{i}")
            nodes.append((nid, lon, lat))
            refs.append(nid)
        tags = {
            "highway": str(attrs.get("highway", "residential")),
            "surface": str(attrs.get("surface", "unpaved")),
            "teko:segment": seg_id,
            "source": "teko",
        }
        if attrs.get("oneway"):
            tags["oneway"] = "yes"
        ways.append((way_id, refs, tags))

    nodes.sort(key=lambda n: n[0])
    ways.sort(key=lambda w: w[0])

    dst.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    dst.write('<osm version="0.6" generator="teko-conflate">\n')
    for nid, lon, lat in nodes:
        dst.write(f'  <node id="{nid}" version="1" lat="{lat:.7f}" lon="{lon:.7f}"/>\n')
    for wid, refs, tags in ways:
        dst.write(f'  <way id="{wid}" version="1">\n')
        for r in refs:
            dst.write(f'    <nd ref="{r}"/>\n')
        for k, v in tags.items():
            dst.write(f'    <tag k="{escape(k)}" v="{escape(v)}"/>\n')
        dst.write("  </way>\n")
    dst.write("</osm>\n")
    dst.flush()
    print(f"✓ {len(ways)} route(s) Teko, {len(nodes)} nœuds", file=sys.stderr)


if __name__ == "__main__":
    main()
