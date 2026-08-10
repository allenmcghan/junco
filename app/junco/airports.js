/* Junco — airport and frequency database.
 *
 * Bundled, not fetched. 25,000 US airports with 13,000 frequencies is under
 * 600 kB compressed, and an aircraft with an engine problem at 800 feet has no
 * signal and no time. The whole point of "nearest airport" is that it works
 * when nothing else does, so it ships inside the app.
 *
 * Source: OurAirports (https://ourairports.com), released into the public
 * domain. Community maintained, which means it is more complete than official
 * sources for small private strips and occasionally wrong. Frequencies in
 * particular are worth confirming against the Chart Supplement before you key
 * the mic at a towered field.
 *
 * Regenerate with tools/build-airports.py.
 *
 * SPDX-License-Identifier: MPL-2.0
 */
(function (global) {
  "use strict";
  var N = global.JuncoNet;

  // [ident, name, lat, lon, elevFt, typeCode, [[freqType, mhz], ...]]
  var DB = null, loading = false, ready = null;

  var TYPE = { S: "Airport", M: "Airport", L: "Airport", W: "Seaplane", H: "Heliport", B: "Balloonport" };
  var FREQ = {
    CTAF: "CTAF", UNIC: "UNICOM", TWR: "Tower", GND: "Ground", ATIS: "ATIS",
    AWOS: "AWOS", ASOS: "ASOS", APP: "Approach", DEP: "Departure", CNTR: "Center",
    CLD: "Clearance", RDO: "Radio", AFIS: "AFIS", MISC: "Other"
  };

  function load() {
    if (ready) { return ready; }
    loading = true;
    ready = fetch("./data/airports.json", { cache: "force-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { DB = j; loading = false; return DB; })
      .catch(function () { loading = false; DB = []; return DB; });
    return ready;
  }

  function isReady() { return DB !== null; }
  function count() { return DB ? DB.length : 0; }

  /**
   * Nearest airports to a position.
   * Coarse latitude gate first: scanning 25,000 great-circle distances every
   * frame would be wasteful, and one degree of latitude is 60 nm.
   */
  function nearest(lat, lon, limit, maxNM) {
    if (!DB || lat === null) { return []; }
    limit = limit || 8;
    maxNM = maxNM || 50;
    var dLat = maxNM / 60 + 0.05, out = [];
    for (var i = 0; i < DB.length; i++) {
      var a = DB[i];
      if (a[2] < lat - dLat) { continue; }
      if (a[2] > lat + dLat) { break; }              // sorted by latitude
      var d = N.distNM(lat, lon, a[2], a[3]);
      if (d > maxNM) { continue; }
      out.push({
        ident: a[0], name: a[1], lat: a[2], lon: a[3], elev: a[4],
        kind: TYPE[a[5]] || "Airport", freqs: a[6] || [],
        dist: d, brg: N.bearing(lat, lon, a[2], a[3])
      });
    }
    out.sort(function (x, y) { return x.dist - y.dist; });
    return out.slice(0, limit);
  }

  /** Airports inside a bounding box, for drawing on the map. */
  function inBox(lat0, lon0, lat1, lon1, cap) {
    if (!DB) { return []; }
    var out = [];
    for (var i = 0; i < DB.length; i++) {
      var a = DB[i];
      if (a[2] < lat0) { continue; }
      if (a[2] > lat1) { break; }
      if (a[3] < lon0 || a[3] > lon1) { continue; }
      out.push({ ident: a[0], name: a[1], lat: a[2], lon: a[3], kind: a[5] });
      if (out.length >= (cap || 300)) { break; }
    }
    return out;
  }

  function byIdent(id) {
    if (!DB || !id) { return null; }
    id = String(id).toUpperCase().replace(/^K/, "");
    for (var i = 0; i < DB.length; i++) {
      if (DB[i][0] === id || DB[i][0] === "K" + id) {
        var a = DB[i];
        return { ident: a[0], name: a[1], lat: a[2], lon: a[3], elev: a[4], freqs: a[6] || [] };
      }
    }
    return null;
  }

  function freqLabel(code) { return FREQ[code] || code; }

  /** CTAF or UNICOM, which is the one a Part 103 pilot actually needs. */
  function primaryFreq(ap) {
    if (!ap || !ap.freqs.length) { return null; }
    var order = ["CTAF", "UNIC", "TWR", "AFIS", "RDO"];
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < ap.freqs.length; j++) {
        if (ap.freqs[j][0] === order[i]) { return { label: freqLabel(order[i]), mhz: ap.freqs[j][1] }; }
      }
    }
    return { label: freqLabel(ap.freqs[0][0]), mhz: ap.freqs[0][1] };
  }

  global.JuncoAirports = {
    load: load, isReady: isReady, count: count, loading: function () { return loading; },
    nearest: nearest, inBox: inBox, byIdent: byIdent,
    freqLabel: freqLabel, primaryFreq: primaryFreq
  };
})(this);
