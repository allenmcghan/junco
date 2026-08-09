# Junco v1 Product Requirements

**Open engine and air data node for Part 103 and experimental aircraft**

Status: Draft, revision 5
Target aircraft: ParaPlane PM-2 (twin engine powered parachute)
Target publish: AirVenture 2027

Revision 2 moved position and attitude sensing onto the pilot's phone, moved the link to Bluetooth Low Energy, and reduced the node to engine and air data only.

Revision 3 adds traffic as a pluggable app-side channel supplied by hardware the pilot already owns, and opens the compute platform to a Linux single-board variant.

Revision 4 relicenses to copyleft, drops the commercial roadmap, and positions Junco as the engine and air data front end for the MakerPlane stack rather than a parallel instrument system.

Revision 5 closes the open specification questions, adds design rule 9, and moves the remaining ones into `docs/open-questions.md`. Section 25 records what changed and why.

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
9. **Advisory-only data never raises an alert.** A channel whose coverage or latency cannot be relied on may be displayed, marked as what it is, but may not drive audio, the annunciator, or any advisory. Internet-sourced traffic is the case this rule was written for, and section 22 explains why that data looks authoritative and is not. New in revision 5.

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
- **A Junco-built ADS-B receiver.** Junco does not demodulate ADS-B and is not planned to. Displaying traffic from a receiver the pilot already owns is in scope as an optional channel. See section 22
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

**A Linux single-board variant is a supported second build**, not a fork. It changes what the node can do and what the enclosure has to do. Section 23 records the full trade and the requirements a Pi-class build must meet.

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

**Panel display:** pyEFIS, reached through a FIX-Gateway plugin, for builds that have a panel and a Pi. See section 24. The Android app stays the reference client and the only one required in v1, because the primary aircraft has no panel.

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

**The profile describes the aircraft and nothing else.** Configuration that describes the pilot's own equipment stays app-side, on the phone. Traffic backend selection in section 22 is the current example: it is a property of what is in the flight bag, it changes without the aircraft changing, and the node is not in that data path. Putting it in the profile would make the node authoritative over something it cannot see.

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
| GDL90 over UDP 4000, outbound | Node to EFB | **Phase 2.** Junco publishing its own channels to a third-party EFB |
| GDL90 over UDP 4000, inbound | Receiver to phone | **Optional channel.** Traffic and weather from a receiver the pilot owns. See section 22 |
| DroneCAN engine and fuel extension | Bus | Separate specification document. Not implemented in v1 |

### Why BLE and not Bluetooth Classic

Classic SPP is what a cheap OBD adapter uses and it is the obvious model for this architecture. It is the wrong choice here.

**iOS does not permit third-party apps to open a Classic SPP channel without MFi certification.** That is why iPhone OBD apps require Wi-Fi or BLE adapters. Choosing SPP would lock Junco to Android at the protocol level rather than at the app level, which is a much more expensive kind of lock-in to undo later.

BLE is available to third-party apps on both platforms, carries telemetry comfortably at 25 Hz, and works on the plain ESP32-S3.

### What choosing BLE costs

**GDL90 to a third-party EFB.** GDL90 is UDP over Wi-Fi, and the node cannot usefully hold a BLE link and a Wi-Fi AP in flight on one 2.4 GHz radio. Revision 1 treated free display in ForeFlight and Avare as a major benefit. That is given up.

It costs less than it appears. The main thing GDL90 delivered was position into the EFB, and the phone now has its own position, so an EFB works normally alongside the Junco app. What GDL90 still uniquely delivers outbound is Junco's own channels reaching a third-party display, and that stays in phase 2.

### Consuming GDL90 is not the same as emitting it

These are two different features that share a format, and conflating them is what kept traffic looking expensive.

**Emitting** GDL90 requires the node to run a Wi-Fi AP in flight, which it cannot usefully do while holding BLE. That is the phase 2 problem described above.

**Consuming** GDL90 requires nothing of the node at all. The receiver is the pilot's, the transport is the receiver's, and the listener is a UDP socket in the app. The node is not in the path, is not aware of it, and cannot be affected by it. Design rule 1 is preserved without any argument, because there is nothing to argue about.

That asymmetry is why traffic display does not have to wait for phase 2 and does not have to wait for a Junco receiver that is never going to be built.

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
| A ram-air-cooled enclosure holds a Pi-class board inside its range on an engine cage | Phase 0, plus a summer season | Pi build restricted to a cockpit mount, or dropped |
| Ground idle on a hot day does not heat-soak the enclosure before takeoff | Phase 0 ground runs | Thermal mass, a shroud, or a documented warm-up limit |
| A cooling inlet near the pitot does not couple into the static plenum | Phase 1 | Altitude and vertical speed corrupted by cooling airflow |
| The phone holds BLE to the node, USB OTG to an SDR, and audio to a headset at once | Traffic work | Traffic falls back to a separate receiver over Wi-Fi |

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

Phase 0 gains thermal instrumentation as well. If the Pi-class build is going to be viable on an engine cage, the enclosure temperature during ground runs and after a hot shutdown is the measurement that decides it, and it costs one logged channel to collect while the EMI runs are happening anyway.

**Traffic is not a phase.** It is an optional app-side channel that can be built whenever someone wants it, because it blocks on nothing in this table and touches no node hardware. It should not be allowed to displace phases 1 through 4, which are the ones that produce an instrument.

---

## 17. Licensing and stewardship

| Artifact | License |
|---|---|
| Firmware | GPL-2.0-or-later |
| Android app | GPL-2.0-or-later |
| Board files, STLs | CERN-OHL-S-2.0 |
| Documentation and specs | CC-BY-4.0 |

Code and hardware are copyleft. Specifications are not, deliberately: they are meant to be implemented by anyone in anything, and a protocol that cannot be adopted freely does not outlive its implementation.

GPL v2 **or later** matches MakerPlane, so code moves in both directions between Junco and FIX-Gateway or pyEFIS without relicensing. See section 24.

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
| Build v1 on the ArduPilot flight stack | The parameter surface runs to hundreds of entries, it is architected for control rather than instrumentation, and the community is uneasy about manned use. Steal the parameter model and the self-describing log format instead. Note this rejects the flight stack, which is not the same artifact as the row below |
| Build v1 on ArduPilot AP_Periph | AP_Periph defeats half of the objection above, being a genuinely publish-only DroneCAN sensor node, and it is a real candidate for the v2 bus stage. It fails v1 on four other grounds: no BLE at all, STM32 only so neither of our compute paths qualifies, no thermocouple or ignition-pulse tach support, and its EFI backends talk to an ECU over serial, which a two-stroke on CDI does not have |
| Rebuilding what MakerPlane already has | FIX-Gateway already brokers avionics data from arbitrary sources, pyEFIS already displays it, and plugins already exist for ADS-B, recording, annunciation, and multi-source voting. Junco writes the two-stroke engine front end nobody has and plugs into the rest. See section 24 |
| Absorbing Junco into MakerPlane entirely | The engine and air data work needs its own hardware, specs, and test program, and a Part 103 powered parachute is a narrow enough target that it would be a poor fit for a general E-AB project's roadmap. Stay separate, contribute the plugin upstream |
| CAN-FIX as a v1 requirement | v1 has no bus and no second node. CAN-FIX becomes the leading v2 candidate over DroneCAN, because its consumers are experimental aircraft panels rather than autopilots, and its specification is Creative Commons so implementing it costs nothing legally |
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
| Decoding ADS-B on the ESP32-S3 node | Its USB OTG is full speed, 12 Mbps. An RTL-SDR at 2.4 MSPS is roughly 38 Mbps of raw I/Q, and practical full-speed bulk throughput is nearer 8 Mbps. The bus is short by a factor of four before any demodulation, and a 240 MHz Xtensa could not demodulate it anyway |
| Building a Junco ADS-B receiver | A Pi-class board and a dongle is Stratux, which already exists, is open, is documented, and costs about $50. Rebuilding it spends the budget twice and inherits a maintenance burden someone else is already carrying |
| ForeFlight Sentry as a supported receiver | It does not emit GDL90 to third-party apps and is iOS only. A supported receiver has to speak an open protocol, which is the same standard we hold ourselves to |
| Internet-sourced traffic as an alerting source | Crowdsourced ground receivers are line of sight and thin below 1000 to 2000 ft AGL, which is exactly where this aircraft lives, and 5 to 15 seconds of latency displaces a target by roughly a third of a mile |
| Rejecting a Linux single-board node on its 0 to 50C rating | That is an enclosure and airflow problem, on an aircraft already routing a pitot line to the same location. Solve it with insulation, self-heating, and ram air rather than with a different processor. See section 23 |

---

## 20. Roadmap beyond v1

**This project is not building a product line.** Its goal is to put a working, documented, reproducible engine and air data node into the world under a license that keeps it there. Revenue is not an objective and no stage below is a business plan.

| Stage | Form | Who |
|---|---|---|
| v1 | Breadboard node, phone as hub over BLE, published files, kits at cost | This project |
| v2 | Custom carrier board, CAN bus, FIX-Gateway plugin upstreamed, separate annunciator node | This project. The intended end point |
| v3 | Boxed product. Assembled, calibrated, warrantied, harness included | Anyone who wants it. Not pursued here |
| v4 | Autopilot node subscribing to the Junco bus | Anyone with a test program. Not pursued here |

**Why the project stops at v2.** A boxed product depends on manufacturing and support capacity. An actuating product depends on a test program and product liability insurance. Neither is something this project intends to acquire, and pretending otherwise is how a volunteer project takes on obligations it cannot meet.

**Why v3 and v4 are still described.** The architecture should not foreclose them, and someone will eventually want them, so recording what they require is more useful than pretending they do not exist. Copyleft means anyone who takes those stages passes the result on under the same terms, which is the outcome this project wants from them anyway.

**What stands between v2 and an autopilot.** Junco has no attitude solution of its own, and the phone's is not one. A control loop needs reliable AHRS, and getting usable attitude off an IMU bolted to a two-stroke airframe is a real project: vibration isolation, filter design, and validation against a truth source. Assume AHRS is a full stage, not a checkbox on the autopilot stage. The revision 2 architecture makes this clearer rather than closer, because borrowing the phone's attitude for display deliberately does not produce an attitude source anything can be flown by.

**What does not change across stages.** The BLE protocol, the log format, the configuration schema, and the licensing. Those are what let someone else take on a later stage without the project forking.

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
| Environmental qualification | DO-160 style testing for temperature, altitude, vibration, humidity, and EMI, self-declared | The meaningful milestone. Real engineering credibility, and the first thing anyone taking this to a product will be asked for |
| ASTM consensus standard | Compliance with the applicable LSA equipment standard | Only if an S-LSA manufacturer wants factory installation. Pursue on demand |
| TSO | Full FAA technical standard order, DO-178C software, DO-254 hardware | Certified aircraft. Not this market. Naming it as a goal is how projects like this die |

**Target the second rung**, and treat it as an engineering standard to build against rather than a credential to obtain. This project is unlikely to fund a full environmental campaign, but designing as though one were coming is what makes the difference between a node that survives a season and one that does not. It also leaves the work in a state where someone pursuing v3 starts from a real design rather than a rewrite.

### Two risk profiles, one name

Once a tested manufactured box and a self-built kit both exist, they carry very different assurance and the name sits on both. Mark them distinctly in hardware and in firmware identification, per design rule 7.

A builder-assumes-risk notice works reasonably against the builder. It does not bind third parties who never agreed to it, and it does not answer a design defect claim, because a defective design is defective regardless of who assembled it.

---

## 22. Traffic and ADS-B In

Traffic is defined the way fuel is defined in section 9: **a channel with pluggable backends**. The app sees targets. It does not see a method.

Unlike fuel, the selection is **app-side configuration and not part of the aircraft profile**, per section 11. A receiver lives in the flight bag rather than on the airframe, and the node cannot see it.

**The node is never in the path.** Every backend below terminates at the phone. The node does not receive, decode, relay, or know about traffic. This is not a restriction that had to be negotiated, it is a consequence of the receiver being someone else's hardware, and it means design rule 1 holds without needing to be defended.

### Backends

| Backend | Pilot cost | Transport | Notes |
|---|---|---|---|
| USB SDR on the phone | $30 to $40 per band | USB OTG | Android only, permanently. Needs a powered OTG hub and a real antenna |
| Portable receiver | $210 to $850 | GDL90 over Wi-Fi | Preserves a future iOS path. Stratux is the reference |
| Internet feed | Free | Cellular | Advisory layer only. Never alerts |
| OGN and FLARM | Free | Cellular | Only worth enabling near glider operations |

**1090 ES and 978 UAT are separate radios.** Dual band means two dongles or a receiver that does both. In the United States, FIS-B weather and TIS-B traffic are carried on 978 only, so a 1090-only build gets direct traffic and nothing else.

**ForeFlight Sentry is excluded** and the exclusion should be stated plainly in the documentation, because it is the most commonly recommended portable and it does not emit GDL90 to third-party apps.

### Two rules

1. **Every target carries its source tag**, per design rule 8. A target decoded from a local receiver and a target pulled from an internet feed are not the same kind of object and must never render identically.
2. **Internet-sourced traffic never generates an alert**, per design rule 9. It is a map layer. It may not drive audio, may not drive the annunciator, and may not be the basis of any advisory. This was a local rule in revision 3 and was promoted in revision 5, because it generalises: any source whose coverage cannot be relied on is subject to it.

### What ADS-B In does not show you

This belongs in the requirements rather than in a footnote, because the failure mode is a pilot trusting a screen.

**Part 103 aircraft are not required to carry ADS-B Out, and most carry none.** The traffic most likely to conflict with a powered parachute at 800 feet is other ultralights, gliders, banner tows, and ag aircraft, which is precisely the traffic least likely to appear on the display.

**TIS-B is conditional.** It uplinks radar-derived traffic, including aircraft with no ADS-B Out, but only inside a service volume triggered by a properly equipped ADS-B Out aircraft. An aircraft without Out does not trigger its own. You receive it when someone equipped happens to be nearby, and not otherwise. Radar coverage at 500 to 1500 feet AGL is thin regardless.

**Internet feeds have a coverage floor.** These networks are crowdsourced ground receivers operating line of sight. Below roughly 1000 to 2000 feet AGL in rural areas there is no coverage at all. Latency of 5 to 15 seconds displaces a target by roughly a third of a mile at closure speeds that matter.

The consequence is a display requirement: **a traffic screen must not imply completeness.** A screen showing two airliners overhead and nothing else reads as an empty sky, and the sky is not empty. Traffic display is a supplement to looking outside, and the interface has to carry that rather than assume it.

### Weather is the better use of the internet path

`aviationweather.gov` publishes METAR and TAF as JSON, free, without a key. It is low rate, tolerant of latency, has no coverage floor, and creates no false confidence about collision risk.

It also improves a feature that already exists. The density altitude advisory in section 10 currently compares against a profile limit. A real altimeter setting and temperature turn that from an estimate into a number.

If effort goes to exactly one internet feed, it goes here and not to traffic.

### What Junco implements

**One GDL90 listener. Not a demodulator.**

For a build that already runs FIX-Gateway, none of this is Junco's work at all: a Stratux ADS-B plugin already exists there. This section applies to the phone-only case, which is the primary one.

GDL90 is the common interface. A single UDP listener serves the Wi-Fi receivers and any local application that emits the format, which means Junco never owns demodulation code, never owns a driver, and never inherits the maintenance burden of either. The SDR-on-the-phone path is then a documented configuration a builder wires up, not a component we ship.

Check the dump1090 and dump978 licenses before bundling anything. The copyleft move in section 17 makes this easier rather than harder: a permissive upstream absorbs cleanly, and a GPLv3-only upstream would force the combined work to v3, which "or later" already permits.

---

## 23. Compute platform

Section 7 specifies compute by requirement rather than part number. This section records the trade behind that requirement, because the choice looks obvious in both directions depending on which constraint is examined first.

### Two reference builds

| | ESP32-S3 build | Pi-class build |
|---|---|---|
| Mount | Engine cage | Engine cage or cockpit |
| Boot | ~300 ms | 20 to 40 s |
| Draw at 5V | 120 to 160 mA | 100 mA idle, several times that under load |
| Temperature rating | −40 to +85C | 0 to +50C, commercial |
| Boot medium | Soldered flash | microSD |
| Power loss | Close the file. No OS to corrupt | Orderly stop, or a read-only root |
| ADS-B, GDL90 out | Neither, ever | Both, natively |

### What the Pi buys

**One box instead of two.** A Pi-class board and a dongle is Stratux. A Pi-based node therefore does engine, air data, ADS-B In on both bands, FIS-B weather, GDL90 out, and the on-demand configuration AP in a single enclosure. It collapses section 22's optional receiver and section 14's phase 2 GDL90 output into the node itself.

**Development and longevity.** Linux and plain C or Python, no cross-compile, no pinned toolchain. For a project whose stated goal is being buildable in 2040, that ages better than a specific ESP-IDF release. Production is committed through at least January 2030.

**The real-time objection is weak and should not be repeated.** This workload peaks at 25 Hz on the pressure channels, and a tachometer at 10,000 RPM with one pulse per revolution is 167 Hz. Linux handles that comfortably. The ESP32's hardware pulse counters are cleaner, not necessary.

### Temperature is an enclosure problem

The 0 to 50C commercial rating is not a reason to reject the board. The aircraft already routes a pitot line to the node's location, so a ram air source is available at the same place, and the cold end is insulation plus a board that dissipates one to two watts into a small volume.

Requirements that follow, for a Pi-class build:

1. **Cooling is ducted ram air.** The inlet, the duct, and the outlet are enclosure design, not an afterthought.
2. **The cooling path must not couple into the static plenum or disturb the pitot.** A cooling inlet is a pressure source. The rule in section 6 that keeps the phone barometer out of the vertical speed calculation exists because a pressure source that varies with airspeed makes a vario report throttle position, and a badly placed cooling duct reintroduces exactly that failure a foot from where it was designed out.
3. **Ground idle is the sizing case, not cruise.** Ram air produces nothing on the ground, which is the same reason section 19 rejects the ram air turbine. The enclosure needs enough thermal mass to survive a hot-day taxi and runup, or the profile needs a documented temperature gate before takeoff.
4. **Cold start is out of spec at t=0**, before self-heating. An insulated enclosure holds the board well above ambient within minutes but not at power-on. Either accept and publish a warm-up interval, or add a resistive heater.
5. **A vented enclosure is not a shielded enclosure.** Section 7 requires shielding against CDI ignition. A ducted inlet needs screening or a labyrinth, and it will breathe moisture. Conformal coat the board.

### What temperature does not solve

Two distinctions survive the thermal work and are requirements on any Pi-class build rather than arguments against it:

1. **The boot medium is the computer.** On the ESP32, firmware lives in soldered flash and the SD card carries only the log, so a card failure costs data and the instrument keeps running. On a Pi the card is the system, and a vibration-induced failure on a two-stroke airframe is a dead instrument in flight. Mitigation is mandatory: **read-only root with a RAM overlay, and the log on a separate card from the boot medium.**
2. **An unclean stop can corrupt the root filesystem, not just the log.** Section 12 sizes a supercapacitor to close a file. A Pi-class build needs it sized for an orderly stop at that board's actual draw, which is several times the ESP32's. A read-only root reduces this from a bricking risk to a lost record, which is why requirement 1 is not optional.

Boot time is the visible consequence: 20 to 40 seconds against 300 milliseconds. Publish it, and make sure a mid-flight brownout reboot cannot be mistaken for a working instrument during the interval when it is not one.

### What does not change

Both builds meet the same channel requirements in section 8, write the same self-describing log format in section 12, expose the same BLE protocol in section 14, and load the same aircraft profile in section 11. A log file does not record which processor produced it beyond the hardware revision required by design rule 7, and no consumer needs to care.

---

## 24. Interoperability with MakerPlane

MakerPlane is the closest existing project to Junco's problem, and it is a better neighbour than a competitor. It is built for experimental aviation rather than adapted from drones, and it is alive.

| Component | What it is | License |
|---|---|---|
| CAN-FIX | CANbus protocol designed for experimental aviation | Creative Commons |
| FIX-Gateway | Plugin-based avionics data broker, Python | GPL-2.0-or-later |
| pyEFIS | EFIS display, Python, runs on a Raspberry Pi | GPL-2.0-or-later |

### The decision

**Junco stays a separate project and contributes a plugin.** It keeps its own repository, specifications, hardware, and BLE protocol, and publishes into FIX-Gateway through a plugin offered upstream.

Reasons, in order of weight:

1. The engine and air data work needs its own hardware, its own test program, and its own specifications. None of that belongs inside a general E-AB avionics project.
2. A Part 103 powered parachute with a twin two-stroke is a narrow target and a poor fit for somebody else's roadmap.
3. It is reversible. A plugin that proves valuable can be pushed further upstream later. A dissolved project cannot be reconstituted.

### The integration

```
   Junco node ---- BLE ----> Junco Android app          in flight, no panel
        |
        +--------- BLE ----> FIX-Gateway plugin ----> pyEFIS     panel, Pi build
                                    |
                                    +----> every other FIX-Gateway plugin
```

The plugin is small. FIX-Gateway is explicitly protocol-agnostic and brokers arbitrary sources into a single parameter namespace, so a Junco source is the exact shape it expects.

### What this removes from Junco's scope

Several things this document specifies as Junco work already exist in FIX-Gateway and should be consumed rather than rebuilt.

| Specified here | Already exists |
|---|---|
| Section 22 traffic display | Stratux ADS-B plugin |
| Section 12 second recording | Data recorder and playback plugin |
| Section 10 annunciation | Annunciation plugin |
| Section 10 panel display | pyEFIS |
| Design rule 8 disagreeing sources | Multi-source voting plugin |
| Pi-class baro and IMU | Raspberry Pi sensor plugins |

**This does not delete the Junco app.** A Part 103 aircraft with no panel and no Pi is still the primary case, and the phone-as-hub architecture in section 6 stands unchanged. What it means is that the app becomes one client rather than the only one, which restores fallback paths revision 2 removed.

### What stays Junco's

Nothing in that stack reads a two-stroke with CDI ignition and no ECU. The engine plugins that exist are Grand Rapids EIS and MegaSquirt, and both assume an engine with a computer in it. A Part 103 aircraft does not have one.

- Four thermocouples, cold junction compensated
- Two opto-isolated ignition-pulse tachometer channels
- Sub-100 Pa differential pressure, where the glider projects are kilopascal-class
- A static plenum that works in prop blast
- The fuel backends in section 9
- The aircraft profile, the log format, and the BLE protocol

That list is narrower than what this document described before, and it is the part nobody else has done.

### CAN-FIX and the v2 bus

`spec/dronecan-engine-extension.md` picks DroneCAN. That choice should be re-made rather than inherited.

DroneCAN's consumers are autopilots, which is stage v4 and not pursued here. CAN-FIX's consumers are experimental aircraft panels, which is what this aircraft has. The spec's own argument, that custom types mean somebody has to write a driver and therefore nobody will, points at whichever bus the target community already runs.

CAN-FIX is also Creative Commons, so implementing it carries no licensing consequence, unlike consuming a GPL implementation of it.

Not decided in v1, which has no bus and no second node. Recorded so v2 decides it deliberately.

### One honest caveat about design rule 1

A Pi-class build per section 23 could run the node firmware, FIX-Gateway, and pyEFIS in one enclosure. The node function still publishes and the display still subscribes, so nothing influences a published value and design rule 1 holds in substance.

But the boundary becomes a software boundary rather than a physical one, and software boundaries are weaker. If that build is pursued, the node process stays separable and independently testable, and imports nothing from the display side.

---

## 25. Revision history

### Revision 5, August 2026: closing the open questions

**What changed.** Fifteen specification questions that had been sitting in "not yet specified" lists were decided. Design rule 9 was added. The remaining open items were consolidated into `docs/open-questions.md` instead of being scattered across five files.

**Why now.** They were blocking firmware, and none of them needed data that flying would produce. A question that can be answered at a desk and is instead left open becomes a decision someone makes accidentally while implementing.

**The three that were irreversible** got decided first and deliberately: the BLE UUID base is generated and frozen, the log is a preallocated file on FAT32 rather than a raw partition, and the profile hash is taken over the stored bytes rather than a re-serialization. Each of those costs field hardware to change later.

**Design rule 9, advisory-only data never raises an alert.** This was a local rule inside section 22 in revision 3. It was promoted because it generalises past traffic: any source whose coverage or latency cannot be relied on is subject to it, and a rule that only exists inside one section gets forgotten by the next section that needs it.

**One decision worth calling out.** Log record payloads are now byte-identical to the BLE characteristic payloads, with the log adding only magic, type, and CRC. The node serializes each sample once rather than twice, which removes an entire category of defect where the link and the card disagree about what a flight contained.

**What is deliberately still open.** The measurements in section 15, which need the aircraft. The bus choice between DroneCAN and CAN-FIX, which v1 does not have a bus for. CSV and GPX export, which is a tools concern that cannot cost hardware. And `ESP32-S31`, which appears three times in this document and refers to no Espressif part that exists.

### Revision 4, August 2026: copyleft, and a neighbour instead of a competitor

**What changed.** Code moved to GPL-2.0-or-later and hardware to CERN-OHL-S-2.0. Specifications stayed CC-BY. The commercial roadmap in section 20 stopped being the project's plan and became a description of what others may do. A new section 24 positions Junco as the engine and air data front end for the MakerPlane stack.

**Why the license.** The project's purpose is to put this capability into the world permanently. A permissive license lets a better funded fork take the work closed and outrun the original, and copyleft prevents that at no cost to any use this project cares about. GPL v2 or later specifically, because it matches MakerPlane and lets code move both ways without relicensing.

**Why the specifications stayed permissive.** They are meant to be implemented by anyone in anything. A protocol nobody may adopt freely does not outlive its implementation, which is the whole reason `spec/` exists. CAN-FIX is Creative Commons for the same reason.

**What it cost.** Very little that this project wanted. GPL still permits building, selling, forking, and competing. What it forecloses is a closed derivative, and section 20 no longer has a stage that depends on offering one.

**What got smaller, usefully.** Section 24's scope table removes six items from Junco's work because FIX-Gateway already has them. What remains is the two-stroke engine front end nobody has built, which is a sharper description of the project than any previous revision managed.

**What is still open.** Whether the v2 bus is DroneCAN or CAN-FIX. Revision 4 records the argument and explicitly does not decide it, because v1 has no bus.

### Revision 3, August 2026: traffic without a receiver, and a second compute path

**What changed.** Traffic became a pluggable app-side channel with the node explicitly outside the path. The non-goal in section 4 was re-scoped from "ADS-B receive" to "a Junco-built ADS-B receiver," which is a narrower and more honest statement of the same position. A Linux single-board variant was admitted as a supported second build rather than a fork.

**Why.** Two findings. First, consuming GDL90 costs the node nothing, because the receiver belongs to the pilot and the listener is a socket in the app, so the feature was never as expensive as bundling it with a receiver made it look. Second, the ESP32-S3 cannot decode ADS-B under any circumstances, its USB being short of the required bandwidth by a factor of four, which settles the node's role rather than constraining it.

**On temperature.** The 0 to 50C rating was initially treated as disqualifying for a Pi-class board on an engine cage, by analogy with the e-paper rejection in section 10. That analogy does not hold. A display panel cannot be ducted and a circuit board can, and the aircraft is already routing pneumatic tubing to the same location. The rating became an enclosure requirement, recorded in section 23.

**What is still open.** Whether a ram-air-cooled enclosure actually holds the range on an engine cage, and whether ground idle heat-soak defeats it, are measurements rather than arguments. Both went into section 15 and get instrumented during phase 0, where the hardware is already running for the EMI checks.

**What it did not change.** The node stays publish-only. The phone stays the hub. No traffic backend, including the ones that run on the phone, may generate an alert from internet-sourced data, and no traffic display may imply that it is showing everything in the sky.

### Revision 2, August 2026: phone as hub

**What changed.** The phone stopped being a display and became half the instrument system. Position, attitude, and time move to it. The link moved from Wi-Fi to Bluetooth Low Energy. The node lost its GNSS module and gained a source-tagging requirement.

**Why.** The node was duplicating hardware the pilot already carries, at worse quality, with a harder antenna placement problem, on a Wi-Fi link that cost the phone its cellular data.

**What it cost.** GDL90 output to third-party EFBs, which drops to phase 2. The Junco app becomes the only display in v1 rather than one of several. That is a real reduction in fallback paths, and it raises the stakes on BLE link reliability, which is why phase 0 gained a test for it.

**What it did not change.** Static pressure, differential pressure, and every engine channel stay on the node. The phone cannot measure any of them from inside its own case. The temptation this architecture creates is to keep going and let the phone barometer drive the vario, and design rule 8 and section 8 exist specifically to stop that.

**Superseded advice worth recording.** Revision 1 recommended a u-blox MAX-M10S, treated GDL90 as a primary benefit, and named the ESP32-S31's Bluetooth Classic support as a reason to prefer that part. None of the three survives revision 2.
