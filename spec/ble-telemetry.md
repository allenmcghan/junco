# Junco BLE telemetry

**Status:** draft. Required for v1. This document blocks firmware and app work.

## Requirement

Every value the pilot sees crosses this link. A stranger must be able to write a
working client from this document alone, without reading the Android source.
That is PRD success criterion 4, and it is the reason this document exists
separately from any implementation.

Two reference clients are expected, which is a useful forcing function:

- the Junco Android app
- a FIX-Gateway plugin in Python, per PRD section 24

If a rule below is only satisfiable by one of them, it is the wrong rule.

## Design rules this document inherits

From PRD section 2 and section 14:

1. **Publish-only for flight data.** The only writable characteristics are
   configuration and the clock, and neither influences a published value.
2. **One notify characteristic per rate class**, not one per channel. Grouping
   by rate keeps notification count low and packing efficient.
3. **Every sample carries a source tag and a validity flag.** Invalid is
   published as invalid, never as a held value.
4. **The profile is readable over the link**, so a client configures itself from
   the node.

## Service and characteristic layout

**These UUIDs are frozen.** Generated 2026-08-09 as a single random v4 UUID,
with bytes 4 and 5 used as a 16-bit allocation slot. They are permanent. Once
hardware exists in the field, changing them silently breaks every client that
was written against them, so a future version of this document may allocate new
slots but must never redefine an existing one.

Base: `1761601a-XXXX-4e69-b9a1-b45cf63c7638`

| Slot | Characteristic | UUID | Properties | Rate |
|---|---|---|---|---|
| `0001` | Junco service | `1761601a-0001-4e69-b9a1-b45cf63c7638` | — | — |
| `0010` | Air data | `1761601a-0010-4e69-b9a1-b45cf63c7638` | notify | 25 Hz |
| `0011` | Engine speed | `1761601a-0011-4e69-b9a1-b45cf63c7638` | notify | 5 Hz |
| `0012` | Temperatures | `1761601a-0012-4e69-b9a1-b45cf63c7638` | notify | 2 Hz |
| `0013` | Slow channels | `1761601a-0013-4e69-b9a1-b45cf63c7638` | notify | 1 Hz |
| `0020` | Node status | `1761601a-0020-4e69-b9a1-b45cf63c7638` | notify, read | on change |
| `0030` | Aircraft profile | `1761601a-0030-4e69-b9a1-b45cf63c7638` | read | on connect |
| `0040` | Clock | `1761601a-0040-4e69-b9a1-b45cf63c7638` | write | on connect |
| `0041` | Configuration | `1761601a-0041-4e69-b9a1-b45cf63c7638` | read, write | rare |

Rate classes come from the channel table in PRD section 8. A channel's rate
class is a property of the channel, not of the installation, so a client can
rely on the grouping without reading the profile first.

## Sample framing

Every notification begins with a common header, so a client that does not
recognise a characteristic can still discard it safely.

| Field | Type | Notes |
|---|---|---|
| `format` | uint8 | Layout version for this characteristic. Increment on any change |
| `t_ms` | uint32 | Node monotonic milliseconds. Not wall clock. See Time |

Each channel in the payload is then a triple:

| Field | Type | Notes |
|---|---|---|
| `value` | per channel | See the channel table |
| `source` | uint8 | Source tag enumeration below |
| `status` | uint8 | Bit 0 valid, bit 1 stale, bits 2-7 reserved and zero |

**When bit 0 is clear the value field is undefined.** A client must ignore it
and must not render it.

**The status bit is the only validity signal.** Every value on this link is an
integer, so there is no NaN to carry a second, redundant answer. The NaN
convention in `dronecan-engine-extension.md` applies to DroneCAN's own float
types and does not apply here. One signal, one place to check.

**A node never holds a stale value on the link.** Bit 1 exists for the case
where a channel is genuinely slower than its rate class, not as permission to
republish an old reading. If a channel has failed, it is published invalid or
not published at all. Holding is a display behavior and belongs in the client;
see PRD section 10, which deliberately specifies different behavior for the link
and for the display.

## Channel encoding

**Every value is an integer in SI units.** No floats and no display units.

Integers because both reference clients decode them identically, because they
pack smaller, and because a fixed scale is a decision recorded in this document
rather than a floating point representation question deferred to a compiler.

SI because unit selection is a display concern. PRD section 11 lets the owner
pick feet or metres, gallons or litres, Fahrenheit or Celsius, and that choice
lives in the profile and applies at render time. Gallons must never appear on
the wire, or two clients will disagree about what a number means.

| Channel | Type | Scale | Range covered |
|---|---|---|---|
| Static pressure | `uint32` | Pa × 100 | 0 to 1100 hPa with margin |
| Differential pressure | `int32` | Pa × 100 | ±500 Pa, far finer than the sensor's 0.1 Pa zero accuracy |
| Engine speed | `uint16` | 1 RPM | 0 to 10000 |
| Cylinder head temp | `int16` | 0.1 °C | −273 to 3276 |
| Exhaust gas temp | `int16` | 0.1 °C | Covers a two-stroke EGT to 1200 °C |
| Outside air temp | `int16` | 0.1 °C | |
| Fuel quantity | `uint32` | millilitres | |

Scales are deliberately finer than the sensors warrant. Resolution costs nothing
here and re-scaling a shipped protocol costs everything.

## Source tag enumeration

**This enumeration is shared with `log-format.md` and is defined here.** That
document references these values rather than restating them, so there is exactly
one place to add a source.

Design rule 8 exists because a pressure altitude from a plumbed plenum and one
from a phone barometer are not interchangeable. The tag is what makes that
survivable across the link, the log, and the display.

| Value | Source |
|---|---|
| `0x00` | Unknown. Never valid in a published sample |
| `0x10` | Node, plumbed static plenum |
| `0x11` | Node, pitot differential |
| `0x12` | Node, type K thermocouple |
| `0x13` | Node, isolated pulse counter |
| `0x14` | Node, ambient temperature sensor |
| `0x20` | Node fuel, burn integration |
| `0x21` | Node fuel, magnetic float |
| `0x22` | Node fuel, load cell |
| `0x23` | Node fuel, ultrasonic |
| `0x24` | Node fuel, capacitive |
| `0x30` | Phone, GNSS |
| `0x31` | Phone, barometer |
| `0x32` | Phone, OS sensor fusion |
| `0x40` | Derived, from node channels only |
| `0x41` | Derived, mixing node and phone channels |

`0x30` through `0x32` never appear on this link, because the node does not
produce them. They are allocated here because the log format carries both sides
and the enumeration must be single-valued across both.

`0x41` is load-bearing. A derived value that mixes a node channel with a phone
channel inherits the weaker assurance of the two, and a client that cannot tell
`0x40` from `0x41` will present them identically. Vertical speed in particular
must never be `0x41`; PRD section 8 requires it to come from plenum static only.

## Payload composition

**A rate class payload carries its channels in the order the profile declares
them**, and the count comes from the profile. A twin publishes two engine speeds
in the engine characteristic; a single publishes one. Nothing in the framing
announces the count, because the profile already did.

The consequence is a hard ordering requirement: **a client must read the profile
before it can parse any rate class notification.** A client that subscribes
first and reads later will mis-slice every payload it receives in between. Read
the profile, then subscribe.

This is the right trade for a link where the aircraft is knowable and bytes are
scarce. It is stated explicitly because it is the single easiest way to write a
broken second client, and success criterion 4 says a stranger has to get this
right from the document alone.

## Node status

The status characteristic carries what the pilot needs after the flight rather
than during it.

**Channel transition counts live on the node, not in the client.** PRD section
10 requires a post-flight summary naming each channel that failed and how many
times it transitioned, and a client that connected late or dropped out would
count wrong. The node is the only party that observed the whole flight, so the
node counts and the client displays.

The same reasoning puts them in the log, which is authoritative and survives the
phone being lost.

## Connection parameters

- **Connection interval: 15 ms or better.** 25 Hz air data must arrive without
  aggregation delay. A client requests this; a node does not assume it was
  granted and must not silently drop samples if it was not.
- **ATT MTU:** negotiate upward on connect. Every characteristic payload defined
  here fits in the 23-byte default MTU so a client that fails negotiation still
  works, at the cost of more packets.
- **Notifications, not indications.** Flight data is a stream. A lost sample is
  replaced 40 ms later by a better one, and the acknowledgement round trip costs
  more than the sample is worth.

## Time

The node has no real-time clock and must never be assumed to have one.

1. The node timestamps everything with `t_ms`, a monotonic counter from boot.
2. The client writes its wall clock to the Clock characteristic on connect.
3. The node records the offset into the log as a record, per `log-format.md`.

The node's published timestamps do not change after a clock write. Correcting
them would make the stream discontinuous mid-flight and would break any client
that had already recorded samples. Alignment is a post-processing operation
against the recorded offset, not a live correction.

## Profile transfer

The aircraft profile lives on the node, per PRD section 11, so a borrowed phone
or a replacement tablet inherits the right configuration by connecting.

The client reads the profile on connect and caches it against the profile hash.

**Transfer:** the node serves the profile from a single read characteristic in
sequential chunks, each framed as `[uint16 offset][uint16 total][bytes]`. The
client reads from offset zero, learns `total` from the first chunk, and
continues until it has that many bytes. No separate length characteristic and no
state machine on the node beyond the offset the client asks for.

**Encoding:** the compiled binary form of the profile, per
`aircraft-profile.md`. The TOML source is also stored on the node and is
retrievable over the Wi-Fi AP for editing, but it is not sent over BLE. A client
needs the values, not the comments.

**Hash:** SHA-256 over the exact bytes the node stores, truncated to 8 bytes.
Truncated to the same 8 bytes in the log header, so a log and a live connection
name the same profile identically.

The profile describes the aircraft only. Client-side configuration, such as the
traffic backend selection in PRD section 22, is not carried here and the node
has no knowledge of it.

## Writable surface

Exactly two characteristics accept writes: Clock and Configuration.

**Neither may influence a published flight value.** A configuration write that
changed a calibration constant mid-flight would violate design rule 1 by making
the node's outputs a function of something it subscribed to.

**Configuration writes are rejected whenever the log file is open.** That is the
whole definition of "in flight" for this purpose. It is a single condition the
node already tracks, it needs no RPM threshold to tune, and it fails safe: if
the node is recording, it is not reconfigurable.

**A configuration write replaces the entire profile atomically.** There is no
field-level write. The node validates the whole profile, recomputes the hash,
and either accepts or rejects it as a unit. Partial writes are how a node ends
up in a state that matches no file anywhere, which is unrecoverable by anyone
trying to reproduce a flight from the log.

**Writes require a bond. Subscribing does not.** Flight data is publish-only
advisory data, and requiring a pairing to read it would mean a lost bond costs
the pilot their instruments in flight. Writes change what the node is, so they
require an established relationship. This puts the security boundary exactly on
the design rule 1 line: the unauthenticated surface is the one that cannot
influence anything.

A client is not required to write anything. A read-only client that never writes
the clock is valid and gets usable telemetry with node-relative timestamps. The
FIX-Gateway plugin is expected to be exactly that.

## Concurrent clients

**The node supports two simultaneous connections** and publishes identically to
both. The phone-plus-FIX-Gateway case in PRD section 24 makes this ordinary
rather than exotic.

Two, not unlimited. Each connection consumes radio time at the 15 ms interval,
and a documented limit that clients can rely on is worth more than an
undocumented one they discover in flight. A third connection attempt is refused,
not silently accepted and starved.

**The first clock write of a session wins.** Subsequent writes from any client
are acknowledged and ignored. Two clients with slightly different wall clocks
must not be able to move the time base underneath a log that is already being
written.

## Versioning

The `format` byte is per characteristic, not global. A node may increment the
air data layout without touching the temperature layout.

A client that sees a `format` it does not recognise must discard that
characteristic's notifications and continue operating on the ones it does
recognise. It must say so plainly rather than showing an empty field, per the
stale-data rules in PRD section 10.

Adding a channel to the end of an existing payload is a `format` increment. It
is not backward compatible and must not be treated as though it were, because a
client sizing its parse from the old layout will mis-slice the new one.

## Not yet specified

- The full node status payload beyond the transition counts. Uptime, supply
  voltage, SD state, and free space are candidates
- What the advertisement carries: device name convention, whether the service
  UUID is advertised, and whether build class is visible before connecting
- Behavior when a rate class payload exceeds the negotiated MTU, which a
  many-cylinder aircraft could reach even though the PM-2 does not
- Whether the configuration characteristic's read returns the current profile
  hash, the validation result of the last write, or both
