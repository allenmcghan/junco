# Junco PFD — synthetic-vision terrain + selectable map layers

**Date:** 2026-08-14
**Status:** design, awaiting review
**Scope:** the PFD layout mockup at `app/mockup/index.html` (single-file PWA).
**Live:** https://junco-pfd.pages.dev

## Context — where the code is now

The attitude indicator (AI, left circle) is an SVG `#horizon` group, clipped to
the AI circle, rotated by roll and translated by pitch. It contains: a sky rect,
a flat brown ground rect, three SVS hazard polygons (`svsTerrain`/`svsHazard`/
`svsPullup`), the white horizon line, and the pitch ladder (`app/mockup/index.html`
lines ~108–120).

The SVS engine (`svsRecompute`/`svsRender`, ~line 1220–1305) ray-casts the AWS
Terrarium elevation tiles across azimuth −90..+90° at 3° steps, keeping the
**maximum** terrain elevation angle per azimuth, and renders a single silhouette
plus the amber/red hazard fills.

The compass (HSI, right circle) shows a 3×3 OSM tile grid (`updateMapTiles`),
heading-up, clipped to the HSI circle, with the rose on top. The tile URL is
hard-coded to OpenStreetMap.

## Goals

1. **AI synthetic vision:** replace the flat ground + single silhouette with a
   layered, depth-shaded 3D terrain surface (Garmin-SVT style) so ridgelines
   rise into view and the pilot reads relief at a glance. Hazard tiers stay.
2. **HSI map layers:** a selector to switch the compass map between **street**,
   **terrain**, and **satellite** imagery.

## Non-goals (YAGNI)

- No map imagery draped on the AI (relief only — confirmed with user).
- No triangular-mesh terrain (approach B) — too heavy for a phone PWA.
- No 3D buildings, no offline pre-caching of all three tile layers.
- Not touching the engine strip, tapes, or BLE story.

---

## Feature 1 — HSI selectable map layers

### Tile sources (keyless, CORS-enabled, attributed)

| Layer | URL template | Attribution | Notes |
|---|---|---|---|
| street | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | © OpenStreetMap | current behaviour |
| terrain | `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` (`{s}`∈a,b,c) | © OpenTopoMap (CC-BY-SA) | topo relief + contours |
| satellite | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Esri, Maxar, Earthstar | **note `{z}/{y}/{x}` order, no extension** |

All three must be CORS-verified at implementation time (curl `Origin:` GET). If a
provider fails CORS or is unreachable, the layer still works as `<image>` tiles
(no canvas read needed here — CORS only matters for the AI elevation decode, not
for displaying map tiles), so this is display-only and low-risk.

### UI

- Add one cycle button to the control row: `#btnMapLayer`, label shows the
  current layer (`Map: Street` → `Map: Terrain` → `Map: Satellite`).
- A small attribution line under the HSI updates per layer (license requirement).

### Implementation

- Replace the hard-coded OSM URL in `updateMapTiles` with a `MAP_LAYERS` table of
  URL-builder functions keyed by a `MAP_LAYER` state var.
- `{s}` subdomain and `{z}/{y}/{x}` ordering handled per-layer in the builder.
- On layer change: clear the 3×3 `MAP_TILES` `href`s and force a re-fetch at the
  current position (reuse existing tile-positioning code unchanged).
- Tiles that 404/err hide via the existing `onerror` handler.

---

## Feature 2 — AI 3D synthetic-vision terrain (approach A: layered bands)

### Rendering model

Draw the terrain as a stack of **distance-ring silhouettes** using the painter's
algorithm (farthest first), which gives correct ridge occlusion for free:

- Rings at [12000, 8000, 5000, 2500, 1200, 600, 300] m.
- For each ring, sample terrain elevation **at that distance** across az −90..+90°
  (3° steps). Each ring becomes one filled polygon: top edge follows
  `y = horizonY − elevAngle(az, ring) · PX_PER_DEG`, closed along the bottom.
- Paint far → near. Nearer ridges paint over farther ones = occlusion.

### Shading (the "3D" read)

- **Atmospheric haze by distance:** far rings lighter and bluer
  (`#8FA6B4`-ish), near rings darker and browner (`#4A3418`-ish); interpolate
  across the 7 rings. This alone reads as depth.
- **Optional elevation tint (v1.1, deferred):** blend toward green (low) / grey-
  white (high peaks) by absolute metres. Deferred to keep v1 tight; noted so the
  band fill is written as a function, not a constant.

### Hazard integration

- Keep the existing amber (`< ~500 m clearance`) and red (`terrain above
  aircraft`) fills, computed from the **max-angle** profile, drawn **on top** of
  the bands so danger still pops through the haze shading.

### Data changes

- Restructure `svsRecompute` to produce `svsBands = [{ dist, pts:[{az,elev}] }]`
  (per-ring), and derive the max-angle hazard profile from the same samples in
  one pass (no extra tile reads).
- `svsRender` iterates `svsBands` far→near, then draws hazard overlays.
- Add ~7 `<polygon>` band elements inside `#horizon` (below the hazard polygons
  and horizon line). The flat brown ground rect stays as the backstop for
  azimuths/altitudes with no data.

### Performance

- 7 bands × ~61 points = 7 polygons/frame, recomputed only on heading Δ>5° or
  position move (existing throttle at ~line 920). Well within a phone's budget;
  no per-frame tile reads.
- Same tile cache as today (Terrarium 3×3 block); no new elevation fetches.

---

## Data flow

```
GPS lat/lon/hdg/alt ─┬─> updateMapTiles(layer)     ─> HSI map <image> grid
                     └─> svsRecompute()            ─> svsBands + hazard profile
                                                    ─> svsRender() ─> AI band polys
```

## Error handling / offline

- Map tiles: `onerror` hides the tile (existing). Layer switch never throws.
- Elevation tiles: missing/loading → band skips that sample; flat ground shows
  through. No canvas taint (Terrarium CORS verified in prior session).
- Service worker: bump cache `junco-pfd-v2` → `v3` so installs get the update.

## Testing / verification (Playwright, local server)

1. Each map layer: switch, assert tiles request the correct host, assert a tile
   `<image>` has a non-empty `href`, screenshot.
2. AI over the Columbia Gorge demo: assert `svsBands` produces 7 band polygons
   with points, assert near band is darker than far band (fill check), screenshot
   to eyeball the depth/relief.
3. Console: zero page errors on fresh load for every layer.
4. Flat-ground sanity: bands collapse to near the horizon, no false hazards.

## Open decisions

- **Elevation tint on the AI:** ship v1 haze-only (recommended) or include the
  green→peak tint now? (Design assumes haze-only, tint deferred.)
- **Satellite attribution wording** and whether to also offer a Terrarium
  hillshade blend under street (deferred).

## Rollout

- Branch → implement → verify with Playwright → deploy to Pages → commit → push
  (same flow as the SVS overlay that shipped as `010f596`).
