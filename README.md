# Junco

**Open engine and air data node for Part 103 and experimental aircraft.**

Junco instruments an ultralight or experimental aircraft and streams engine, fuel, and air data over Bluetooth Low Energy to an app on the pilot's phone or tablet. The phone supplies position, attitude, and time. The node supplies what a phone cannot measure from inside its own case. It logs to an SD card and generates draft logbook entries after each flight.

Target cost is under $180 in parts. Target build is one person with a soldering iron, no hot air station and no PCB order.

---

## Status

**Pre-Phase 0.** Nothing has flown. Nothing has been built. This repository currently contains requirements and specifications only.

See [docs/prd.md](docs/prd.md) section 16 for the phase plan and section 15 for the assumptions that only flight testing can resolve.

[docs/open-questions.md](docs/open-questions.md) lists everything still undecided, in one place, separated into what needs a measurement and what needs a decision.

---

## Design rules

These constrain the design. They are not disclaimers.

1. **The sensor node is advisory only, enforced by being publish-only.** It publishes data and subscribes to nothing that influences its own outputs, so it structurally cannot be commanded. This scopes to the node, not the product family.
2. **Mechanical gauges stay installed.** Junco supplements a panel, it does not replace one.
3. **Draft, never file.** Logbook entries are proposed. The pilot reviews and confirms.
4. **The owner owns the data.** Logs live on the owner's card. Recording is disableable.
5. **Config, not code.** Adapting Junco to a different aircraft must never require a toolchain.
6. **No claim of crash survivability.** It is a flight data logger, not a black box.
7. **A unit always declares what it is.** Firmware reports build class, hardware revision, and calibration date.
8. **Every channel declares its source.** A value from the phone's barometer and a value from a plumbed static plenum are not interchangeable. The display, the log, and the protocol must all say which one produced a given reading.
9. **Advisory-only data never raises an alert.** Data whose coverage or latency cannot be relied on may be displayed, marked as what it is, but may not drive audio or any advisory.

---

## Read this before building one

Junco is not a certified aviation product and is not tested to any aviation standard. If you build one, you are responsible for the result. That responsibility does not transfer to anyone else and it is not affected by anything in the licenses below.

Do not use Junco as a primary flight instrument. Do not remove working mechanical instruments because Junco duplicates them. Do not connect it to anything that moves a control surface.

If you feed Junco data into an autopilot, you have made Junco flight-critical for that installation even though Junco itself never actuates. It is not designed or tested to that standard.

---

## Repository layout

| Path | Contents |
|---|---|
| `docs/` | Product requirements, design rationale |
| `spec/` | Protocol and format specifications. The artifacts most likely to outlive the hardware |
| `firmware/` | Node firmware |
| `hardware/` | Schematics and board files |
| `enclosure/` | Printable enclosure, pitot, static plenum |
| `app/` | Android reference client |
| `tools/` | Log recovery and analysis |

---

## Relationship to other projects

Junco is an engine and air data front end for aircraft that existing open avionics do not cover. It is not a competing instrument system.

| Project | What it does | How Junco relates |
|---|---|---|
| [Open Checklists](https://openchecklists.net) | Aircraft profiles, and a machine-readable checklist library with provenance and verification state, for Part 103 and experimental aircraft | Junco reads aircraft profiles from here, and consumes the checklist, preflight-log and pilot-logbook schemas defined there. Both formats and all of that tooling live in [that repository](https://github.com/allenmcghan/openchecklists); `spec/aircraft-profile.md` redirects to it |
| [MakerPlane](https://github.com/makerplane) | FIX-Gateway data broker, pyEFIS display, CAN-FIX bus protocol for experimental aircraft | Junco publishes into FIX-Gateway through a plugin, so pyEFIS can display Junco data. CAN-FIX is the bus candidate for v2 |
| [Stratux](https://github.com/cyoung/stratux) | Dual band ADS-B receiver on a Raspberry Pi | Junco does not receive ADS-B. Traffic comes from a receiver the pilot already owns |
| [AP_Periph](https://dronecan.github.io/Implementations/AP_Periph/) | ArduPilot's DroneCAN peripheral node firmware | A candidate for the v2 bus stage. Not used in v1: no BLE, STM32 only, and no thermocouple or ignition-pulse tach support |

What none of them covers, and what Junco is actually for: a **two-stroke engine with CDI ignition and no ECU.** Four thermocouples, two opto-isolated ignition-pulse tachometers, sub-100 Pa differential pressure, and a static plenum that works in prop blast. The open engine monitor plugins that exist assume an engine with a computer in it. A Part 103 aircraft does not have one.

---

## Licensing

Different artifacts, different licenses. See [LICENSE](LICENSE), [LICENSE-HARDWARE](LICENSE-HARDWARE), and [LICENSE-DOCS](LICENSE-DOCS).

| Artifact | License | SPDX |
|---|---|---|
| Firmware, app, tools | GNU GPL v2 or later | `GPL-2.0-or-later` |
| Board files, enclosure models | CERN-OHL-S-2.0 | `CERN-OHL-S-2.0` |
| Documentation and specifications | CC-BY-4.0 | `CC-BY-4.0` |

You may build Junco for yourself. You may sell assembled units. You may fork it, rename it, and compete with it. That is intentional. What you may not do is take it closed: improvements to the firmware and the hardware return to everyone under the same terms.

Firmware is GPL v2 **or later**, which matches MakerPlane exactly, so code moves in both directions between Junco and FIX-Gateway or pyEFIS without friction. Every source file carries:

    SPDX-License-Identifier: GPL-2.0-or-later

**The specifications stay permissive deliberately.** They are meant to be implemented by anyone, including in closed products, because a protocol nobody is allowed to adopt is a protocol nobody adopts. CAN-FIX is Creative Commons for the same reason.

---

## Project goals beyond the hardware

Junco is built to outlive whoever is maintaining it. That drives several decisions that would otherwise look like overkill:

- Sensors are specified by **requirement**, not part number, so a builder in 2034 can substitute what exists then
- Log files are **self-describing**, so a 2027 flight is readable in 2040 with the file and nothing else
- Protocols are documented separately from the implementation
- Rationale is recorded alongside decisions, because successors break what they do not understand the reason for

See [MAINTAINERS.md](MAINTAINERS.md).
