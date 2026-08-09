# Open questions

Everything not yet decided, in one place. Previously this was scattered across
five documents, which meant nobody could tell how much was actually open.

**The rule for this file:** a question leaves it by being answered in the
document it belongs to, not by being answered here. This is an index of open
work, not a place decisions live.

Last reviewed: August 2026, PRD revision 5.

---

## Needs a measurement

These cannot be answered at a desk. PRD section 15 holds the full table with the
risk attached to each; this is the summary.

**Nine of the twelve close in phases 0 and 1, and phase 0 needs no firmware at
all.** It is an ESP32, one barometer, a breadboard, and ground runs at every RPM.

The cheapest instrumentation available: add one thermocouple and a logging
laptop to the EMI ground runs already planned, and four questions close at once.

| Question | Phase |
|---|---|
| BLE link survives twin CDI ignition at the mount point | 0 |
| I2C survives the same environment | 0 |
| Enclosure temperature stays in range on the engine cage | 0, plus a summer |
| Ground idle does not heat-soak the enclosure before takeoff | 0 |
| A printed static plenum gives usable vario data in prop blast | 1 |
| A cooling inlet near the pitot does not couple into the plenum | 1 |
| Phone holds BLE and headset audio simultaneously | 1 |
| A dash-mounted phone does not thermally shut down in summer sun | 1 |
| Phone attitude is stable enough on a vibrating airframe to show | 1 |
| Magnetic float fuel sensing survives vibration and slosh | 3 |
| A pitot can be placed usefully on a powered parachute | 4 |
| Phone holds BLE, USB OTG to an SDR, and headset audio at once | Traffic work |

The Pi-class build in PRD section 23 lives or dies on the two thermal rows.

---

## Blocked on a prior decision

Answering these before the thing they depend on is wasted work.

| Question | Blocked on | Where |
|---|---|---|
| Two engines: separate node IDs or an engine index field? | The bus choice | `spec/dronecan-engine-extension.md` |
| Does fuel endurance belong in the engine namespace or its own? | The bus choice | `spec/dronecan-engine-extension.md` |

**The bus choice itself** — DroneCAN or CAN-FIX — is deliberately deferred to
v2, because v1 has no bus and no second node. PRD section 24 records the
argument and leans CAN-FIX: its consumers are experimental aircraft panels
rather than autopilots, and its specification is Creative Commons.

---

## Open, decidable, not urgent

| Question | Where | Note |
|---|---|---|
| Full node status payload beyond transition counts | `spec/ble-telemetry.md` | Uptime, supply voltage, SD state, free space are candidates |
| What the BLE advertisement carries | `spec/ble-telemetry.md` | Device name convention, whether build class is visible before connecting |
| Rate class payload exceeding the negotiated MTU | `spec/ble-telemetry.md` | Reachable by a many-cylinder aircraft. The PM-2 does not reach it |
| Configuration characteristic read semantics | `spec/ble-telemetry.md` | Current hash, last validation result, or both |
| TOML key names and file section structure | `spec/aircraft-profile.md` | |
| Binary profile field layout | `spec/aircraft-profile.md` | Shared with `ble-telemetry.md` |
| Behavior with no valid profile at all | `spec/aircraft-profile.md` | A freshly built unit that has never been configured |
| CRC polynomial and width | `spec/log-format.md` | |
| Magic header value and record alignment | `spec/log-format.md` | The recovery scanner depends on both |
| CSV and GPX export mapping | `spec/log-format.md` | Deferred deliberately. A `tools/` concern that cannot cost field hardware |

---

## Needs the maintainer

| Question | Note |
|---|---|
| `ESP32-S31` | Appears three times in `docs/prd.md`, sections 7, 19, and 25. There is no such Espressif part. Section 19 says it "shipped two months after the S3 was selected" and section 7 credits it with Bluetooth Classic support, which narrows it, but the intent is not recoverable from the text |

---

## Stewardship

From `MAINTAINERS.md`, in the order worth doing them.

1. **Name a co-maintainer.** This is the one that makes the others matter. A
   single-maintainer project is a project with a scheduled end date, and every
   other item on this list assumes someone is there to act on it
2. **Move to a GitHub organization with two owners.** Currently a personal
   account, which PRD section 17 already says is insufficient
3. **Mirror to a second forge**
4. **Zenodo DOI on a tagged release.** Cheap, and can wait for something to tag
5. **OSHWA certification.** Free and self-certified
6. **Fiscal host for donations.** Only if donations actually appear

---

## Recently closed

Kept briefly so the next reader can see the trajectory rather than assuming
these were never considered. Full rationale lives in the specs.

**Irreversible, decided in revision 5:** the BLE UUID base is generated and
frozen; the log is a preallocated file on FAT32 rather than a raw partition; the
profile hash is SHA-256 over the stored bytes rather than a re-serialization.

**Also closed in revision 5:** integer SI channel encoding with no floats and no
display units on the wire; whole-profile atomic configuration writes; "in
flight" defined as the log file being open; node-side channel transition counts;
bonding required to write but not to subscribe; two concurrent clients with
first-clock-write-wins; profile chunking and encoding; TOML source plus a
compiled binary form; schema versioning that refuses rather than guesses;
validation rules; `uint8` record type allocation; ArduPilot-style format
descriptors; log payloads byte-identical to BLE payloads; and seizure precursors
publishing a raw rate rather than a computed judgment.
