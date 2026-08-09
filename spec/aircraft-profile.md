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

## Serialization

**TOML as the source of truth, plus a compiled binary form. The node stores
both.**

This resolves a real tension. "Config, not code" requires a file a human can
open in a text editor and understand. Flight firmware does not want a TOML
parser on its critical path, and an ESP32 parsing text at boot is a failure mode
nobody needs.

So:

- **TOML is authoritative.** Hand-editable, comments survive round trips, no
  significant whitespace to get wrong, unambiguous types. It is what the owner
  edits and what the web configuration tool emits.
- **The binary form is derived.** Compiled from the TOML by the configuration
  tool or by the node's Wi-Fi AP mode, never in flight. Fixed layout, no
  parsing, directly usable.
- **Both live on the node.** The TOML so the aircraft is self-documenting and a
  replacement tool can read it back; the binary so nothing parses text at boot.
- **BLE serves the binary form**, per `ble-telemetry.md`. A client needs the
  values, not the comments.

If the two ever disagree, the TOML wins and the binary is rebuilt. A node that
finds a binary whose hash does not match its TOML refuses to arm and says so.

## Versioning

An integer `schema_version` at the top of the file.

**The node refuses a version it does not recognise. It never guesses.** A node
that half-understands a profile is a node that may be reading a cylinder head
temperature limit from the wrong field, and there is no safe default for that.

**Migration lives in the configuration tool, not in firmware.** A tool running
on a laptop can be careful, can show a diff, and can be corrected. Migration
logic embedded in flight firmware is how a limit gets silently reinterpreted
three versions later.

## Validation

Validated in both places: the configuration tool rejects on save, and the node
revalidates on load because it cannot assume the file arrived from the tool.

**A channel that fails validation is not armed**, and the node reports it rather
than substituting a default. Minimum rejections:

- Engine count, cylinders per engine, and the channel map disagreeing
- Usable fuel greater than capacity
- Pulses per revolution of zero
- Two channels claiming the same pin or address
- A limit outside the range its sensor can represent
- A fuel backend named in the channel map with no corresponding calibration

## Profile hash

**SHA-256 over the exact bytes stored on the node, truncated to 8 bytes.**

"Exact bytes stored" and not a re-serialization. Hashing a re-serialized
structure means any change to the serializer silently changes the hash of an
unmodified profile, which invalidates every cached copy and every log header
that referenced it. Hash the bytes on the card.

The same 8 bytes appear in the log header and over BLE, so a log file and a live
connection name the same profile identically.

## What the profile does not contain

The profile describes the aircraft, and it lives on the node so a borrowed phone
or a replacement tablet inherits the right configuration by connecting.

Anything describing the pilot's own equipment rather than the aircraft is
app-side configuration and stays on the phone. Traffic backend selection is the
current example: which receiver or feed a pilot uses is a property of what is in
their flight bag, it changes without the aircraft changing, and the node is not
in that data path at all. See PRD section 22.

## Not yet specified

- The TOML key names and the file's section structure
- The binary form's field layout, which is shared with `ble-telemetry.md`
- What the node does when no valid profile exists at all, on a freshly built
  unit that has never been configured
