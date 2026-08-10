/* Junco mockup — OpenStreetMap raster basemap.
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

  var URL_TPL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var TILE = 256;
  var MAX_CACHE = 600;              // in-memory images
  var PRECACHE_CAP = 240;           // hard ceiling on a user-initiated area pull

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
    return Math.max(3, Math.min(16, Math.round(z)));
  }

  function key(z, x, y) { return z + "/" + x + "/" + y; }

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
    img.src = URL_TPL.replace("{z}", z).replace("{x}", x).replace("{y}", y);
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
    ctx.fillStyle = "rgba(5,7,10,0.42)";
    ctx.fillRect(0, 0, W, H);
    return z;
  }

  /** Required by ODbL. Not optional and not hidden. */
  function attribution(ctx, W, H) {
    if (!enabled) { return; }
    var t = "© OpenStreetMap contributors";
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
      if (z < 3 || z > 16) { return; }
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
        if (i >= list.length && active === 0) { resolve({ total: list.length, ok: ok }); return; }
        while (active < 4 && i < list.length) {
          var t = list[i++]; active++;
          fetch(URL_TPL.replace("{z}", t[0]).replace("{x}", t[1]).replace("{y}", t[2]),
                { mode: "cors", cache: "force-cache" })
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

  global.JuncoTiles = {
    draw: draw, attribution: attribution, precache: precache, zoomFor: zoomFor,
    setRedraw: function (f) { onArrive = f; },
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    cached: function () { return mem.size; }
  };
})(this);
