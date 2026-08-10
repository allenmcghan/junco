/* Junco mockup — outside data: traffic and weather.
 *
 * Two sources, two very different characters, and the difference matters more
 * than the code does.
 *
 *   api.airplanes.live  sends access-control-allow-origin: *, so it works from
 *                       a plain browser. Community ADS-B aggregator.
 *   aviationweather.gov sends no CORS header at all, so a browser cannot touch
 *                       it. In the APK we go through a native bridge instead.
 *
 * READ THIS BEFORE TRUSTING THE TRAFFIC DISPLAY.
 *
 * Internet traffic is not a collision avoidance tool and this file will not
 * pretend otherwise:
 *
 *   - Coverage is crowdsourced ground receivers, line of sight. Below roughly
 *     1000 to 2000 ft AGL in rural areas there is nothing at all. A powered
 *     parachute lives there.
 *   - Latency runs 5 to 15 seconds. At closing speeds that matter, a target is
 *     displaced by a third of a mile from where it is drawn.
 *   - Part 103 aircraft are not required to carry ADS-B Out and mostly do not,
 *     so the traffic most likely to conflict with you is the traffic least
 *     likely to appear.
 *
 * PRD design rule 9: advisory-only data never raises an alert. Nothing here
 * may drive audio, the annunciator, or any advisory. It is a map layer.
 *
 * SPDX-License-Identifier: MPL-2.0
 */
(function (global) {
  "use strict";

  /* ---------------- transport ----------------
     The Android wrapper injects JuncoNative.fetch for hosts that refuse CORS.
     Everything falls back to a direct fetch so the PWA still does what it can. */
  function get(url) {
    if (global.JuncoNative && typeof global.JuncoNative.httpGet === "function") {
      return new Promise(function (res, rej) {
        try {
          var out = global.JuncoNative.httpGet(url);
          if (out === null || out === undefined || out === "") { rej(new Error("empty")); }
          else { res(out); }
        } catch (e) { rej(e); }
      });
    }
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) { throw new Error("HTTP " + r.status); }
      return r.text();
    });
  }
  function hasNative() { return !!(global.JuncoNative && global.JuncoNative.httpGet); }

  /* ---------------- geometry ---------------- */
  var R_NM = 3440.065;
  function toRad(d) { return d * Math.PI / 180; }
  function distNM(la1, lo1, la2, lo2) {
    var p1 = toRad(la1), p2 = toRad(la2), dp = toRad(la2 - la1), dl = toRad(lo2 - lo1);
    var a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
    return R_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  function bearing(la1, lo1, la2, lo2) {
    var p1 = toRad(la1), p2 = toRad(la2), dl = toRad(lo2 - lo1);
    var y = Math.sin(dl)*Math.cos(p2);
    var x = Math.cos(p1)*Math.sin(p2) - Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /* ---------------- traffic ---------------- */
  var traffic = { list: [], at: 0, err: null, loading: false };

  function fetchTraffic(lat, lon, radiusNM, myAltFt) {
    if (lat === null || lon === null || traffic.loading) { return Promise.resolve(traffic); }
    traffic.loading = true;
    var r = Math.max(5, Math.min(250, Math.round(radiusNM || 40)));
    var url = "https://api.airplanes.live/v2/point/" + lat.toFixed(4) + "/" + lon.toFixed(4) + "/" + r;
    return get(url).then(function (txt) {
      var d = JSON.parse(txt), ac = (d && d.ac) || [];
      traffic.list = ac.map(function (a) {
        if (typeof a.lat !== "number" || typeof a.lon !== "number") { return null; }
        var altFt = (a.alt_baro === "ground") ? 0 : (typeof a.alt_baro === "number" ? a.alt_baro
                    : (typeof a.alt_geom === "number" ? a.alt_geom : null));
        return {
          id: (a.flight || a.r || a.hex || "").trim() || "?",
          type: a.t || "",
          lat: a.lat, lon: a.lon,
          alt: altFt,
          onGround: a.alt_baro === "ground",
          gs: typeof a.gs === "number" ? a.gs : null,
          trk: typeof a.track === "number" ? a.track : null,
          dist: distNM(lat, lon, a.lat, a.lon),
          brg: bearing(lat, lon, a.lat, a.lon),
          rel: (myAltFt === null || altFt === null) ? null : altFt - myAltFt
        };
      }).filter(Boolean).sort(function (x, y) { return x.dist - y.dist; });
      traffic.at = Date.now(); traffic.err = null; traffic.loading = false;
      return traffic;
    }).catch(function (e) {
      traffic.err = e.message || "unavailable"; traffic.loading = false;
      return traffic;
    });
  }

  /* ---------------- weather ----------------
     What can actually be fetched is METAR and TAF. ATIS proper is a recorded
     broadcast that also carries the active runway and approach in use, and
     there is no free public feed for it. METAR carries the same weather; it
     does not carry the runway. Saying "ATIS" for this would be a lie the pilot
     might act on, so the label stays METAR. */
  var wx = { metar: null, taf: null, station: null, at: 0, err: null, loading: false };

  function fetchWx(lat, lon) {
    if (lat === null || lon === null || wx.loading) { return Promise.resolve(wx); }
    if (!hasNative()) {
      wx.err = "aviationweather.gov sends no CORS header — needs the app, not the browser";
      return Promise.resolve(wx);
    }
    wx.loading = true;
    var box = [ (lat - 1.2).toFixed(2), (lon - 1.6).toFixed(2), (lat + 1.2).toFixed(2), (lon + 1.6).toFixed(2) ].join(",");
    var url = "https://aviationweather.gov/api/data/metar?format=json&hours=2&bbox=" + box;
    return get(url).then(function (txt) {
      var arr = JSON.parse(txt);
      if (!arr || !arr.length) { throw new Error("no station in range"); }
      arr.forEach(function (m) {
        m._d = (typeof m.lat === "number" && typeof m.lon === "number")
             ? distNM(lat, lon, m.lat, m.lon) : 9999;
      });
      arr.sort(function (a, b) { return a._d - b._d; });
      var m = arr[0];
      wx.station = m.icaoId; wx.metar = m; wx.at = Date.now(); wx.err = null; wx.loading = false;
      return fetchTaf(m.icaoId).then(function () { return wx; });
    }).catch(function (e) {
      wx.err = e.message || "unavailable"; wx.loading = false;
      return wx;
    });
  }

  function fetchTaf(id) {
    if (!hasNative() || !id) { return Promise.resolve(); }
    return get("https://aviationweather.gov/api/data/taf?format=json&ids=" + encodeURIComponent(id))
      .then(function (txt) { var a = JSON.parse(txt); wx.taf = (a && a[0]) || null; })
      .catch(function () { wx.taf = null; });
  }

  // Density altitude from the station, which beats guessing from a profile limit.
  function densityAltFt(m) {
    if (!m || typeof m.temp !== "number" || typeof m.altim !== "number") { return null; }
    var elevFt = typeof m.elev === "number" ? m.elev * 3.28084 : 0;
    var altimInHg = m.altim > 200 ? m.altim / 33.8639 : m.altim;   // hPa or inHg
    var pa = elevFt + (29.92 - altimInHg) * 1000;
    var isa = 15 - (elevFt / 1000) * 1.98;
    return pa + 120 * (m.temp - isa);
  }

  function fmtAge(ms) {
    if (!ms) { return "—"; }
    var s = Math.round((Date.now() - ms) / 1000);
    return s < 60 ? s + "s" : Math.round(s / 60) + "m";
  }

  global.JuncoNet = {
    hasNative: hasNative,
    traffic: traffic, fetchTraffic: fetchTraffic,
    wx: wx, fetchWx: fetchWx,
    densityAltFt: densityAltFt,
    distNM: distNM, bearing: bearing, fmtAge: fmtAge
  };
})(this);
