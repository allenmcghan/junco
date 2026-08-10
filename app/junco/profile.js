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

  var SCHEMA = 2;   // 2 added [weight_balance] and [station.N]

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
    },
    weight: {
      lb: { to: function (v) { return v * 2.2046226; }, from: function (v) { return v / 2.2046226; }, label: "LB" },
      kg: { to: function (v) { return v; },             from: function (v) { return v; },             label: "KG" }
    },
    // Arm is not chosen separately. Anyone weighing in pounds measures arms in
    // inches and anyone weighing in kilograms measures them in centimetres;
    // offering the four combinations would only create ways to mix them up.
    arm: {
      lb: { to: function (v) { return v * 39.370079; }, from: function (v) { return v / 39.370079; }, label: "IN" },
      kg: { to: function (v) { return v * 100; },       from: function (v) { return v / 100; },       label: "CM" }
    }
  };

  function conv(kind, unit) { return U[kind][unit] || U[kind][Object.keys(U[kind])[0]]; }

  /* ---------------- weight and balance ----------------
     Presets ship this OFF and empty on purpose. Every other field in a preset
     is a plausible starting point a builder can correct later; a weight and
     balance number is not. There is no plausible empty weight for an aircraft
     nobody has weighed, and a made-up one that happens to close the envelope is
     more dangerous than a blank page. The page refuses to compute until the
     numbers come off a real weighing. */
  function emptyWB() {
    return {
      enabled: false,
      emptyWeight: 0,      // kg
      emptyArm: 0,         // m aft of datum
      maxGross: 0,         // kg
      cgFwd: 0,            // m aft of datum
      cgAft: 0,            // m aft of datum
      fuelArm: 0,          // m aft of datum
      fuelDensity: 0.72,   // kg per litre; 0.72 mogas, 0.72 100LL, 0.80 Jet A
      datumNote: ""
    };
  }

  /* Solve one loading. Everything in and out is SI.
     loads is { stationIndex: kg, ... } plus fuelLitres. */
  function wbSolve(p, loads, fuelLitres) {
    var wb = p.wb || emptyWB();
    var rows = [], wTot = 0, mTot = 0;
    function add(name, w, arm) {
      if (!w) { return; }
      rows.push({ name: name, weight: w, arm: arm, moment: w * arm });
      wTot += w; mTot += w * arm;
    }
    add("Empty", wb.emptyWeight, wb.emptyArm);
    (p.stations || []).forEach(function (s, i) {
      add(s.name || ("Station " + (i + 1)), (loads && loads[i]) || 0, s.arm);
    });
    var fuelKg = (fuelLitres || 0) * (wb.fuelDensity || 0.72);
    add("Fuel", fuelKg, wb.fuelArm);

    var cg = wTot > 0 ? mTot / wTot : null;
    var errs = [];
    if (wb.maxGross > 0 && wTot > wb.maxGross) {
      errs.push("Over gross by " + (wTot - wb.maxGross).toFixed(1) + " kg");
    }
    if (cg !== null && wb.cgFwd > 0 && cg < wb.cgFwd) { errs.push("CG forward of limit"); }
    if (cg !== null && wb.cgAft > 0 && cg > wb.cgAft) { errs.push("CG aft of limit"); }
    // An envelope of zero width is not "in limits", it is unset.
    var envelope = wb.cgFwd > 0 && wb.cgAft > wb.cgFwd;
    return {
      rows: rows, weight: wTot, moment: mTot, cg: cg, fuelKg: fuelKg,
      envelope: envelope, grossSet: wb.maxGross > 0,
      errors: errs, ok: errs.length === 0
    };
  }

  /* 14 CFR 103.1, checked against what the profile already knows.
     Deliberately reports what it cannot check rather than passing it silently. */
  function part103(p) {
    var out = [];
    var lb = function (kg) { return kg * 2.2046226; };
    var gal = function (l) { return l * 0.26417205; };
    var kt = function (ms) { return ms * 1.9438445; };
    var ew = p.wb ? p.wb.emptyWeight : 0;
    if (!ew) {
      out.push({ ok: null, text: "Empty weight under 254 lb — no weighing entered" });
    } else {
      out.push({ ok: lb(ew) < 254, text: "Empty weight " + lb(ew).toFixed(1) + " lb, limit 254 lb" });
    }
    out.push({ ok: gal(p.fuel.capacity) <= 5.0,
               text: "Fuel capacity " + gal(p.fuel.capacity).toFixed(1) + " US gal, limit 5.0" });
    out.push({ ok: kt(p.speeds.vs1) <= 24.0,
               text: "Power-off stall " + kt(p.speeds.vs1).toFixed(1) + " kt CAS, limit 24" });
    out.push({ ok: null, text: "Full-power level flight under 55 kt CAS — not measured by this app" });
    out.push({ ok: null, text: "Single occupant, no airworthiness certificate, day VFR only" });
    return out;
  }

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
        wb: emptyWB(), stations: [],
        units: { speed: "mph", alt: "ft", temp: "F", fuel: "gal", vs: "fpm", weight: "lb" }
      },
      "single": {
        id: "single", name: "Single, two-stroke", registration: "Part 103",
        make: "", model: "", buildClass: "self-built",
        engines: { count: 1, cht: 1, egt: 1, pulsesPerRev: 1 },
        limits: { rpmMax: 6500, chtMax: 232, egtMax: 649, densAltAdvisory: 2438 },
        speeds: { vs0: 11.2, vs1: 12.1, vno: 22.4, vne: 26.8, cruise: 19.7 },
        fuel: { capacity: 18.9, usable: 18.0, burnCruise: 9.5, reserveHr: 0.5 },
        wb: emptyWB(), stations: [],
        units: { speed: "mph", alt: "ft", temp: "F", fuel: "gal", vs: "fpm", weight: "lb" }
      },
      "fourcyl": {
        id: "fourcyl", name: "Four-cylinder experimental", registration: "N-number",
        make: "", model: "", buildClass: "kit-built",
        engines: { count: 1, cht: 4, egt: 4, pulsesPerRev: 1 },
        limits: { rpmMax: 2700, chtMax: 260, egtMax: 816, densAltAdvisory: 2438 },
        speeds: { vs0: 22.4, vs1: 24.6, vno: 55.9, vne: 71.5, cruise: 49.2 },
        fuel: { capacity: 136, usable: 132, burnCruise: 30.3, reserveHr: 0.75 },
        wb: emptyWB(), stations: [],
        units: { speed: "kt", alt: "ft", temp: "F", fuel: "gal", vs: "fpm", weight: "lb" }
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
    var wb = p.wb || emptyWB();
    L.push("[weight_balance]  # kilograms, metres aft of datum");
    L.push("# Enter these from an actual weighing. Junco ships them blank because");
    L.push("# a guessed empty weight that happens to close the envelope is worse");
    L.push("# than no envelope at all.");
    L.push("enabled = " + (wb.enabled ? "true" : "false"));
    L.push("empty_weight = " + num(wb.emptyWeight));
    L.push("empty_arm = " + num(wb.emptyArm));
    L.push("max_gross = " + num(wb.maxGross));
    L.push("cg_fwd = " + num(wb.cgFwd));
    L.push("cg_aft = " + num(wb.cgAft));
    L.push("fuel_arm = " + num(wb.fuelArm));
    L.push("fuel_density = " + num(wb.fuelDensity));
    L.push('datum_note = "' + esc(wb.datumNote || "") + '"');
    L.push("");
    (p.stations || []).forEach(function (s, i) {
      L.push("[station." + (i + 1) + "]");
      L.push('name = "' + esc(s.name || "") + '"');
      L.push("arm = " + num(s.arm || 0));
      L.push("max = " + num(s.max || 0));
      L.push("");
    });
    L.push("[units]  # display only");
    L.push('speed = "' + p.units.speed + '"');
    L.push('alt = "' + p.units.alt + '"');
    L.push('temp = "' + p.units.temp + '"');
    L.push('fuel = "' + p.units.fuel + '"');
    L.push('vertical_speed = "' + p.units.vs + '"');
    L.push('weight = "' + (p.units.weight || "lb") + '"  # arm follows: in with lb, cm with kg');
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
    // A document with none of the tables a profile is made of is not an empty
    // profile, it is not a profile. Without this, pasting an empty clipboard
    // into "Load from text" silently produced an aircraft made entirely of
    // defaults, named "Imported aircraft", with someone's idea of a stall
    // speed in it. Refusing is the only honest answer.
    // The test is for a TABLE of that name, not any value of that name. A file
    // with its section headers stripped leaves `fuel = "gal"` from [units] at
    // the top level, and a bare string passed the first version of this check
    // because Object.keys("gal") is three characters long.
    var known = ["identity", "engines", "limits", "speeds", "fuel", "units", "weight_balance"];
    var isTable = function (v) {
      return v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
    };
    if (!known.some(function (t) { return isTable(out[t]); })) {
      throw new Error("this does not look like a Junco aircraft profile");
    }
    var id = (out.identity || {});
    var en = (out.engines || {});
    var li = (out.limits || {});
    var sp = (out.speeds || {});
    var fu = (out.fuel || {});
    var un = (out.units || {});
    var wbT = (out.weight_balance || {});
    var stations = [];
    Object.keys(out).forEach(function (k) {
      var m = k.match(/^station\.(\d+)$/);
      if (m) { stations[parseInt(m[1], 10) - 1] = out[k]; }
    });
    stations = stations.filter(Boolean).map(function (s) {
      return { name: String(s.name || ""), arm: numOr(s.arm, 0), max: numOr(s.max, 0) };
    });
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
      wb: {
        enabled: wbT.enabled === true,
        emptyWeight: numOr(wbT.empty_weight, 0), emptyArm: numOr(wbT.empty_arm, 0),
        maxGross: numOr(wbT.max_gross, 0),
        cgFwd: numOr(wbT.cg_fwd, 0), cgAft: numOr(wbT.cg_aft, 0),
        fuelArm: numOr(wbT.fuel_arm, 0), fuelDensity: numOr(wbT.fuel_density, 0.72),
        datumNote: String(wbT.datum_note || "")
      },
      stations: stations,
      units: {
        speed: pick(un.speed, ["mph", "kt", "kmh"], "mph"),
        alt: pick(un.alt, ["ft", "m"], "ft"),
        temp: pick(un.temp, ["F", "C"], "F"),
        fuel: pick(un.fuel, ["gal", "L"], "gal"),
        vs: pick(un.vertical_speed, ["fpm", "ms"], "fpm"),
        weight: pick(un.weight, ["lb", "kg"], "lb")
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
    var wb = p.wb;
    if (wb && wb.enabled) {
      if (wb.emptyWeight <= 0) { e.push("weight and balance is on but empty weight is not set"); }
      if (wb.maxGross > 0 && wb.emptyWeight >= wb.maxGross) { e.push("empty weight is at or above max gross"); }
      if (wb.cgAft > 0 && wb.cgFwd > 0 && wb.cgAft <= wb.cgFwd) { e.push("aft CG limit must be behind the forward limit"); }
      if (wb.fuelDensity <= 0) { e.push("fuel density must be positive"); }
    }
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
      return lib;
    }
    // Forward-migrate profiles saved by an older build. A missing block is
    // filled with a blank one, never a guess, for the reason emptyWB explains.
    var changed = false;
    lib.forEach(function (p) {
      if (!p.wb) { p.wb = emptyWB(); changed = true; }
      if (!p.stations) { p.stations = []; changed = true; }
      if (p.units && !p.units.weight) { p.units.weight = "lb"; changed = true; }
    });
    if (changed) { save(lib); }
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
    emptyWB: emptyWB, wbSolve: wbSolve, part103: part103,
    all: all, save: save, active: active, setActive: setActive,
    put: put, remove: remove, uniqueId: uniqueId
  };
})(this);
