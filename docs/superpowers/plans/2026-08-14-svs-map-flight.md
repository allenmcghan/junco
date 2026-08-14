# Synthetic Vision, Map Layers & Believable Flight — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Junco PFD mockup's demo into a believable flight — a scripted gorge route flown with real turn physics, a track-history breadcrumb and a curved Garmin-style trend vector on the compass map — then give the attitude indicator layered 3D synthetic-vision terrain and the compass a street/terrain/satellite layer selector.

**Architecture:** Single-file vanilla-JS SVG PWA (`app/mockup/index.html`). A per-frame flight model drives `att`/`gps`/`sim`; the HSI map group gets overlay polylines; the SVS engine is restructured from one silhouette into distance-ring bands. No build step, no framework.

**Tech Stack:** HTML/SVG/JS, AWS Terrarium elevation tiles, OSM/OpenTopoMap/Esri raster tiles, Cloudflare Pages, Playwright for verification.

**Verification model:** This codebase has **no unit-test runner**. Each task is verified by serving locally (`python3 -m http.server 8744 -d app/mockup`) and driving Playwright with `browser_evaluate` assertions against page state/DOM, plus a screenshot. Always load with a cache-buster query (`?v=N`) — `http.server` sends 304s and the SVG is otherwise cached.

**Spec:** `docs/superpowers/specs/2026-08-14-svs-terrain-and-map-layers-design.md`

---

## File structure

Everything is in `app/mockup/index.html` (plus `sw.js` cache bump, `README.md` note). The single file is the established pattern for this mockup; do not split it. New code is grouped by responsibility with section comments:

- **Flight model** — `ROUTE`, `flt` state, `flyRoute()` (replaces `demoFlight`).
- **Map projection helper** — `mapProject()` (factored so tiles + overlays share it).
- **Track overlays** — `TRACK_HIST`, `pushTrack()`, `renderTrack()`, `renderTrend()`.
- **SVS bands** — `svsRecompute()` (rewritten to fill `svsBands`), `svsRender()` (rewritten to paint bands), band polygon group.
- **Map layers** — `MAP_LAYERS`, `MAP_LAYER`, `tileUrl()`, `#btnMapLayer`, `#mapAttrib`.

---

## STAGE 1 — Believable flight (Feature 3)

### Task 1: Scripted waypoint route + coordinated-turn flight model

**Files:**
- Modify: `app/mockup/index.html` — replace `demoFlight` (~lines 770–780) and the demo branch of `frame()` (~lines 815–825).

- [ ] **Step 1: Define the route and flight state.** Replace the `demoLat`/`demoLon` + `demoFlight` block (lines ~770–780) with:

```js
// Demo route: a string of waypoints down the Columbia River Gorge, following
// the river so the flight stays in dramatic terrain. Flown with coordinated
// turns and looped. (lat, lon)
var ROUTE = [
  { lat: 45.690, lon: -121.700 },
  { lat: 45.694, lon: -121.740 },
  { lat: 45.699, lon: -121.795 },
  { lat: 45.706, lon: -121.860 },
  { lat: 45.712, lon: -121.900 },
  { lat: 45.700, lon: -121.930 },  // bend south around Bonneville
  { lat: 45.685, lon: -121.900 },
  { lat: 45.680, lon: -121.850 },
  { lat: 45.682, lon: -121.790 },
  { lat: 45.686, lon: -121.735 }
];
// Flight state
var flt = { lat: ROUTE[0].lat, lon: ROUTE[0].lon, hdg: 270, bank: 0, gs: 27, alt: 2000, vs: 0, wp: 1 };

function bearingTo(lat1, lon1, lat2, lon2) {
  var y = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
  var x = (lat2 - lat1);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function distM(lat1, lon1, lat2, lon2) {
  var dlat = (lat2 - lat1) * 111111;
  var dlon = (lon2 - lon1) * 111111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180);
  return Math.hypot(dlat, dlon);
}
```

- [ ] **Step 2: Write the per-frame flight integrator.** Add after the helpers above:

```js
// Advance the flight one frame (dt seconds). Coordinated turn: heading rate =
// g*tan(bank)/V. Bank is commanded proportional to heading error, rate-limited.
function flyRoute(dt) {
  var wp = ROUTE[flt.wp];
  if (distM(flt.lat, flt.lon, wp.lat, wp.lon) < 300) {   // capture -> next wp
    flt.wp = (flt.wp + 1) % ROUTE.length;
    wp = ROUTE[flt.wp];
  }
  var desired = bearingTo(flt.lat, flt.lon, wp.lat, wp.lon);
  var err = ((desired - flt.hdg + 540) % 360) - 180;      // -180..180
  var bankCmd = Math.max(-22, Math.min(22, err * 1.2));   // deg
  flt.bank += Math.max(-8 * dt, Math.min(8 * dt, bankCmd - flt.bank)); // ease, 8°/s
  var V = flt.gs * 0.44704;                               // mph -> m/s
  var hdgRate = (9.81 * Math.tan(flt.bank * Math.PI / 180)) / Math.max(V, 1) * 180 / Math.PI;
  flt.hdg = (flt.hdg + hdgRate * dt + 360) % 360;
  var step = V * dt;                                      // metres this frame
  var hr = flt.hdg * Math.PI / 180;
  flt.lat += (step * Math.cos(hr)) / 111111;
  flt.lon += (step * Math.sin(hr)) / (111111 * Math.cos(flt.lat * Math.PI / 180));
}
```

- [ ] **Step 3: Wire it into the demo branch of `frame()`.** Replace the demo branch (the `if (mode === "demo") { ... }` body that currently calls `demoFlight` and integrates `demoLat/demoLon`, ~lines 815–825) with:

```js
  if (mode === "demo") {
    flyRoute(0.05);
    raw.pitch = -flt.vs / 100;          // gentle pitch from vertical speed
    raw.roll = flt.bank; raw.hdg = flt.hdg; raw.has = true;
    cage.pitch = 0; cage.roll = 0;
    gps.lat = flt.lat; gps.lon = flt.lon; gps.acc = 10;
    gps.trk = flt.hdg; gps.gs = flt.gs;
  }
```

- [ ] **Step 4: Verify the aircraft flies the route.** Start server, then Playwright:

Run (browser_evaluate after ~3 s on `http://localhost:8744/index.html?v=1`):
```js
() => ({ wp: window.flt && window.flt.wp, hdg: window.flt && Math.round(window.flt.hdg),
         lat: window.flt && +window.flt.lat.toFixed(4), bank: window.flt && +window.flt.bank.toFixed(1) })
```
Expected: `flt` is defined; over 10 s `wp` advances and/or `hdg` changes smoothly, `bank` is within ±22. If `window.flt` is undefined the vars are module-scoped — assert instead on `#hdgVal`/`#posVal` textContent changing over time.

- [ ] **Step 5: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Fly the demo on a scripted gorge route with coordinated turns"
```

---

### Task 2: Coherent gauges (altitude, VSI, pitch, engine) tied to the flight

**Files:**
- Modify: `app/mockup/index.html` — the engine/air-data assignment block in `frame()` (~lines 856–863).

- [ ] **Step 1: Drive altitude/VSI from a per-leg profile, not random wobble.** In `flyRoute` (Task 1), extend the integrator to set a target altitude per waypoint and ease toward it. Add to the `ROUTE` entries an optional `alt` (ft), and at the end of `flyRoute` add:

```js
  var tgtAlt = wp.alt || 2000;
  var altErr = tgtAlt - flt.alt;
  flt.vs = Math.max(-400, Math.min(400, altErr * 0.5));  // fpm, capped
  flt.alt += flt.vs / 60 * dt;
```
And give a few waypoints altitude variety, e.g. set `alt: 2400` on the 3rd and `alt: 1700` on the 7th ROUTE entry (edit those object literals).

- [ ] **Step 2: Feed the sim from flight state.** Replace the air-data lines in `frame()` (`sim.ias = wob(28,0.5); sim.alt = wob(1180,2)` → already `2000` — and `sim.vsi = Math.sin(...)`, ~lines 861–863) with:

```js
    sim.ias  = flt.gs + wob(0, 0.4);      // GS≈IAS in still air, tiny noise
    sim.alt  = flt.alt;
    sim.vsi  = flt.vs;
```

- [ ] **Step 3: Correlate engine gauges with power state.** Replace the RPM/EGT lines (~lines 856–857) with power tied to climb:

```js
    var pwr = 1 + Math.max(-0.15, Math.min(0.15, flt.vs / 400)); // climb=more power
    sim.rpmL = wob(5840 * pwr, 4); sim.rpmR = wob(5795 * pwr, 4);
    sim.egtL = wob(1118 * pwr, 3); sim.egtR = wob(1104 * pwr, 3);
```
Leave `chtL/chtR/fuel` as-is (their slow drift already reads fine).

- [ ] **Step 4: Verify coherence.** Playwright `browser_evaluate` sampling twice 4 s apart:
```js
() => ({ alt: +document.getElementById('altVal').textContent,
         vsi: document.getElementById('vsiVal').textContent,
         ias: document.getElementById('iasVal') && document.getElementById('iasVal').textContent })
```
Expected: when `vsi` is positive `alt` increases between samples and vice-versa; `alt` stays within 0–3000. Screenshot to confirm gauges look steady, not jittering.

- [ ] **Step 5: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Make demo gauges coherent with the flight (alt/VSI/pitch/power)"
```

---

### Task 3: Map projection helper + track-history breadcrumb

**Files:**
- Modify: `app/mockup/index.html` — add `mapProject` near `updateMapTiles` (~line 352); add a `<polyline id="trackHist">` inside `#mapGroup` (after `#mapTiles`, ~line 176); add buffer + render.

- [ ] **Step 1: Add the breadcrumb polyline to the map group.** In the SVG, inside `<g id="mapGroup">` and after the `mapTiles` group but before the rose, add:

```html
        <polyline id="trackHist" fill="none" stroke="#EAF0F4" stroke-opacity="0.7"
                  stroke-width="2.5" stroke-linejoin="round" points=""/>
```

- [ ] **Step 2: Factor the projection.** Add above `updateMapTiles` (~line 352):

```js
// Project a lat/lon to SVG coords inside #mapGroup, relative to the map centre
// (the aircraft). #mapGroup is rotated by -hdg, so overlays rotate with the map.
function mapProject(lat, lon, cLat, cLon) {
  var n = Math.pow(2, MAP_ZOOM), P = Math.PI, tileSVG = MAP_SCALE * 256;
  function tx(lo) { return (lo + 180) / 360 * n; }
  function ty(la) { var r = la * P / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / P) / 2 * n; }
  return { x: HSI_CX + (tx(lon) - tx(cLon)) * tileSVG, y: HSI_CY + (ty(lat) - ty(cLat)) * tileSVG };
}
```

- [ ] **Step 3: Add the history buffer and renderer.** Add after `mapProject`:

```js
var TRACK_HIST = [];         // {lat, lon}, capped
var trackTick = 0;
function pushTrack(lat, lon) {
  trackTick++;
  if (trackTick % 20 !== 0) return;            // ~1/s at 20 fps
  TRACK_HIST.push({ lat: lat, lon: lon });
  if (TRACK_HIST.length > 600) TRACK_HIST.shift();
}
function renderTrack(cLat, cLon) {
  var pts = [];
  for (var i = 0; i < TRACK_HIST.length; i++) {
    var p = mapProject(TRACK_HIST[i].lat, TRACK_HIST[i].lon, cLat, cLon);
    pts.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
  }
  $("trackHist").setAttribute("points", pts.join(" "));
}
```

- [ ] **Step 4: Call them from the map update path.** Where `frame()` calls `updateMapTiles(gps.lat, gps.lon, att.hdg)` (find it), add immediately after:
```js
    pushTrack(gps.lat, gps.lon);
    renderTrack(gps.lat, gps.lon);
```

- [ ] **Step 5: Verify the trail grows and renders.** Playwright after ~15 s:
```js
() => { var p = document.getElementById('trackHist').getAttribute('points') || '';
        return { segs: p ? p.trim().split(/\s+/).length : 0 }; }
```
Expected: `segs` grows over time (≥5 after 15 s). Screenshot: a trail visible behind the aircraft on the map.

- [ ] **Step 6: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Draw a track-history breadcrumb on the compass map"
```

---

### Task 4: Curved predictive track vector (Garmin trend)

**Files:**
- Modify: `app/mockup/index.html` — add `<polyline id="trendVec">` + tick group inside `#mapGroup`; add `renderTrend()`.

- [ ] **Step 1: Add the trend vector elements** inside `#mapGroup`, after `#trackHist`:

```html
        <polyline id="trendVec" fill="none" stroke="#E85AD6" stroke-width="3"
                  stroke-linejoin="round" points=""/>
        <g id="trendTicks" stroke="#E85AD6" stroke-width="3"></g>
```

- [ ] **Step 2: Implement the curved projection.** Add near `renderTrack`:

```js
// Project the aircraft forward along its ground track using current speed and
// turn rate: constant-radius arc, so it curves in a turn and straightens level.
// Ticks at 30/60/90 s. Uses flt.hdg/gs/bank (demo). Returns nothing; draws.
function renderTrend(cLat, cLon) {
  var V = flt.gs * 0.44704;                                   // m/s
  var turn = (9.81 * Math.tan(flt.bank * Math.PI / 180)) / Math.max(V, 1); // rad/s
  var pts = [], ticks = [], tickAt = { 30: 1, 60: 1, 90: 1 };
  var lat = cLat, lon = cLon, hdg = flt.hdg * Math.PI / 180;
  for (var t = 0; t <= 120; t += 2) {
    var p = mapProject(lat, lon, cLat, cLon);
    pts.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
    if (tickAt[t]) {
      var nx = Math.cos(hdg + Math.PI / 2), ny = Math.sin(hdg + Math.PI / 2);
      ticks.push("M" + (p.x - nx * 7).toFixed(1) + "," + (p.y - ny * 7).toFixed(1) +
                 "L" + (p.x + nx * 7).toFixed(1) + "," + (p.y + ny * 7).toFixed(1));
    }
    // advance 2 s along the arc
    var step = V * 2;
    lat += (step * Math.cos(hdg)) / 111111;
    lon += (step * Math.sin(hdg)) / (111111 * Math.cos(lat * Math.PI / 180));
    hdg += turn * 2;
  }
  $("trendVec").setAttribute("points", pts.join(" "));
  var tg = $("trendTicks"); while (tg.firstChild) tg.removeChild(tg.firstChild);
  ticks.forEach(function (d) { tg.appendChild(el("path", { d: d })); });
}
```
Note: `mapProject`'s y-axis increases downward and tile-north is up, matching `hdg` measured clockwise from north with the `#mapGroup` `rotate(-hdg)` — the vector points to the top of the compass (aircraft nose) as expected. Verify visually in Step 4 and flip the `Math.sin`/`Math.cos` axis assignment if it points sideways.

- [ ] **Step 3: Call it** right after `renderTrack(...)` in `frame()`:
```js
    renderTrend(gps.lat, gps.lon);
```

- [ ] **Step 4: Verify it curves in turns.** Playwright: sample `trendVec` points while wings-level vs mid-turn:
```js
() => ({ bank: +flt?.bank?.toFixed?.(1) ?? null,
         pts: (document.getElementById('trendVec').getAttribute('points')||'').split(/\s+/).length }) 
```
(If `flt` isn't global, just assert `trendVec` has ≥30 points and screenshot.) Expected: vector points toward the nose (top of compass); when the aircraft banks, the polyline visibly bows to the turn side; ticks appear at 3 points. Screenshot mid-turn.

- [ ] **Step 5: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Add a curved Garmin-style predictive track vector to the map"
```

---

## STAGE 2 — AI 3D synthetic-vision terrain bands (Feature 2)

### Task 5: Restructure the ray-cast into distance-ring bands

**Files:**
- Modify: `app/mockup/index.html` — `svsRecompute()` (~lines 1220–1243).

- [ ] **Step 1: Produce per-ring samples plus the hazard max-profile in one pass.** Replace the body of `svsRecompute()` with:

```js
var svsBands = [];   // [{ dist, pts:[{az, elev}] }], far -> near
function svsRecompute() {
  if (!gps.lat) return;
  var lat = gps.lat, lon = gps.lon, hdg = att.hdg;
  var altM = gps.alt ? gps.alt * 0.3048 : sim.alt * 0.3048;
  var PI = Math.PI, cosLat = Math.cos(lat * PI / 180);
  var RINGS = [12000, 8000, 5000, 2500, 1200, 600, 300];   // far -> near
  var bands = [], maxProf = [];
  for (var az = -90; az <= 90; az += 3) maxProf.push({ az: az, elev: -90 });
  RINGS.forEach(function (d) {
    var pts = [];
    for (var i = 0, az = -90; az <= 90; az += 3, i++) {
      var absRad = ((hdg + az + 360) % 360) * PI / 180;
      var dlat = d * Math.cos(absRad) / 111111;
      var dlon = d * Math.sin(absRad) / (111111 * cosLat);
      var elevM = svsElev(lat + dlat, lon + dlon);
      var ang = elevM === null ? -90 : Math.atan2(elevM - altM, d) * 180 / PI;
      pts.push({ az: az, elev: ang });
      if (ang > maxProf[i].elev) maxProf[i].elev = ang;
    }
    bands.push({ dist: d, pts: pts });
  });
  svsBands = bands;
  svsProfile = maxProf;         // reused by hazard overlay
  svsLastHdg = hdg;
}
```

- [ ] **Step 2: Verify data shape.** Playwright over the gorge (SVS on):
```js
() => ({ bands: window.svsBands ? window.svsBands.length : 'n/a' })
```
If `svsBands` is module-scoped and not on `window`, defer verification to Task 6 (DOM polygons). Otherwise expect `7`.

- [ ] **Step 3: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Restructure SVS ray-cast into distance-ring bands"
```

---

### Task 6: Paint the bands far→near with haze shading

**Files:**
- Modify: `app/mockup/index.html` — add a band `<g>` in `#horizon` (before `#svsTerrain`, ~line 113); rewrite `svsRender()` (~lines 1246–1305).

- [ ] **Step 1: Add a band group** inside `#horizon`, immediately after the ground `<rect>` (line ~111) and before the `svsTerrain` polygon:

```html
        <g id="svsBandGroup"></g>
```
Keep `#svsTerrain`/`#svsHazard`/`#svsPullup` where they are (painted above the bands).

- [ ] **Step 2: Rewrite `svsRender()`** to paint bands then hazards. Replace the whole function with:

```js
// Haze palette, far (index 0) -> near (last): bluish/hazy -> dark brown.
var SVS_HAZE = ["#8FA6B4","#7E93A0","#6E7E7F","#5E6A5E","#585234","#4E3E22","#42301A"];
function svsBandFill(i, n) { return SVS_HAZE[Math.min(SVS_HAZE.length - 1, Math.round(i / (n - 1) * (SVS_HAZE.length - 1)))]; }

function svsRender() {
  var badge = $("svsStatus"), loading = $("svsLoading"), grp = $("svsBandGroup");
  var polyHaz = $("svsHazard"), polyPull = $("svsPullup"), polyTerr = $("svsTerrain");
  if (!SVS_ON) {
    grp.setAttribute("opacity", "0");
    polyTerr.setAttribute("opacity","0"); polyHaz.setAttribute("opacity","0"); polyPull.setAttribute("opacity","0");
    badge.setAttribute("visibility","hidden"); loading.setAttribute("visibility","hidden");
    return;
  }
  var anyLoading = Object.keys(svsTiles).some(function(k){ return svsTiles[k]==="loading"; });
  badge.setAttribute("visibility",  svsHasData ? "visible" : "hidden");
  loading.setAttribute("visibility", (!svsHasData && anyLoading) ? "visible" : "hidden");
  grp.setAttribute("opacity", "1");
  polyTerr.setAttribute("opacity","0");   // superseded by bands; kept for structure

  var PI = Math.PI, CX = AI_CX, CY = AI_CY, PPD = PX_PER_DEG, R = AI_R;
  // Ensure one <polygon> per band, reused across frames.
  while (grp.childNodes.length < svsBands.length) grp.appendChild(el("polygon", {}));
  while (grp.childNodes.length > svsBands.length) grp.removeChild(grp.lastChild);

  svsBands.forEach(function (band, bi) {
    var poly = grp.childNodes[bi], pts = [];
    band.pts.forEach(function (p) {
      var x = CX + Math.sin(p.az * PI / 180) * R;
      var e = Math.max(-35, Math.min(35, p.elev));
      pts.push(x.toFixed(1) + "," + Math.max(CY - e * PPD, CY - 35 * PPD).toFixed(1));
    });
    pts.push((CX + R) + ",9999", (CX - R) + ",9999");
    poly.setAttribute("points", pts.join(" "));
    poly.setAttribute("fill", svsBandFill(bi, svsBands.length));
    poly.setAttribute("opacity", "0.96");
  });

  // Hazard overlays from the max profile (unchanged logic).
  var haz = [], pul = [];
  svsProfile.forEach(function (p) {
    var x = CX + Math.sin(p.az * PI / 180) * R;
    var e = Math.max(-35, Math.min(35, p.elev));
    var yTop = CY - e * PPD;
    if (p.elev > -2.5 && p.elev <= 0) haz.push(x.toFixed(1) + "," + Math.max(yTop, CY).toFixed(1));
    if (p.elev > 0) pul.push(x.toFixed(1) + "," + yTop.toFixed(1));
  });
  var bL = CX - R, bR = CX + R;
  if (haz.length > 1) { haz.push(bR + ",9999", bL + ",9999"); polyHaz.setAttribute("points", haz.join(" ")); polyHaz.setAttribute("opacity","0.65"); }
  else polyHaz.setAttribute("opacity","0");
  if (pul.length > 1) { pul.push(bR + "," + CY, bL + "," + CY); polyPull.setAttribute("points", pul.join(" ")); polyPull.setAttribute("opacity","0.7"); }
  else polyPull.setAttribute("opacity","0");
}
```

- [ ] **Step 3: Verify bands render with depth over the gorge.** Playwright (SVS on, `?v=N`, wait ~4 s):
```js
() => { var g = document.getElementById('svsBandGroup');
        return { bands: g.childNodes.length,
                 fills: Array.from(g.childNodes).map(function(p){return p.getAttribute('fill');}),
                 nearHasPts: (g.lastChild.getAttribute('points')||'').length > 20 }; }
```
Expected: `bands`=7; `fills` progress from a hazy blue-grey to dark brown; `nearHasPts` true. Screenshot: layered ridgelines with visible depth; amber/red still pop where terrain is high.

- [ ] **Step 4: Flat-ground sanity.** Temporarily set the demo start to flat TN is unnecessary — instead assert that far bands sit near the horizon when angles are small; visually confirm no false red on open water. (No code change; observation only.)

- [ ] **Step 5: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Render SVS as haze-shaded distance-ring terrain bands"
```

---

## STAGE 3 — HSI selectable map layers (Feature 1)

### Task 7: Parameterize the tile source

**Files:**
- Modify: `app/mockup/index.html` — `updateMapTiles` (~lines 353–373); add `MAP_LAYERS`/`MAP_LAYER`/`tileUrl` above it.

- [ ] **Step 1: Add the layer table and state** above `updateMapTiles`:

```js
// Map layers: keyless, CORS-enabled raster sources. Note the coordinate order
// differs per provider (Esri is z/y/x, no extension).
var MAP_LAYERS = ["street", "terrain", "satellite"];
var MAP_LAYER = "street";
function tileUrl(z, x, y) {
  if (MAP_LAYER === "terrain")   return "https://a.tile.opentopomap.org/" + z + "/" + x + "/" + y + ".png";
  if (MAP_LAYER === "satellite") return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + z + "/" + y + "/" + x;
  return "https://tile.openstreetmap.org/" + z + "/" + x + "/" + y + ".png";
}
var MAP_ATTRIB = { street: "© OpenStreetMap", terrain: "© OpenTopoMap (CC-BY-SA)", satellite: "Esri, Maxar, Earthstar Geographics" };
```

- [ ] **Step 2: Use `tileUrl` in `updateMapTiles`.** Replace the hard-coded `href` line (365) with:
```js
    t.el.setAttribute("href", tileUrl(MAP_ZOOM, tx, ty));
```

- [ ] **Step 3: Verify tile source switches.** Playwright: set `MAP_LAYER` via evaluate if global, else defer to Task 8's button. Assert a tile `href` starts with the right host after switching. (If module-scoped, this is covered in Task 8.)

- [ ] **Step 4: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Parameterize the compass map tile source by layer"
```

---

### Task 8: Layer-cycle button + attribution

**Files:**
- Modify: `app/mockup/index.html` — add `#btnMapLayer` in the button row (near `#btnSvs`, line 235); add `#mapAttrib` text near the HSI; add handler.

- [ ] **Step 1: Add the button** after `#btnSvs` (line 235):
```html
  <button id="btnMapLayer">Map: Street</button>
```

- [ ] **Step 2: Add an attribution text element** inside the SVG near the HSI (after the `#mapGroup` closing tag / with the other HSI labels). Place it so it isn't clipped by the map circle:
```html
    <text id="mapAttrib" font-size="9" fill="#8894A0" text-anchor="end">© OpenStreetMap</text>
```
Position it in `relayout()` where other HSI labels are placed: set `x = HSI_CX + HSI_R`, `y = HSI_CY + HSI_R + 14` (below the compass) in both landscape and portrait branches.

- [ ] **Step 3: Wire the handler.** Near the other button handlers (e.g. after the `#btnSvs` listener ~line 1307):
```js
$("btnMapLayer").addEventListener("click", function () {
  var i = (MAP_LAYERS.indexOf(MAP_LAYER) + 1) % MAP_LAYERS.length;
  MAP_LAYER = MAP_LAYERS[i];
  this.textContent = "Map: " + MAP_LAYER.charAt(0).toUpperCase() + MAP_LAYER.slice(1);
  $("mapAttrib").textContent = MAP_ATTRIB[MAP_LAYER];
  MAP_TILES.forEach(function (t) { t.el.setAttribute("href", ""); });  // force refetch
  if (gps.lat !== null) updateMapTiles(gps.lat, gps.lon, att.hdg);
});
```

- [ ] **Step 4: Verify all three layers.** Playwright: click `#btnMapLayer` twice, after each assert the tile host and attribution:
```js
() => ({ label: document.getElementById('btnMapLayer').textContent,
         attrib: document.getElementById('mapAttrib').textContent,
         href0: document.querySelector('#mapTiles image').getAttribute('href') })
```
Expected: cycles Street→Terrain→Satellite; `href0` host matches (`tile.openstreetmap.org` → `a.tile.opentopomap.org` → `server.arcgisonline.com`); attribution updates. Screenshot each. Check console: 0 errors (a tile that fails CORS/404 just won't paint — acceptable, but note it).

- [ ] **Step 5: Confirm tile hosts are reachable + CORS.** Before relying on them, from Bash:
```bash
for u in "https://a.tile.opentopomap.org/14/2626/5722.png" "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/5722/2626"; do
  echo "$u"; curl -s -o /dev/null -w "  status=%{http_code} type=%{content_type}\n" -H "Origin: https://junco-pfd.pages.dev" "$u"; done
```
Expected: HTTP 200, image content-type. If OpenTopoMap rate-limits (403/tile), note it in the README as best-effort for the mockup.

- [ ] **Step 6: Commit.**
```bash
git add app/mockup/index.html
git commit -m "Add compass map layer selector (street/terrain/satellite) with attribution"
```

---

## STAGE 4 — Ship

### Task 9: Service-worker bump, README, deploy, verify, push

**Files:**
- Modify: `app/mockup/sw.js` (cache name), `app/mockup/README.md` (features).

- [ ] **Step 1: Bump the SW cache** so installs get the update. In `app/mockup/sw.js`:
```js
var CACHE = "junco-pfd-v3";
```

- [ ] **Step 2: Update the README.** In `app/mockup/README.md`, extend the "Real, from open data" / "What is real" section to mention: the demo now flies a scripted gorge route with a track breadcrumb and predictive vector; the compass map has street/terrain/satellite layers; the AI shows layered synthetic-vision terrain. Keep the advisory framing.

- [ ] **Step 3: Full Playwright regression.** With the local server: load `?v=final`, enable SVS, let it fly ~30 s. Assert: `#trackHist` grows; `#trendVec` present and curves in a turn; `#svsBandGroup` has 7 shaded polygons; cycling `#btnMapLayer` swaps hosts; console errors = 0. Screenshot landscape and portrait (resize to 800×1280) and one mid-turn.

- [ ] **Step 4: Deploy to Cloudflare Pages.** One shell (credential inline, never printed):
```bash
export CLOUDFLARE_API_KEY="$(bw get item fdd805ce-21aa-4ceb-a624-380030719b95 | jq -r '.fields[]|select(.name=="Global API Key")|.value')"
export CLOUDFLARE_EMAIL="admin@keylinkit.com"
export CLOUDFLARE_ACCOUNT_ID="dbeca84267e7e82da494570a659e467a"
npx wrangler@4 pages deploy app/mockup --project-name junco-pfd --branch main --commit-dirty=true --commit-message "SVS terrain bands, map layers, believable flight"
```

- [ ] **Step 5: Verify production** (follow redirects — Pages 308s `/index.html`→`/`):
```bash
curl -sL https://junco-pfd.pages.dev/ | grep -o "ROUTE = \[\|svsBandGroup\|btnMapLayer" | sort -u
curl -s https://junco-pfd.pages.dev/sw.js | grep -o 'CACHE = "[^"]*"'
```
Expected: all three markers present; cache `junco-pfd-v3`.

- [ ] **Step 6: Commit and push.**
```bash
git add app/mockup/sw.js app/mockup/README.md
git commit -m "Bump SW cache to v3 and document SVS/map-layers/flight demo"
git push origin main
```

---

## Self-review notes

- **Spec coverage:** Feature 1 (layers) → Tasks 7–8; Feature 2 (AI bands, haze-only) → Tasks 5–6; Feature 3 (flight/breadcrumb/trend) → Tasks 1–4; SW bump/README/deploy → Task 9. Elevation tint intentionally omitted (deferred per spec).
- **Module-scope caveat:** the mockup's top-level `var`s may not be on `window` (the file may be wrapped). Every verification step has a DOM-based fallback that doesn't depend on globals — prefer those if `window.flt`/`window.svsBands` read `undefined`.
- **Type/name consistency:** `flt` (fields lat/lon/hdg/bank/gs/alt/vs/wp), `mapProject(lat,lon,cLat,cLon)`, `TRACK_HIST`, `pushTrack`/`renderTrack`/`renderTrend`, `svsBands` (`{dist,pts:[{az,elev}]}`), `svsProfile` (max), `MAP_LAYER`/`MAP_LAYERS`/`tileUrl`/`MAP_ATTRIB` — used consistently across tasks.
- **Deferred/known risks:** OpenTopoMap rate-limits and Esri tiles are best-effort for a mockup (Task 8 Step 5 checks reachability); trend-vector axis orientation confirmed visually in Task 4 Step 4.
