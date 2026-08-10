/* Junco aircraft profile — library, TOML serialisation, unit conversion.
 *
 * The profile describes the aircraft completely, per PRD section 11 and
 * spec/aircraft-profile.md. Two things follow from that and are easy to miss:
 *
 *  1. The display is generated FROM the profile. A twin gets two RPM rows and a
 *     sync bar, a single gets one and none. Nobody edits a layout; they edit an
 *     aircraft. That is design rule 5, "config not code", applied to the panel.
 *
 *  2. Units are a display concern only. Every value moves in SI and is
 *     converted at render, which is the same rule the BLE protocol enforces on
 *     the wire. Gallons never exist in the data, only on the glass.
 *
 * TOML is the interchange format because a builder has to be able to open it in
 * a text editor and understand it. This is a deliberately small subset: tables,
 * strings, numbers, booleans. Enough for a profile, and no more.
 *
 * SPDX-License-Identifier: MPL-2.0
 */
(function (global) {
  "use strict";

  var SCHEMA = 1;

  /* ---------------- unit conversion ---------------- */
  // Base units are SI: m/s, m, degC, litres.
  var U = {
    speed: {
      mph:  { to: function (v) { return v * 2.2369363; }, from: function (v) { return v / 2.2369363; }, label: "MPH" },
      kt:   { to: function (v) { return v * 1.9438445; }, from: function (v) { return v / 1.9438445; }, label: "KT" },
      kmh:  { to: function (v) { return v * 3.6; },       from: function (v) { return v / 3.6; },       label: "KM/H" }
    },
    alt: {
      ft: { to: function (v) { return v * 3.2808399; }, from: function (v) { return v / 3.2808399; }, label: "FT" },
      m:  { to: function (v) { return v; },             from: function (v) { return v; },             label: "M" }
    },
    temp: {
      F: { to: function (v) { return v * 9 / 5 + 32; }, from: function (v) { return (v - 32) * 5 / 9; }, label: "°F" },
      C: { to: function (v) { return v; },              from: function (v) { return v; },               label: "°C" }
    },
    fuel: {
      gal: { to: function (v) { return v * 0.26417205; }, from: function (v) { return v / 0.26417205; }, label: "GAL" },
      L:   { to: function (v) { return v; },             from: function (v) { return v; },              label: "L" }
    },
    vs: {
      fpm: { to: function (v) { return v * 196.85039; }, from: function (v) { return v / 196.85039; }, label: "FPM" },
      ms:  { to: function (v) { return v; },             from: function (v) { return v; },             label: "M/S" }
    }
  };

  function conv(kind, unit) { return U[kind][unit] || U[kind][Object.keys(U[kind])[0]]; }

  /* ---------------- presets ---------------- */
  // Stored in SI. Written this way so the conversion path is exercised even
  // when the display units happen to match what the numbers were quoted in.
  function preset(id) {
    var p = {
      "pm2": {
        id: "pm2", name: "ParaPlane PM-2", registration: "Part 103",
        make: "ParaPlane", model: "PM-2", buildClass: "self-built",
        engines: { count: 2, cht: 1, egt: 1, pulsesPerRev: 1 },
        limits: { rpmMax: 6800, chtMax: 224, egtMax: 677, densAltAdvisory: 2438 },
        speeds: { vs0: 9.8, vs1: 10.7, vno: 15.2, vne: 17.0, cruise: 12.5 },
        fuel: { capacity: 37.9, usable: 36.0, burnCruise: 13.6, reserveHr: 0.75 },
        units: { speed: "mph", alt: "ft", temp: "F", fuel: "gal", vs: "fpm" }
      },
      "single": {
        id: "single", name: "Single, two-stroke", registration: "Part 103",
        make: "", model: "", buildClass: "self-built",
        engines: { count: 1, cht: 1, egt: 1, pulsesPerRev: 1 },
        limits: { rpmMax: 6500, chtMax: 232, egtMax: 649, densAltAdvisory: 2438 },
        speeds: { vs0: 11.2, vs1: 12.1, vno: 22.4, vne: 26.8, cruise: 19.7 },
        fuel: { capacity: 18.9, usable: 18.0, burnCruise: 9.5, reserveHr: 0.5 },
        units: { speed: "mph", alt: "ft", temp: "F", fuel: "gal", vs: "fpm" }
      },
      "fourcyl": {
        id: "fourcyl", name: "Four-cylinder experimental", registration: "N-number",
        make: "", model: "", buildClass: "kit-built",
        engines: { count: 1, cht: 4, egt: 4, pulsesPerRev: 1 },
        limits: { rpmMax: 2700, chtMax: 260, egtMax: 816, densAltAdvisory: 2438 },
        speeds: { vs0: 22.4, vs1: 24.6, vno: 55.9, vne: 71.5, cruise: 49.2 },
        fuel: { capacity: 136, usable: 132, burnCruise: 30.3, reserveHr: 0.75 },
        units: { speed: "kt", alt: "ft", temp: "F", fuel: "gal", vs: "fpm" }
      }
    }[id];
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  /* ---------------- TOML, small subset ---------------- */
  function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
  function num(n) { return (Math.round(n * 1000) / 1000).toString(); }

  function toTOML(p) {
    var L = [];
    L.push("# Junco aircraft profile");
    L.push("# All values are SI: m/s, metres, degrees C, litres.");
    L.push("# Units below affect display only, never the data.");
    L.push("# See spec/aircraft-profile.md");
    L.push("");
    L.push("schema_version = " + SCHEMA);
    L.push("");
    L.push("[identity]");
    L.push('id = "' + esc(p.id) + '"');
    L.push('name = "' + esc(p.name) + '"');
    L.push('registration = "' + esc(p.registration) + '"');
    L.push('make = "' + esc(p.make || "") + '"');
    L.push('model = "' + esc(p.model || "") + '"');
    L.push('build_class = "' + esc(p.buildClass) + '"');
    L.push("");
    L.push("[engines]");
    L.push("count = " + p.engines.count);
    L.push("cht_per_engine = " + p.engines.cht);
    L.push("egt_per_engine = " + p.engines.egt);
    L.push("pulses_per_rev = " + p.engines.pulsesPerRev);
    L.push("");
    L.push("[limits]");
    L.push("rpm_max = " + num(p.limits.rpmMax));
    L.push("cht_max_c = " + num(p.limits.chtMax));
    L.push("egt_max_c = " + num(p.limits.egtMax));
    L.push("density_alt_advisory_m = " + num(p.limits.densAltAdvisory));
    L.push("");
    L.push("[speeds]  # m/s");
    L.push("vs0 = " + num(p.speeds.vs0));
    L.push("vs1 = " + num(p.speeds.vs1));
    L.push("vno = " + num(p.speeds.vno));
    L.push("vne = " + num(p.speeds.vne));
    L.push("cruise = " + num(p.speeds.cruise));
    L.push("");
    L.push("[fuel]  # litres, litres per hour");
    L.push("capacity = " + num(p.fuel.capacity));
    L.push("usable = " + num(p.fuel.usable));
    L.push("burn_cruise = " + num(p.fuel.burnCruise));
    L.push("reserve_hr = " + num(p.fuel.reserveHr));
    L.push("");
    L.push("[units]  # display only");
    L.push('speed = "' + p.units.speed + '"');
    L.push('alt = "' + p.units.alt + '"');
    L.push('temp = "' + p.units.temp + '"');
    L.push('fuel = "' + p.units.fuel + '"');
    L.push('vertical_speed = "' + p.units.vs + '"');
    L.push("");
    return L.join("\n");
  }

  function fromTOML(text) {
    var out = {}, table = null;
    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.replace(/(^|\s)#.*$/, "").trim();
      if (!line) { return; }
      var t = line.match(/^\[([A-Za-z0-9_.]+)\]$/);
      if (t) { table = t[1]; out[table] = out[table] || {}; return; }
      var kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
      if (!kv) { return; }
      var k = kv[1], v = kv[2].trim(), val;
      if (/^".*"$/.test(v)) { val = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\"); }
      else if (/^(true|false)$/.test(v)) { val = v === "true"; }
      else if (/^-?\d+(\.\d+)?$/.test(v)) { val = parseFloat(v); }
      else { val = v; }
      if (table) { out[table][k] = val; } else { out[k] = val; }
    });

    if (out.schema_version && out.schema_version > SCHEMA) {
      throw new Error("profile schema " + out.schema_version + " is newer than this build understands (" + SCHEMA + ")");
    }
    var id = (out.identity || {});
    var en = (out.engines || {});
    var li = (out.limits || {});
    var sp = (out.speeds || {});
    var fu = (out.fuel || {});
    var un = (out.units || {});
    var p = {
      id: id.id || ("imported-" + Math.abs(hash(text)).toString(36).slice(0, 6)),
      name: id.name || "Imported aircraft",
      registration: id.registration || "",
      make: id.make || "", model: id.model || "",
      buildClass: id.build_class || "self-built",
      engines: {
        count: clampInt(en.count, 1, 4, 1),
        cht: clampInt(en.cht_per_engine, 0, 6, 1),
        egt: clampInt(en.egt_per_engine, 0, 6, 1),
        pulsesPerRev: clampInt(en.pulses_per_rev, 1, 6, 1)
      },
      limits: {
        rpmMax: numOr(li.rpm_max, 6800), chtMax: numOr(li.cht_max_c, 224),
        egtMax: numOr(li.egt_max_c, 677), densAltAdvisory: numOr(li.density_alt_advisory_m, 2438)
      },
      speeds: {
        vs0: numOr(sp.vs0, 9.8), vs1: numOr(sp.vs1, 10.7), vno: numOr(sp.vno, 15.2),
        vne: numOr(sp.vne, 17.0), cruise: numOr(sp.cruise, 12.5)
      },
      fuel: {
        capacity: numOr(fu.capacity, 37.9), usable: numOr(fu.usable, 36),
        burnCruise: numOr(fu.burn_cruise, 13.6), reserveHr: numOr(fu.reserve_hr, 0.75)
      },
      units: {
        speed: pick(un.speed, ["mph", "kt", "kmh"], "mph"),
        alt: pick(un.alt, ["ft", "m"], "ft"),
        temp: pick(un.temp, ["F", "C"], "F"),
        fuel: pick(un.fuel, ["gal", "L"], "gal"),
        vs: pick(un.vertical_speed, ["fpm", "ms"], "fpm")
      }
    };
    var bad = validate(p);
    if (bad.length) { throw new Error(bad[0]); }
    return p;
  }

  function clampInt(v, lo, hi, d) { v = parseInt(v, 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); }
  function numOr(v, d) { v = parseFloat(v); return isNaN(v) ? d : v; }
  function pick(v, allowed, d) { return allowed.indexOf(v) >= 0 ? v : d; }
  function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return h; }

  /* ---------------- validation ----------------
     The node refuses to arm a channel that fails, so the tool has to reject the
     same things. Better to be told on the ground. */
  function validate(p) {
    var e = [];
    if (!p.name) { e.push("aircraft needs a name"); }
    if (p.engines.count < 1) { e.push("engine count must be at least 1"); }
    if (p.engines.cht === 0 && p.engines.egt === 0) { e.push("an engine with no CHT and no EGT has nothing to monitor"); }
    if (p.fuel.usable > p.fuel.capacity) { e.push("usable fuel exceeds capacity"); }
    if (p.engines.pulsesPerRev < 1) { e.push("pulses per revolution must be at least 1"); }
    if (p.speeds.vs0 >= p.speeds.vne) { e.push("stall speed is at or above never-exceed"); }
    if (p.limits.chtMax <= 0) { e.push("CHT limit must be positive"); }
    if (p.fuel.burnCruise <= 0) { e.push("cruise burn must be positive"); }
    return e;
  }

  /* ---------------- library ---------------- */
  var KEY = "junco.profiles";
  var SEL = "junco.profile.active";

  function all() {
    var lib;
    try { lib = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (err) { lib = null; }
    if (!lib || !lib.length) {
      lib = [preset("pm2"), preset("single"), preset("fourcyl")];
      save(lib);
    }
    return lib;
  }
  function save(lib) { try { localStorage.setItem(KEY, JSON.stringify(lib)); } catch (err) {} }
  function active() {
    var lib = all(), id;
    try { id = localStorage.getItem(SEL); } catch (err) { id = null; }
    var found = null;
    lib.forEach(function (p) { if (p.id === id) { found = p; } });
    return found || lib[0];
  }
  function setActive(id) { try { localStorage.setItem(SEL, id); } catch (err) {} }
  function put(p) {
    var lib = all(), replaced = false;
    lib = lib.map(function (x) { if (x.id === p.id) { replaced = true; return p; } return x; });
    if (!replaced) { lib.push(p); }
    save(lib);
    return p;
  }
  function remove(id) {
    var lib = all().filter(function (p) { return p.id !== id; });
    if (!lib.length) { lib = [preset("pm2")]; }
    save(lib);
    return lib;
  }
  function uniqueId(base) {
    var lib = all(), id = base, n = 2;
    var taken = function (x) { var t = false; lib.forEach(function (p) { if (p.id === x) { t = true; } }); return t; };
    while (taken(id)) { id = base + "-" + n; n++; }
    return id;
  }

  global.JuncoProfile = {
    SCHEMA: SCHEMA,
    conv: conv, units: U,
    preset: preset, presets: ["pm2", "single", "fourcyl"],
    toTOML: toTOML, fromTOML: fromTOML, validate: validate,
    all: all, save: save, active: active, setActive: setActive,
    put: put, remove: remove, uniqueId: uniqueId
  };
})(this);
