# Junco

**Open engine and air data node for Part 103 and experimental aircraft.**

Junco instruments an ultralight or experimental aircraft and streams engine, fuel, and air data over Bluetooth Low Energy to an app on the pilot's phone or tablet. The phone supplies position, attitude, and time. The node supplies what a phone cannot measure from inside its own case. It logs to an SD card and generates draft logbook entries after each flight.

Target cost is under $180 in parts. Target build is one person with a soldering iron, no hot air station and no PCB order.

---

## Status

**Pre-Phase 0.** Nothing has flown. Nothing has been built. This repository currently contains requirements and specifications only.

See [docs/prd.md](docs/prd.md) section 16 for the phase plan and section 15 for the assumptions that only flight testing can resolve.

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

## Licensing

Different artifacts, different licenses. See [LICENSE](LICENSE), [LICENSE-HARDWARE](LICENSE-HARDWARE), and [LICENSE-DOCS](LICENSE-DOCS).

| Artifact | License |
|---|---|
| Firmware, app, tools | MIT |
| Board files, enclosure models | CERN-OHL-P-2.0 |
| Documentation and specifications | CC-BY-4.0 |

You may build Junco for yourself. You may sell assembled units. You may fork it, rename it, and compete with it. That is intentional.

---

## Project goals beyond the hardware

Junco is built to outlive whoever is maintaining it. That drives several decisions that would otherwise look like overkill:

- Sensors are specified by **requirement**, not part number, so a builder in 2034 can substitute what exists then
- Log files are **self-describing**, so a 2027 flight is readable in 2040 with the file and nothing else
- Protocols are documented separately from the implementation
- Rationale is recorded alongside decisions, because successors break what they do not understand the reason for

See [MAINTAINERS.md](MAINTAINERS.md).
