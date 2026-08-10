/* Junco mockup — navigation, checklists, logbook.
 *
 * What every EFB has that matters to an aircraft with no panel, minus the parts
 * that need chart data we cannot ship:
 *
 *   NAV        distance and bearing to a destination, and to where you took
 *              off from. No database needed, which is why it works everywhere
 *              and offline. "How do I get back" is the question an ultralight
 *              pilot actually asks, and it is pure spherical trigonometry.
 *
 *   MAP        a plot with no basemap. Breadcrumb, home, destination, traffic,
 *              range rings, track-up or north-up. Deliberately tile-free: tiles
 *              mean a network at 800 feet over a field, which is exactly where
 *              there is not one. A track and a bearing beat a blank grey square.
 *
 *   CHECKLIST  per aircraft, editable, five phases. Stored against the profile
 *              id so switching aircraft switches checklists.
 *
 *   LOGBOOK    takeoff and landing detected from GNSS, flights recorded and
 *              exportable. PRD section 13: Junco proposes entries, it never
 *              files them, and the pilot confirms. 14 CFR 61.51 puts accuracy
 *              on the pilot, so nothing here is authoritative.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function (global) {
  "use strict";

  var N = global.JuncoNet;
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ================= navigation ================= */
  var nav = {
    home: null,          // {lat, lon, at}  where the wheels left the ground
    dest: null,          // {lat, lon, name}
    active: "dest"       // which one the PFD is pointing at
  };
  (function () { var s = LS.get("junco.nav", null); if (s) { nav.home = s.home; nav.dest = s.dest; nav.active = s.active || "dest"; } })();
  function saveNav() { LS.set("junco.nav", nav); }

  function target() { return nav.active === "home" ? nav.home : nav.dest; }

  /** Distance, bearing, relative bearing and time to run. Null when unknown. */
  function solution(lat, lon, trackDeg, gsMs) {
    var t = target();
    if (t === null || lat === null || lon === null) { return null; }
    var d = N.distNM(lat, lon, t.lat, t.lon);
    var b = N.bearing(lat, lon, t.lat, t.lon);
    var rel = trackDeg === null ? null : (((b - trackDeg + 540) % 360) - 180);
    var gsKt = gsMs === null ? null : gsMs * 1.9438445;
    // Closure along the course, not raw ground speed: crabbing 40 degrees off
    // does not get you there at ground speed and the ETE should not pretend so.
    var closure = (gsKt === null || rel === null) ? gsKt : gsKt * Math.cos(rel * Math.PI / 180);
    var ete = (closure && closure > 1) ? d / closure * 3600 : null;
    return { dist: d, brg: b, rel: rel, ete: ete, name: t.name || (nav.active === "home" ? "HOME" : "DEST") };
  }

  function setHome(lat, lon) { nav.home = { lat: lat, lon: lon, at: Date.now() }; saveNav(); }
  function setDest(lat, lon, name) { nav.dest = { lat: lat, lon: lon, name: name || "DEST" }; saveNav(); }
  function setActive(which) { nav.active = which; saveNav(); }

  function fmtLatLon(s) {
    var m = String(s).trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) { return null; }
    var la = parseFloat(m[1]), lo = parseFloat(m[2]);
    if (isNaN(la) || isNaN(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { return null; }
    return { lat: la, lon: lo };
  }

  /* ================= breadcrumb ================= */
  var trail = [];                 // {lat, lon, alt, t}
  var TRAIL_MAX = 4000;
  function addTrail(lat, lon, alt) {
    if (lat === null || lon === null) { return; }
    var last = trail[trail.length - 1];
    if (last && N.distNM(last.lat, last.lon, lat, lon) < 0.005) { return; }
    trail.push({ lat: lat, lon: lon, alt: alt, t: Date.now() });
    if (trail.length > TRAIL_MAX) { trail.shift(); }
  }
  function clearTrail() { trail.length = 0; }

  /* ================= checklists ================= */
  var PHASES = [
    { id: "preflight",   name: "Preflight" },
    { id: "pretakeoff",  name: "Before takeoff" },
    { id: "inflight",    name: "In flight" },
    { id: "prelanding",  name: "Before landing" },
    { id: "postflight",  name: "After landing" }
  ];

  // Starting point, not gospel. A checklist that is not the pilot's own gets
  // ignored, so these exist to be edited rather than followed.
  function defaults() {
    return {
      preflight: ["Aircraft documents aboard", "Walk-around complete", "Fuel quantity and quality checked",
                  "Oil / fuel mix correct", "Prop and spinner condition", "Control surfaces free and correct",
                  "Wing / sail and lines inspected", "Tyres and gear condition", "Weight and balance within limits"],
      pretakeoff: ["Harness fastened and snug", "Helmet and radio on", "Fuel valve on", "Engine warm-up complete",
                   "Both engines run up, temps green", "Controls free and correct", "Density altitude checked",
                   "Wind and traffic checked", "Departure path clear"],
      inflight: ["Engine temps in range", "Fuel state and endurance", "Position and home bearing known",
                 "Traffic scan", "Landing site within reach"],
      prelanding: ["Fuel sufficient for go-around", "Wind and sock checked", "Approach path clear",
                   "Traffic clear", "Harness secure"],
      postflight: ["Engine cool-down complete", "Fuel valve off", "Ignition off", "Aircraft secured / tied down",
                   "Logbook entry reviewed", "Discrepancies noted"]
    };
  }
  function key(profileId) { return "junco.checklist." + profileId; }
  function getChecklist(profileId) {
    var c = LS.get(key(profileId), null);
    if (!c) { c = defaults(); LS.set(key(profileId), c); }
    PHASES.forEach(function (p) { if (!c[p.id]) { c[p.id] = []; } });
    return c;
  }
  function saveChecklist(profileId, c) { LS.set(key(profileId), c); }
  function resetChecklist(profileId) { var d = defaults(); LS.set(key(profileId), d); return d; }

  // tick state is per session, not persisted: a checklist that remembers being
  // complete from last week is worse than no checklist.
  var ticks = {};
  function tick(phase, i, on) { ticks[phase + ":" + i] = on; }
  function ticked(phase, i) { return !!ticks[phase + ":" + i]; }
  function clearTicks(phase) {
    Object.keys(ticks).forEach(function (k) { if (!phase || k.indexOf(phase + ":") === 0) { delete ticks[k]; } });
  }

  /* ================= logbook ================= */
  /* Airborne detection from GNSS alone. Ground speed crossing a threshold
     derived from the aircraft's own stall speed, held for a few samples so a
     GPS glitch does not log a flight. */
  var book = LS.get("junco.logbook", []);
  var fl = null;                 // flight in progress
  var airborne = false, hyst = 0;

  function detect(P, lat, lon, gsMs, altM, nowMs) {
    if (gsMs === null || lat === null) { return null; }
    var thr = Math.max(3, (P.speeds.vs0 || 10) * 0.6);
    var want = gsMs > thr;
    if (want !== airborne) { hyst++; } else { hyst = 0; }
    if (hyst < 4) { return null; }
    hyst = 0; airborne = want;

    if (airborne) {
      fl = { aircraft: P.name, id: P.id, reg: P.registration,
             offAt: nowMs, offLat: lat, offLon: lon,
             maxAltM: altM || 0, distNM: 0, landings: 0, points: [] };
      setHome(lat, lon);          // where you left is where you may need to return
      return { event: "takeoff" };
    }
    if (fl) {
      fl.onAt = nowMs; fl.onLat = lat; fl.onLon = lon; fl.landings++;
      fl.minutes = Math.max(1, Math.round((fl.onAt - fl.offAt) / 60000));
      book.push(fl); LS.set("junco.logbook", book);
      var done = fl; fl = null;
      return { event: "landing", flight: done };
    }
    return null;
  }
  function update(lat, lon, altM) {
    if (!fl) { return; }
    if (altM && altM > fl.maxAltM) { fl.maxAltM = altM; }
    var last = fl.points[fl.points.length - 1];
    if (!last || N.distNM(last[0], last[1], lat, lon) > 0.01) {
      fl.points.push([lat, lon, altM || 0, Date.now()]);
      if (last) { fl.distNM += N.distNM(last[0], last[1], lat, lon); }
    }
  }
  function flights() { return book.slice().reverse(); }
  function current() { return fl; }
  function removeFlight(i) { var idx = book.length - 1 - i; if (idx >= 0) { book.splice(idx, 1); LS.set("junco.logbook", book); } }

  function iso(ms) { return new Date(ms).toISOString(); }
  function dateOnly(ms) { return iso(ms).slice(0, 10); }
  function hhmm(ms) { return iso(ms).slice(11, 16) + "Z"; }

  /* Export. PRD section 13: draft, never file. These are proposals for the
     pilot to review, which is why the header says so in the file itself. */
  function toCSV() {
    var L = ['"Junco proposed logbook entries. Review before filing. 14 CFR 61.51 places accuracy on the pilot."'];
    L.push("Date,AircraftID,Make,From,To,TotalTime,Landings,MaxAltFt,DistanceNM,OffUTC,OnUTC");
    flights().forEach(function (f) {
      L.push([dateOnly(f.offAt), csv(f.reg || f.id), csv(f.aircraft),
              f.offLat.toFixed(4) + " " + f.offLon.toFixed(4),
              (f.onLat === undefined ? "" : f.onLat.toFixed(4) + " " + f.onLon.toFixed(4)),
              (f.minutes / 60).toFixed(1), f.landings,
              Math.round((f.maxAltM || 0) * 3.28084), f.distNM.toFixed(1),
              hhmm(f.offAt), f.onAt ? hhmm(f.onAt) : ""].join(","));
    });
    return L.join("\n");
  }
  function csv(s) { s = String(s === undefined ? "" : s); return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

  function toGPX(i) {
    var f = flights()[i]; if (!f) { return ""; }
    var L = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<gpx version="1.1" creator="Junco mockup" xmlns="http://www.topografix.com/GPX/1/1">',
             "<trk><name>" + esc(f.aircraft) + " " + dateOnly(f.offAt) + "</name><trkseg>"];
    (f.points || []).forEach(function (p) {
      L.push('<trkpt lat="' + p[0].toFixed(6) + '" lon="' + p[1].toFixed(6) + '"><ele>' +
             (p[2] || 0).toFixed(1) + "</ele><time>" + iso(p[3]) + "</time></trkpt>");
    });
    L.push("</trkseg></trk></gpx>");
    return L.join("\n");
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function totals() {
    var min = 0, ld = 0;
    book.forEach(function (f) { min += f.minutes || 0; ld += f.landings || 0; });
    return { hours: min / 60, landings: ld, flights: book.length };
  }

  global.JuncoOps = {
    nav: nav, solution: solution, setHome: setHome, setDest: setDest, setActive: setActive,
    parseLatLon: fmtLatLon,
    trail: trail, addTrail: addTrail, clearTrail: clearTrail,
    PHASES: PHASES, getChecklist: getChecklist, saveChecklist: saveChecklist,
    resetChecklist: resetChecklist, tick: tick, ticked: ticked, clearTicks: clearTicks,
    detect: detect, update: update, flights: flights, current: current, removeFlight: removeFlight,
    toCSV: toCSV, toGPX: toGPX, totals: totals, dateOnly: dateOnly, hhmm: hhmm
  };
})(this);
