#!/usr/bin/env python3
"""Regenerate app/mockup/data/airports.json from OurAirports.

OurAirports is public domain and community maintained. Run this when the data
gets stale; there is no need to run it to build the app, because the output is
committed. Bundling rather than fetching is deliberate: the point of "nearest
airport" is that it works when there is no signal.

SPDX-License-Identifier: GPL-2.0-or-later
"""
import csv, io, json, os, sys, urllib.request

BASE = "https://davidmegginson.github.io/ourairports-data/"
KEEP = {"small_airport", "medium_airport", "large_airport",
        "seaplane_base", "heliport", "balloonport"}
TCODE = {"small_airport": "S", "medium_airport": "M", "large_airport": "L",
         "seaplane_base": "W", "heliport": "H", "balloonport": "B"}
COUNTRY = os.environ.get("JUNCO_COUNTRY", "US")
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "mockup", "data", "airports.json")


def fetch(name):
    with urllib.request.urlopen(BASE + name, timeout=120) as r:
        return csv.DictReader(io.StringIO(r.read().decode("utf-8")))


def main():
    aps = {}
    for r in fetch("airports.csv"):
        if r["iso_country"] != COUNTRY or r["type"] not in KEEP:
            continue
        try:
            lat, lon = round(float(r["latitude_deg"]), 5), round(float(r["longitude_deg"]), 5)
        except ValueError:
            continue
        aps[r["ident"]] = [r["local_code"] or r["ident"], r["name"][:34], lat, lon,
                           int(float(r["elevation_ft"] or 0)), TCODE[r["type"]], []]

    freqs = 0
    for r in fetch("airport-frequencies.csv"):
        a = aps.get(r["airport_ident"])
        if not a:
            continue
        try:
            a[6].append([(r["type"] or "")[:7], round(float(r["frequency_mhz"]), 3)])
            freqs += 1
        except ValueError:
            pass

    rows = sorted(aps.values(), key=lambda a: a[2])      # latitude order: the app bisects on it
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, separators=(",", ":"))
    print(f"{len(rows)} airports, {freqs} frequencies -> {OUT}")
    print(f"{os.path.getsize(OUT)/1024:.0f} kB uncompressed")


if __name__ == "__main__":
    sys.exit(main())
