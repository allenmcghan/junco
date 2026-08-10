/* Junco mockup — raster basemap and aeronautical charts.
 *
 * Three layers: OpenStreetMap for ground reference, and the FAA's own VFR
 * Sectional and Terminal Area charts for airspace. All three are 256 px Web
 * Mercator, so one drawing path serves them and one cache holds them.
 *
 * The earlier version of this app had no basemap on the argument that tiles need
 * a network you will not have at 800 feet over a field. That argument was wrong,
 * or rather it solved the wrong half of the problem: tiles need a network *when
 * they are fetched*, not when they are drawn. Fetch them on the ground and the
 * objection disappears. Ground reference is worth a great deal to a pilot who is
 * low, slow, and navigating by looking outside.
 *
 * Low zoom is not a compromise here, it is the point. At zoom 11 one tile is
 * about 12 nm across and 13 kB, so a 7x7 block covers roughly 80 nm for under a
 * megabyte. Field boundaries, roads, rivers, towns and coastline are all legible,
 * and that is the entire content of a ground reference.
 *
 * CHARTS GO STALE AND THIS ONE CANNOT TELL YOU HOW STALE. Sectionals run on a
 * 56-day cycle. A tile cached before a cycle boundary looks exactly like a
 * current one, so the map annunciates when the layer was last pulled. Treat it
 * as a reference for situational awareness and not as a current chart. The FAA
 * attribution says "not for navigation" because that is the truth.
 *
 * Why this matters more than roads: 14 CFR 103.17 forbids operating an
 * ultralight in Class A, B, C, D, or the surface area of Class E designated for
 * an airport without prior ATC authorisation. For a Part 103 pilot the airspace
 * boundary is a legal line, not a convenience.
 *
 * OSM TILE USAGE POLICY. tile.openstreetmap.org is donated infrastructure with a
 * published policy, and this file tries to be a good guest:
 *
 *   - Identify. The WebView sets a User-Agent naming the app and its repository.
 *   - No bulk downloading. Pre-caching is user-initiated, bounded to the visible
 *     area, hard-capped, and never automatic. It is a pre-flight action, not a
 *     crawler.
 *   - Attribution is required by ODbL and is drawn on the map, not buried in an
 *     about box.
 *
 * If this ever sees real use, the right answer is a self-hosted basemap rather
 * than a heavier lean on someone else's donated servers. Protomaps pmtiles gives
 * a whole region as one file and would suit an offline instrument better than
 * any tile server does.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function (global) {
  "use strict";

  /* Layers. The FAA publishes its own charts as Web Mercator tiles at 256 px,
     which is the same scheme OSM uses, so one drawing path serves both. Note the
     axis order differs: ArcGIS is {z}/{row}/{col}, OSM is {z}/{x}/{y}.

     Sectionals matter more than roads to a Part 103 pilot. 14 CFR 103.17 forbids
     operating in Class A, B, C, D, or the surface area of Class E designated for
     an airport without prior ATC authorisation, so knowing where those boundaries
     are is a legal question and not only a convenience. */
  var LAYERS = {
    osm: {
      name: "OSM",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: "© OpenStreetMap contributors",
      dim: 0.42, max: 17
    },
    sectional: {
      name: "SECTIONAL",
      url: "https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer/tile/{z}/{y}/{x}",
      attr: "FAA Aeronautical Information Services — not for navigation",
      dim: 0.12, max: 12
    },
    terminal: {
      name: "TAC",
      url: "https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}",
      attr: "FAA Aeronautical Information Services — not for navigation",
      dim: 0.12, max: 14
    }
  };
  var ORDER = ["osm", "sectional", "terminal"];
  var layer = "sectional";
  var TILE = 256;
  var MAX_CACHE = 600;              // in-memory images
  var PRECACHE_CAP = 240;           // hard ceiling on a user-initiated area pull

  function L() { return LAYERS[layer]; }
  function tileURL(z, x, y) {
    return L().url.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  }

  var mem = new Map();              // "z/x/y" -> Image | "fail"
  var pending = 0;
  var enabled = true;
  var onArrive = null;              // redraw hook

  function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
  function lat2y(lat, z) {
    var r = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
  }
  function mpp(z, lat) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); }

  /** Integer zoom whose native resolution is closest to what the range needs. */
  function zoomFor(rangeNM, radiusPx, lat) {
    var want = (rangeNM * 1852) / Math.max(1, radiusPx);          // metres per pixel
    var z = Math.log2(156543.03392 * Math.cos(lat * Math.PI / 180) / want);
    return Math.max(3, Math.min(L().max, Math.round(z)));
  }

  function key(z, x, y) { return layer + "/" + z + "/" + x + "/" + y; }

  function get(z, x, y) {
    var k = key(z, x, y), hit = mem.get(k);
    if (hit) { return hit === "fail" ? null : hit; }
    if (pending > 6) { return null; }                              // be gentle
    var img = new Image();
    img.decoding = "async";
    mem.set(k, img);
    pending++;
    img.onload = function () { pending--; if (onArrive) { onArrive(); } };
    img.onerror = function () { pending--; mem.set(k, "fail"); };
    img.src = tileURL(z, x, y);
    if (mem.size > MAX_CACHE) {
      var it = mem.keys();
      for (var i = 0; i < 80; i++) { var n = it.next(); if (n.done) { break; } mem.delete(n.value); }
    }
    return null;
  }

  /**
   * Draw the basemap under everything else.
   * ctx is already at CSS pixel scale; cx,cy is own position; rot is the
   * track-up rotation in degrees.
   */
  function draw(ctx, W, H, lat, lon, radiusPx, rangeNM, rotDeg) {
    if (!enabled || lat === null || lon === null) { return null; }
    var z = zoomFor(rangeNM, radiusPx, lat);
    var scale = TILE * mpp(z, lat) / ((rangeNM * 1852) / radiusPx);
    var fx = lon2x(lon, z), fy = lat2y(lat, z);
    var n = Math.pow(2, z);

    // enough tiles to cover the rotated viewport corner to corner
    var reach = Math.ceil(Math.hypot(W, H) / 2 / scale) + 1;
    var cx = W / 2, cy = H * 0.60;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-rotDeg * Math.PI / 180);
    ctx.imageSmoothingEnabled = true;
    for (var dx = -reach; dx <= reach; dx++) {
      for (var dy = -reach; dy <= reach; dy++) {
        var tx = Math.floor(fx) + dx, ty = Math.floor(fy) + dy;
        if (ty < 0 || ty >= n) { continue; }
        var wx = ((tx % n) + n) % n;                                // wrap longitude
        var img = get(z, wx, ty);
        if (!img || !img.complete || !img.naturalWidth) { continue; }
        ctx.drawImage(img, (tx - fx) * scale, (ty - fy) * scale, scale + 1, scale + 1);
      }
    }
    ctx.restore();

    // Knock the basemap back so instrument symbology stays dominant. A basemap
    // that competes with the traffic and the course line is a hazard, not a help.
    ctx.fillStyle = "rgba(5,7,10," + L().dim + ")";
    ctx.fillRect(0, 0, W, H);
    return z;
  }

  /** Required by ODbL. Not optional and not hidden. */
  function attribution(ctx, W, H) {
    if (!enabled) { return; }
    var t = L().attr;
    ctx.font = "11px ui-monospace, monospace";
    var w = ctx.measureText(t).width + 10;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(W - w - 6, H - 78, w, 17);
    ctx.fillStyle = "#B8C2C8";
    ctx.fillText(t, W - w - 1, H - 66);
  }

  /**
   * Pre-flight area download. Bounded, user-initiated, capped. This is the
   * feature that makes a basemap usable in an aircraft, and also the one that
   * could abuse donated infrastructure, so it refuses to be large.
   */
  function precache(lat, lon, rangeNM, radiusPx, progress) {
    var base = zoomFor(rangeNM, radiusPx, lat);
    var list = [];
    [base, base + 1].forEach(function (z) {
      if (z < 3 || z > L().max) { return; }
      var fx = lon2x(lon, z), fy = lat2y(lat, z), n = Math.pow(2, z);
      var span = z === base ? 3 : 4;
      for (var dx = -span; dx <= span; dx++) {
        for (var dy = -span; dy <= span; dy++) {
          var tx = Math.floor(fx) + dx, ty = Math.floor(fy) + dy;
          if (ty < 0 || ty >= n) { continue; }
          list.push([z, ((tx % n) + n) % n, ty]);
        }
      }
    });
    list = list.slice(0, PRECACHE_CAP);

    var done = 0, ok = 0;
    return new Promise(function (resolve) {
      var i = 0, active = 0;
      function next() {
        if (i >= list.length && active === 0) { stamp(); resolve({ total: list.length, ok: ok }); return; }
        while (active < 4 && i < list.length) {
          var t = list[i++]; active++;
          fetch(tileURL(t[0], t[1], t[2]), { mode: "cors", cache: "force-cache" })
            .then(function () { ok++; })
            .catch(function () {})
            .then(function () {
              active--; done++;
              if (progress) { progress(done, list.length); }
              next();
            });
        }
      }
      next();
    });
  }

  /* Charts go stale. The sectional cycle is 56 days and a cached tile carries no
     expiry the pilot can see, so the map annunciates when the layer was last
     fetched rather than letting an old chart look current. */
  var fetchedAt = {};
  function stamp() { fetchedAt[layer] = Date.now(); }
  function age() { return fetchedAt[layer] || 0; }

  global.JuncoTiles = {
    draw: draw, attribution: attribution, precache: precache, zoomFor: zoomFor,
    layers: ORDER, layerName: function () { return L().name; },
    setLayer: function (l) { if (LAYERS[l]) { layer = l; } },
    nextLayer: function () {
      var i = ORDER.indexOf(layer);
      layer = ORDER[(i + 1) % ORDER.length];
      return L().name;
    },
    stamp: stamp, age: age,
    setRedraw: function (f) { onArrive = f; },
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    cached: function () { return mem.size; }
  };
})(this);
