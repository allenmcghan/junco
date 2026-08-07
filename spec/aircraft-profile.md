# Aircraft profile

**Status:** draft. Required for v1.

## Requirement

Adapting Junco to a different aircraft must never require a toolchain. One
human-readable, hand-editable file describes the aircraft completely. A web
based configuration tool generates and validates it, but is never required to
produce one.

## Contents

**Identity.** Registration or vehicle ID, make, model. Used for logbook drafts.

**Powerplant.** Engine count, cylinders per engine, ignition pulses per
revolution, hour meter offsets.

**Channel map.** Which backend supplies each channel, on which pin or address.
Fuel level in particular is a pluggable channel: burn integration, magnetic
float, load cell, ultrasonic, or capacitive. Firmware sees a level, never a
method.

**Calibration.** Pitot position error, baro offset, thermocouple offsets, fuel
curve.

**Limits.** CHT, EGT, RPM, fuel reserve, density altitude advisory.

**Fuel.** Capacity, usable quantity, burn rate against RPM.

**Units.** Every unit independently selectable. Feet or meters, knots or mph or
km/h, Fahrenheit or Celsius, gallons or liters, inHg or hPa.

**Reference.** Magnetic or true.

**Logging.** Rate, retention, enable or disable.

**Build class.** Self-built, kit-built, or factory-qualified. Written into
every log header.

## Not yet specified

- Serialization format. Leading candidate is TOML for hand-editability
- Schema versioning and migration when a field is added
- Validation rules, particularly which combinations are rejected outright
- How the profile hash is computed for the log header
