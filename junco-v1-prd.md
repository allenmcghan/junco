# Junco v1 Product Requirements

**Open engine and air data node for Part 103 and experimental aircraft**

Status: Draft, revision 2
Target aircraft: ParaPlane PM-2 (twin engine powered parachute)
Target publish: AirVenture 2027

Revision 2 moves position and attitude sensing onto the pilot's phone, moves the link to Bluetooth Low Energy, and reduces the node to engine and air data only. Section 22 records what changed and why.

---

## 1. Summary

Junco is a low cost sensor node that instruments the parts of an ultralight or experimental aircraft a phone cannot reach, and streams that data over Bluetooth Low Energy to an app on the pilot's phone or tablet. The phone supplies position, attitude, and time. The node supplies engine, fuel, and pitot-static air data. Between them they produce a full instrument picture, an SD card flight log, and draft logbook entries.

v1 is a single breadboard-built node for the PM-2, documented well enough that another builder can reproduce it.

**v1 is a stage, not the end state.** The destination is a small calibrated box that bolts to the frame, environmentally qualified and commercially manufactured by a production partner, with the open-source self-build path preserved alongside it. Sections 20 and 21 describe that path. Every architectural decision here is made so the later stages do not require a redesign.

---

## 2. Design rules

These constrain the design. They are not disclaimers.

1. **The sensor node is advisory only, enforced by being publish-only.** The node publishes data and subscribes to nothing that influences its own outputs, so it structurally cannot be commanded even when sharing a bus with an autopilot. That is a stronger guarantee than a policy statement. This rule scopes to the node, not the product family. A sibling product that actuates is permitted and anticipated, but it is a different node with a different name and a different test program.
2. **Mechanical gauges stay installed.** Junco supplements a panel, it does not replace one.
3. **Draft, never file.** Logbook entries are proposed. The pilot reviews and confirms. 14 CFR 61.51 places accuracy on the pilot.
4. **The owner owns the data.** Logs live on the owner's card. Recording is disableable.
5. **Config, not code.** Adapting Junco to a different aircraft must never require a toolchain.
6. **No claim of crash survivability.** It is a flight data logger, not a black box.
7. **A unit always declares what it is.** Firmware reports build class, meaning self-built, kit-built, or factory-qualified, along with hardware revision and calibration date. Assurance differs enormously across those and the name sits on all of them.
8. **Every channel declares its source.** A value derived from the phone's barometer and a value derived from a plumbed static plenum are not interchangeable, and the display, the log, and the protocol must all say which one produced a given reading. New in revision 2, and load-bearing: the architecture now mixes two sensor platforms of very different quality.

---

## 3. Goals

- Put engine, fuel, air data, and position in one place on the PM-2
- Cost under $180 in parts for a complete node, down from $250 in revision 1
- Buildable by one person with a soldering iron, no hot air, no PCB order
- Reproducible by a stranger from published documentation
- Survive the maintainer losing interest

## 4. Non-goals for v1

- Custom PCB
- Distributed multi-node CAN network
- ADS-B receive
- GDL90 output. Demoted to phase 2, see section 14
- iOS native application. The protocol supports it, the app does not exist yet
- Angle of attack
- Anything sold to anyone
- **Autopilot, servos, or any actuation.** Deferred, not abandoned. See section 20. When it arrives it is a separate node subscribing to Junco, not a mode of the sensor node

---

## 5. Users

**Primary:** the builder-owner who assembles from published files and installs it in an aircraft he built or maintains himself. Comfortable with a soldering iron, a config file, and a wiring diagram. Not comfortable compiling firmware.

**Secondary:** the maintainer who picks this up in 2032 and has to source substitutes for discontinued parts. This user drives more requirements than people expect. See section 12.

---

## 6. Architecture

The phone is the hub. The node is a peripheral that supplies what the phone physically cannot measure.

```
   wired to the node, never separate devices
   thermocouples - tach pickups - fuel sender - pitot + static
              |
        Junco node  ------ SD card (raw log, node channels only)
              |
             BLE  ------------------ [Wi-Fi AP, on demand]
              |                       log pull - config - firmware
        +-----+------+
        | Junco app  |  phone GNSS - phone IMU - phone baro
        | (Android)  |  display - alerts - logbook - second log copy
        +------------+
```

### Division of labor

| Supplied by the phone | Supplied by the node |
|---|---|
| Position, ground speed, track | Engine speed, per engine |
| Attitude and heading | CHT and EGT, per cylinder |
| Time and date | Fuel quantity |
| Coarse pressure altitude (backup) | Static pressure from a plumbed plenum |
| Audio output | Differential pressure for airspeed |
| Display, storage, cellular | Outside air temperature |

### Why this split and not another

**Position moves to the phone.** Phone GNSS is multi-constellation, frequently dual-band, and assisted. It outperforms a MAX-M10S, costs nothing, and deletes the hardest antenna placement problem on a powered parachute.

**Attitude moves to the phone.** The operating system already runs a calibrated fusion across accelerometer, gyroscope, and magnetometer. It is free and adequate for advisory VFR use. It is explicitly **not** adequate to feed a control loop, which is consistent with AHRS being its own development stage in section 20 rather than a firmware feature.

**Static pressure does not move to the phone.** This is the one place the otherwise-clean simplification fails, and the reason is the same reason the plenum matters at all. A phone's pressure port vents into its own case, inside the cockpit, in the slipstream. On an open-cockpit aircraft the local pressure at that point varies with airspeed, so altitude shifts with throttle and vertical speed reports throttle position rather than climb. At PM-2 cruise the error is roughly 12 feet and it moves with speed.

The consequence is a rule rather than a preference: **the phone barometer is an altimeter backup and a cross-check, never the vertical speed source.**

**Airspeed does not move to the phone.** No phone has a pitot.

**The phone barometer is optional and detected at runtime.** Inexpensive Android tablets frequently ship without one, and cheap tablets are a stated target platform. Nothing may assume its presence.

### Node count

One node. A multi-engine aircraft gets one node with two sets of engine sensors, not two nodes. Wired sensors terminate at the node. A bus, when it arrives in v2, is only for what the node cannot reach: a panel annunciator, an ADS-B receiver, a gyroplane's rotor RPM, an autopilot.

---

## 7. Hardware, v1

No custom board. An off the shelf ESP32-S3 development board on a screw terminal breakout carrier provides mounting and solder points.

| Function | Part | Notes |
|---|---|---|
| Compute | ESP32-S3 DevKitC, PSRAM | USB-C, CC pulldowns, and regulator come free with the board |
| Carrier | Commercial screw terminal breakout | No custom PCB in v1 |
| Static pressure | BMP581 breakout | In a printed static plenum. Not optional, not replaceable by the phone |
| Airspeed | Sensirion SDP810-500Pa | Plus or minus 500 Pa, 0.1 Pa zero point accuracy, no zero drift. Dynamic pressure at PM-2 cruise is under 100 Pa |
| CHT / EGT | 4x MAX31855K breakout | 2 CHT, 2 EGT for the twin |
| Tach | 2x optocoupler, DIP | Capacitive pickup off each plug lead, counted on PCNT |
| Fuel | See section 9 | Pluggable channel |
| Storage | SD, on dev board or breakout | |
| Power | USB-C from a power bank | No onboard lithium cell |
| Brownout | Supercapacitor | Sized to complete the current log record and close the file |
| Local alert | Piezo buzzer | Survives loss of the phone, which also removes the audio path |
| Backup display | Reflective memory-in-pixel LCD, SPI | Not e-paper. See section 10 |

**Deleted in revision 2:** the u-blox MAX-M10S GNSS module and its antenna. The phone supplies position.

**Compute is specified by requirement, not part number.** The module must provide: two cores, PSRAM, Bluetooth Low Energy, a native CAN 2.0B controller, SD, and at least 20 usable GPIO. Wi-Fi is required for the on-demand AP mode but is not on the flight-critical path. The ESP32-S3 is v1's reference implementation, not a dependency.

**Bluetooth Classic is not required.** Revision 1 noted the ESP32-S31's Classic BR/EDR support as a reason to prefer it. Choosing BLE removes that reason. See section 14.

**Power:** node draws roughly 120 to 160 mA at 5V with BLE rather than Wi-Fi as the active radio. The phone draws far more. One bank powers both.

**Power sources considered and rejected:** ram air turbine, which produces nothing on the ground where the density altitude check and warm-up gate happen; and solar, which solves no problem because nothing needs to stay alive parked.

**Placement:** the node mounts on the engine cage near the cylinder heads. The link is wireless, so there is no reason to run heavy thermocouple extension wire forward. Use 24 AWG K-type extension wire, not copper, and not 20 AWG. Pneumatic tubing is light and runs to wherever the pitot and static sources go.

**EMI:** resistor plug caps, shielded enclosure, opto-isolated pulse inputs. Deleting the GNSS module removes the most EMI-sensitive receiver from the box, which is a secondary benefit of the architecture change.

**Weight target:** under 5 oz for the enclosed node, under 11 oz for the complete installation. Wire and plumbing outweigh electronics roughly two to one.

**Enclosure:** printed ASA, 1.5 mm walls, on grommet or wire rope isolators. No PLA anywhere. Nothing printed within a foot of a cylinder.

---

## 8. Channels

Channels are defined by requirement, not by part number, so a future builder can substitute. Every channel carries a source tag per design rule 8.

### Node channels

| Channel | Requirement | Rate |
|---|---|---|
| Static pressure | Absolute baro, aviation range, low noise, in a damped plenum | 25 Hz |
| Differential pressure | Bipolar, roughly plus or minus 500 Pa, better than 1 Pa zero stability | 25 Hz |
| Engine speed | Pulse input, isolated, 1 pulse per revolution, 0 to 10000 RPM | 5 Hz |
| Cylinder head temp | Type K thermocouple, cold junction compensated | 2 Hz |
| Exhaust gas temp | Type K thermocouple, cold junction compensated | 2 Hz |
| Outside air temp | Any, shielded from engine heat and direct sun | 1 Hz |
| Fuel quantity | Pluggable, see section 9 | 1 Hz |

### Phone channels

| Channel | Source | Notes |
|---|---|---|
| Position, ground speed, track | GNSS | Primary |
| Attitude, heading | OS sensor fusion | Advisory only. Never feeds a control loop |
| Pressure altitude, backup | Phone barometer | Optional. Absent on many cheap tablets |
| Time | OS | Also used to timestamp-align the two logs |

### Derived

Pressure altitude, density altitude, vertical speed, indicated airspeed, true airspeed, wind aloft, twin RPM sync, EGT split, endurance, engine hours.

**Vertical speed is derived from the node's plenum static only.** If the node's static channel fails, vertical speed is unavailable. It does not silently fall back to the phone barometer, because a vario fed by a cockpit pressure source reports throttle position and would be worse than an absent instrument.

---

## 9. Fuel quantity

Fuel is the highest risk channel and the one most likely to differ per aircraft. It is defined as a **channel with pluggable backends**, selected in the aircraft profile. Firmware sees a level, not a method.

| Backend | Verdict | Notes |
|---|---|---|
| Burn integration from RPM | **Required, always on** | Cross-checks every other method. Manual full-tank reset. Useful alone |
| External magnetic float | **Recommended for v1** | Float and magnet inside, Hall or magnetometer array outside. Zero penetration, zero electronics in the tank, indifferent to ethanol content |
| Load cell under tank | Good where the tank is a discrete unit on a mount | Gasoline is about 6 lb/gal. Does not work for wing tanks |
| Non-invasive ultrasonic | Worth testing | Clamps outside a plastic tank. Needs acoustic coupling. Vibration and foam are the risk |
| Capacitive, external plates | Fallback | Gasoline dielectric constant is about 2 against water's 80, so signal is weak, and it needs recalibration between fuel blends |

**Anything requiring a window, emitter, or wire inside a fuel tank is out of scope permanently.** That includes LiDAR, for two independent reasons: it puts a laser diode and driver in a vapor space that passes through the flammable range during cooling and refueling, and gasoline is largely transparent at those wavelengths so returns come off the tank bottom rather than the fuel surface.

---

## 10. Display and alerting

**Reference client:** Android native, open source, APK published on GitHub releases and F-Droid. No store dependency, no developer account, no expiry.

**iOS:** the protocol supports it because BLE is available to third-party iOS apps. No app exists in v1, and iOS is not on the critical path of a project meant to outlive its maintainer.

### Audio

Alerts play through the phone, out its speaker or its Bluetooth link. Most ultralight pilots already run a Bluetooth radio paired to their headset, so an alert on the phone reaches the ear without Junco carrying any audio hardware.

**Radio coexistence needs testing.** The phone must hold a BLE link to the node and an audio link to a headset at the same time, on the same 2.4 GHz radio. This is routine for phones but has not been verified in this combination. See section 15.

### Mounting

Dash mount or kneeboard, the owner's choice. Two consequences worth knowing rather than designing around:

- A phone in direct sun thermally throttles and eventually shuts down. Open cockpit airflow helps considerably more than a car dashboard does, so this needs testing rather than assumption.
- A cradle bolted to the airframe is installed equipment for Part 103 empty weight purposes. A kneeboard-strapped device removed after flight is more defensibly carry-on. The difference is ounces and only matters on a weight budget as tight as the Legal Eagle's.

### Backup annunciator

Losing the phone also removes the audio path, so the node carries its own minimal fallback.

**A piezo buzzer on the node is the more important half.** It costs under a dollar and covers the case that matters: an engine limit exceeded with nothing listening.

**The screen is secondary and is an annunciator, not a second display.** Engine temps, fuel remaining, altitude. Use a reflective memory-in-pixel LCD, which gets more readable as sunlight increases rather than washing out, and refreshes fast enough for live data.

**E-paper is excluded.** Standard panels are specified 0C to 50C, and a dark instrument in direct sun exceeds the top of that while a cold morning climb goes below the bottom. Wide-temperature variants that fix the range are marked indoor-use-only with no direct sunlight. Refresh is also wrong at 0.5 to 3 seconds full, with partial refresh accumulating ghosting.

### Stale and failed data

Failed data has **two different behaviors depending on the consumer**, and they must not be unified later during a cleanup.

**On the link and the bus:** stop publishing, or publish with the invalid flag set, immediately. Never hold. A subscriber flying a held stale airspeed is the failure this rule exists to prevent.

**On the display:**

1. Grey the field.
2. Hold the last known value, but **replace the numeral with dashes after 10 seconds.** A greyed box containing a plausible number still reads as live during a glance. Last value stays available on tap.
3. One audio alert on the disconnect. Never repeated.
4. If the channel returns and drops again, log every transition but stay silent. Intermittent faults from EMI or bad wiring get fixed on the ground, not narrated in the air.
5. One audio reminder at shutdown that a channel failed during the flight.
6. Post-flight summary names the channel and the transition count so it can be repaired.

**Loss of the whole BLE link is a distinct case** from loss of one channel. The phone still has position, attitude, and time, so it stays useful as a navigation display. It must say plainly that engine data is gone rather than showing a screen full of dashes and letting the pilot infer it.

### Alerts in v1

| Alert | Trigger |
|---|---|
| CHT over limit | Per-aircraft limit from profile |
| EGT rate of change | Rapid rise, seizure precursor on a two stroke |
| Fuel endurance | Below reserve set in profile |
| Channel failed | First disconnect only |
| Link lost | BLE disconnect |
| Density altitude | Pre-takeoff advisory against profile limit |

---

## 11. Aircraft profile

One file describes the aircraft completely. No firmware changes to support a new airframe. A web based configuration tool generates and validates it, and the file stays human readable and hand editable.

Contents:

- Identity: registration or vehicle ID, make, model, for logbook entries
- Powerplant: engine count, cylinders per engine, pulses per revolution, hour meter offsets
- Channel map: which backend supplies each channel, on which pin or address
- Calibration: pitot position error, baro offset, thermocouple offsets, fuel curve
- Limits: CHT, EGT, RPM, fuel reserve, density altitude advisory
- Fuel: capacity, usable, burn rate against RPM
- Units: every unit independently selectable. Feet or meters, knots or mph or km/h, Fahrenheit or Celsius, gallons or liters, inHg or hPa
- Reference: magnetic or true
- Logging: rate, retention, enable or disable
- Build class: self-built, kit-built, or factory-qualified

**The profile lives on the node**, not on the phone, so a borrowed phone or a replacement tablet inherits the correct configuration by connecting. The app reads it over BLE on connect and caches it against the profile hash.

---

## 12. Logging

There are now two recordings, and they are not the same.

**Node log, on the SD card.** Node channels only, at full rate. This is the authoritative engine and air data record, and it survives the phone being lost, broken, or out of battery.

**Phone log.** Everything, including position and attitude, plus the node channels as received. This is the copy that is usually not in the wreckage, and it is the one that feeds the logbook.

Neither is complete alone. The analysis tool merges them on timestamp, which means **the node and the phone must agree on time.** The phone sends its clock on connect; the node timestamps with a monotonic counter and records the offset. Never depend on the node having a real-time clock.

Requirements for the node log:

1. **Preallocate** the file to full size at engine start. FAT32 only updates length on close, so an interrupted flight otherwise yields a zero length file with all the data still on the card.
2. **Fixed size records, written sequentially**, each with a magic header, monotonic timestamp, and CRC. A destroyed filesystem must still be recoverable by scanning raw sectors for the magic. Publish the record format and a recovery tool alongside the firmware.
3. **Flush every second.** Not on close.
4. **Supercapacitor** sized to complete the record in flight and close the file.
5. **Self-describing format.** The file opens with format descriptor records declaring every message type and field layout it contains, the way ArduPilot dataflash logs do. A Junco log written in 2027 must be readable in 2040 by someone who has the file and nothing else. No external schema, no firmware version lookup table. This is the single most important requirement in this section for the longevity goal.
6. **Every record carries its channel's source tag**, per design rule 8. An altitude sample from the plenum and one from a phone barometer must never be ambiguous in the file.

Format: raw self-describing records on the card, with export to CSV and GPX.

---

## 13. Logbook

Junco proposes entries. It never files them.

Auto-derived: date, aircraft identity, engine start and stop, takeoff and landing times, departure and arrival points, route, distance, total time, landing count including touch and goes, and night landings computed from position and civil twilight.

Requires pilot input: PIC versus dual, instrument time, approaches, endorsements, remarks.

Output: export to ForeFlight CSV, LogTen, and MyFlightbook. Junco feeds logbooks. It is not a logbook.

The architecture change helps here. Position and time now come from the phone, which has them whether or not the node is connected, so the logbook still works on a flight where the engine link dropped.

---

## 14. Protocols

| Protocol | Direction | Status |
|---|---|---|
| Junco BLE GATT telemetry | Node to phone | **Required in v1. Separate specification document** |
| Junco log record format | On card and on phone | Required in v1. Published with recovery tool |
| Wi-Fi AP, on demand | Bidirectional | Required in v1 for log pull, config, and firmware only. Never in flight |
| GDL90 over UDP 4000 | Node to EFB | **Phase 2.** Arrives with ADS-B |
| DroneCAN engine and fuel extension | Bus | Separate specification document. Not implemented in v1 |

### Why BLE and not Bluetooth Classic

Classic SPP is what a cheap OBD adapter uses and it is the obvious model for this architecture. It is the wrong choice here.

**iOS does not permit third-party apps to open a Classic SPP channel without MFi certification.** That is why iPhone OBD apps require Wi-Fi or BLE adapters. Choosing SPP would lock Junco to Android at the protocol level rather than at the app level, which is a much more expensive kind of lock-in to undo later.

BLE is available to third-party apps on both platforms, carries telemetry comfortably at 25 Hz, and works on the plain ESP32-S3.

### What choosing BLE costs

**GDL90 to a third-party EFB.** GDL90 is UDP over Wi-Fi, and the node cannot usefully hold a BLE link and a Wi-Fi AP in flight on one 2.4 GHz radio. Revision 1 treated free display in ForeFlight and Avare as a major benefit. That is given up.

It costs less than it appears. The main thing GDL90 delivered was position into the EFB, and the phone now has its own position, so an EFB works normally alongside the Junco app. What GDL90 still uniquely delivers is ADS-B traffic and weather, and that arrives in phase 2 with the receiver, at which point the Wi-Fi path is worth turning on.

### BLE requirements

1. **One notify characteristic per rate class**, not one per channel. Grouping by rate keeps the notification count low and the packing efficient.
2. **Every sample carries a source tag and a validity flag.** Invalid is published as invalid, never as a held value.
3. **Connection interval targeted at 15 ms or better**, so 25 Hz air data arrives without aggregation delay.
4. **The profile is readable over BLE** so the app configures itself from the node.
5. **Publish-only for flight data.** The only writable characteristics are configuration and the clock, and neither influences a published value.
6. **Documented well enough to write a second client against**, because the Android app is a reference implementation and not the specification.

---

## 15. Open items resolved only by testing

These are assumptions until a phase closes them.

| Assumption | Resolved by | Risk if wrong |
|---|---|---|
| BLE link survives twin CDI ignition at the intended mount point | Phase 0 ground runs | Forces a wired link or a different mount |
| I2C survives the same environment | Phase 0 ground runs | Forces isolated or CAN topology in v1 |
| The phone holds BLE to the node and audio to a headset simultaneously | Phase 1 | Alerts fall back to the node's buzzer only |
| A printed static plenum gives usable vario data in prop blast | Phase 1 | Vertical speed becomes a throttle indicator |
| A dash-mounted phone does not thermally shut down in summer sun | Phase 1 | Kneeboard only, or a shaded mount |
| Phone attitude is stable enough on a vibrating airframe to be worth showing | Phase 1 | Drop the attitude display rather than show a bad one |
| Magnetic float fuel sensing survives vibration and slosh | Phase 3 | Fall back to burn integration only |
| A pitot can be placed usefully on a powered parachute | Phase 4 | Ship without airspeed, document why |

---

## 16. Phases

| Phase | Duration | Exit criteria |
|---|---|---|
| 0. EMI reality check | 2 weeks | Ground runs at all RPM with no bus lockups, resets, or BLE dropouts |
| 1. Minimum flyable node | 4 to 6 weeks | Flight showing valid altitude and climb rate from the plenum on the phone, with attitude and position from the phone |
| 2. Engine | 4 to 6 weeks | Two tach, two CHT, two EGT, SD logging, twin sync display |
| 3. Fuel | 4 to 8 weeks | A level reading that agrees with burn integration over three flights |
| 4. Airspeed | 2 to 4 weeks | Usable IAS, or a written explanation of why not |
| 5. Carrier board | 6 to 8 weeks | Two additional units built |
| 6. Publish | spring 2027 | Repo, docs, rationale, BLE and log specs, OSHWA, Zenodo, five kits shipped |
| 7. AirVenture 2027 | July 2027 | Flying unit, a season of logs, three builds that are not his |

Phase 0 gains a test. BLE link stability under twin CDI ignition is now flight-relevant in a way an I2C bus alone was not, because the link carries every value the pilot sees.

---

## 17. Licensing and stewardship

| Artifact | License |
|---|---|
| Firmware | MIT or Apache 2.0 |
| Android app | MIT or Apache 2.0 |
| Board files, STLs | CERN-OHL-P-2.0 |
| Documentation and specs | CC-BY-4.0 |

Stewardship requirements, driven by the goal of outliving the maintainer:

- GitHub organization with at least two owners, not a personal account
- Mirror to a second forge
- Documentation as markdown in the repo, not on a hosted site requiring renewal
- Tagged releases archived to Zenodo for a permanent DOI
- OSHWA certification. Free, self certified, and registry entries are permanent because users may still rely on them to reach documentation
- MAINTAINERS file naming a successor and a handoff trigger
- Donations through a fiscal host rather than a personal account

---

## 18. Success criteria for v1

1. It flies on the PM-2 for a full season without a failure that grounds the aircraft.
2. Three people who are not Allen have built one from the published documentation.
3. The log format has been read back by someone using only the published spec and recovery tool.
4. A second BLE client has been written against the published protocol by someone who did not read the Android app source.
5. Every log file identifies its build class, hardware revision, and calibration date, so a v1 self-build is distinguishable from a later qualified unit without any external record.
6. Node and phone logs merge on timestamp without manual alignment.

---

## 19. Decisions and rationale

Successors break what they do not understand the reason for. Every rejection below was considered seriously and rejected for a specific reason.

| Considered | Rejected because |
|---|---|
| Fork XCVario or GNUVario | Firmware is coupled to their dedicated hardware, their differential pressure parts are kilopascal-class against our sub-100 Pa dynamic pressure, and no board has thermocouple or isolated pulse inputs. Reuse their protocols, not their codebase |
| Build on ArduPilot | GPL-3.0 rewrites the licensing plan, the parameter surface runs to hundreds of entries, it is architected for control rather than instrumentation, and the community is uneasy about manned use. Steal the parameter model and the self-describing log format instead |
| PWA as the primary client | Cannot bind a socket to a specific network, and cannot reach BLE on iOS at all. Native is required by the transport, not by preference |
| Bluetooth Classic SPP | iOS blocks it for third-party apps without MFi. Locks the protocol to Android, not just the app |
| Wi-Fi as the in-flight link | Joining the node's AP costs the phone its cellular data, and the node cannot usefully run AP and BLE together in flight |
| Phone barometer as the vario source | Its port vents into the phone case in the slipstream, so vertical speed would report throttle position |
| Phone barometer as a required channel | Many inexpensive Android tablets have none, and cheap tablets are a target platform |
| Keeping GNSS on the node | The phone's receiver is better, free, and does not need an antenna location on a powered parachute |
| Phone attitude feeding a control loop | OS fusion is tuned for handheld use, drifts in sustained turns, and its magnetometer reference is unusable near ignition and steel |
| LiDAR inside the fuel tank | Ignition source in a vapor space, and gasoline is largely transparent so returns come off the tank bottom |
| Capacitive fuel sensing as primary | Gasoline's dielectric constant is about 2 against water's 80, so signal is weak, and it needs recalibration between fuel blends |
| E-paper backup display | Specified 0C to 50C, and wide-temperature variants are marked indoor-use-only with no direct sunlight. Refresh is 0.5 to 3 seconds |
| Ram air turbine | Produces nothing on the ground, where the density altitude check and warm-up gate happen |
| Solar panel | Nothing needs to stay alive while parked |
| Onboard lithium cell | A cell in a vibrating enclosure next to gasoline, to replace a USB-C input from a bank the phone requires anyway |
| Hard-specifying the compute module | The ESP32-S31 shipped two months after the S3 was selected. Specify by requirement, name a reference implementation |
| Unified stale-data handling | Holding the last value is correct for a display and dangerous on a link. Two consumers, two behaviors, deliberately |

---

## 20. Product roadmap beyond v1

v1 is a DIY kit. It is not the end state. The architecture is chosen so later stages do not require redesign.

| Stage | Form | Who builds it |
|---|---|---|
| v1 | Breadboard node, phone as hub over BLE, published files, kits at cost | Allen, plus builders reproducing from documentation |
| v2 | Custom carrier board, DroneCAN bus, separate annunciator and sensor nodes, ADS-B receive, GDL90 restored over Wi-Fi | Allen, plus anyone selling assembled units |
| v3 | Boxed product. Assembled, calibrated, warrantied, harness included | A production partner |
| v4 | Autopilot node subscribing to the Junco bus | A production partner with a test program |

**Why the sequence is ordered this way.** Each stage removes a dependency on one person. Kits depend on documentation quality. A boxed product depends on manufacturing and support capacity, which is why it goes to a partner. An actuating product depends on a test program and product liability insurance, neither of which a hobby project can supply.

**What stands between v2 and an autopilot.** Junco has no attitude solution of its own, and the phone's is not one. A control loop needs reliable AHRS, and getting usable attitude off an IMU bolted to a two-stroke airframe is a real project: vibration isolation, filter design, and validation against a truth source. Assume AHRS is a full stage, not a checkbox on the autopilot stage. The revision 2 architecture makes this clearer rather than closer, because borrowing the phone's attitude for display deliberately does not produce an attitude source anything can be flown by.

**What does not change across stages.** The BLE protocol, the log format, the configuration schema, and the licensing. Those are what let a partner take over production without the project forking.

---

## 21. End state: one box, and what certified means

### Form factor

The target product is a single small enclosure that bolts to the frame, is calibrated at build, and is self-sufficient for a typical single-engine ultralight.

**Inside the box:** compute, BLE radio, static pressure, differential pressure, thermocouple front ends, isolated pulse inputs, SD, and all connectors.

**Wired to the box, not nodes:** thermocouples, tach pickups, fuel sender, pitot and static tubing.

**Actual bus nodes are for what the box cannot reach or does not do:** the panel annunciator, an ADS-B receiver, a gyroplane's rotor RPM, an autopilot.

**Supplied by the pilot's phone, and never duplicated in the box:** position, attitude, time, display, audio, and connectivity. This is the largest cost reduction available and it is why revision 2 exists.

### Certification ladder

"Certified" has four possible meanings here, separated by orders of magnitude in cost. Pick deliberately.

| Rung | What it means | When it applies |
|---|---|---|
| Nothing | No requirement at all | Part 103 and experimental amateur-built. The entire v1 and v2 market |
| Environmental qualification | DO-160 style testing for temperature, altitude, vibration, humidity, and EMI, self-declared | The meaningful milestone. Real engineering credibility, and what a production partner will ask for |
| ASTM consensus standard | Compliance with the applicable LSA equipment standard | Only if an S-LSA manufacturer wants factory installation. Pursue on demand |
| TSO | Full FAA technical standard order, DO-178C software, DO-254 hardware | Certified aircraft. Not this market. Naming it as a goal is how projects like this die |

**Target the second rung.**

### Two risk profiles, one name

Once a tested manufactured box and a self-built kit both exist, they carry very different assurance and the name sits on both. Mark them distinctly in hardware and in firmware identification, per design rule 7.

A builder-assumes-risk notice works reasonably against the builder. It does not bind third parties who never agreed to it, and it does not answer a design defect claim, because a defective design is defective regardless of who assembled it.

---

## 22. Revision history

### Revision 2, August 2026: phone as hub

**What changed.** The phone stopped being a display and became half the instrument system. Position, attitude, and time move to it. The link moved from Wi-Fi to Bluetooth Low Energy. The node lost its GNSS module and gained a source-tagging requirement.

**Why.** The node was duplicating hardware the pilot already carries, at worse quality, with a harder antenna placement problem, on a Wi-Fi link that cost the phone its cellular data.

**What it cost.** GDL90 output to third-party EFBs, which drops to phase 2. The Junco app becomes the only display in v1 rather than one of several. That is a real reduction in fallback paths, and it raises the stakes on BLE link reliability, which is why phase 0 gained a test for it.

**What it did not change.** Static pressure, differential pressure, and every engine channel stay on the node. The phone cannot measure any of them from inside its own case. The temptation this architecture creates is to keep going and let the phone barometer drive the vario, and design rule 8 and section 8 exist specifically to stop that.

**Superseded advice worth recording.** Revision 1 recommended a u-blox MAX-M10S, treated GDL90 as a primary benefit, and named the ESP32-S31's Bluetooth Classic support as a reason to prefer that part. None of the three survives revision 2.
