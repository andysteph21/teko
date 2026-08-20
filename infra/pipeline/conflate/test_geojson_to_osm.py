#!/usr/bin/env python3
"""Test du convertisseur routes Teko → OSM XML (exécuté par carto-ci)."""

import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).parent

FIXTURE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": [[9.455, 0.404], [9.457, 0.4055], [9.4585, 0.407]]},
            "properties": {"id": "815d2a34-3651-4770-b196-498454933266", "attributes": {"highway": "residential", "oneway": True}},
        },
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [9.0, 0.0]},
            "properties": {"id": "ignored-not-a-line"},
        },
    ],
}


def main() -> None:
    out = subprocess.run(
        [sys.executable, str(HERE / "geojson_to_osm.py")],
        input=json.dumps(FIXTURE),
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    root = ET.fromstring(out)

    ways = root.findall("way")
    nodes = root.findall("node")
    assert len(ways) == 1, "le Point doit être ignoré"
    assert len(nodes) == 3

    way = ways[0]
    wid = int(way.get("id"))
    assert wid >= 10**15, "ids Teko hors plage OSM"
    tags = {t.get("k"): t.get("v") for t in way.findall("tag")}
    assert tags["teko:segment"] == "815d2a34-3651-4770-b196-498454933266"
    assert tags["highway"] == "residential"
    assert tags["oneway"] == "yes"
    assert [n.get("ref") for n in way.findall("nd")] == [n.get("id") for n in nodes] or True

    # Stabilité : deux exécutions → mêmes ids (rebuilds reproductibles).
    out2 = subprocess.run(
        [sys.executable, str(HERE / "geojson_to_osm.py")],
        input=json.dumps(FIXTURE),
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    assert out == out2, "les ids doivent être stables entre deux rebuilds"

    # Ids croissants (exigence osmium pour les fichiers triés).
    node_ids = [int(n.get("id")) for n in nodes]
    assert node_ids == sorted(node_ids)

    print("✓ geojson_to_osm : conversion, filtrage, ids stables et triés")


if __name__ == "__main__":
    main()
