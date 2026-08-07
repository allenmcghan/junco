# DroneCAN engine and fuel extension

**Status:** draft, scope definition only. Not implemented in v1.

## Why this exists

DroneCAN is the primary CAN protocol used by ArduPilot and PX4. Publishing
standard types means an autopilot or any other subscriber consumes Junco data
without anyone writing a driver. Publishing custom types means somebody has to
write a driver, which means nobody will.

So the rule is: **standard types wherever one exists, and this extension only
for the genuine gap.**

## What is already covered by standard types

Do not redefine any of these.

| Data | Standard type |
|---|---|
| Engine state, RPM, general status | `uavcan.equipment.ice.reciprocating.Status` |
| Per-cylinder CHT and EGT (kelvin) | `uavcan.equipment.ice.reciprocating.CylinderStatus` |
| Static and differential pressure | `uavcan.equipment.air_data.*` |
| Position and velocity | `uavcan.equipment.gnss.*` |
| Rangefinder / AGL | `uavcan.equipment.range_sensor.Measurement` |
| Node health and uptime | `uavcan.protocol.NodeStatus` |

`CylinderStatus` already handles the case of a cylinder with no EGT sensor,
and the case of one shared EGT sensor reported across all cylinders. Junco's
CHT and EGT therefore need no new specification at all.

## The actual gap

This is the entire scope of this document.

1. **Multi-engine synchronization.** RPM delta and phase between engines on a
   twin, as a first-class value rather than something each consumer derives.
2. **EGT split.** Difference between cylinders on one engine, which is the
   jetting and air-leak indicator on a two-stroke.
3. **Two-stroke seizure precursors.** EGT rate of change, with the threshold
   and window as part of the message rather than consumer-side policy.
4. **Fuel endurance modeling.** Time remaining and range remaining, with the
   confidence of the estimate and which backend produced the underlying level.

## Open questions

- How are two engines represented? Separate node IDs, or an engine index field
  within the message? Check what ArduPilot's consumer actually does before
  deciding, because the wrong answer here is invisible until someone tries it.
- Does fuel endurance belong here or in a separate fuel namespace, given that
  the level source is pluggable?
- Should seizure precursor detection be published as a computed warning, or
  should the raw rate be published and the policy left to the consumer? Design
  rule 1 argues for publishing data rather than judgments.

## Rules for anything added here

- Never duplicate a standard type
- Every field carries units in its name or comment, SI where DroneCAN uses SI
- Unknown or unavailable fields are NaN, matching the standard types' convention
- Invalid data is flagged or not published. It is never held at its last value.
  Holding is a display behavior only. See PRD section 10
