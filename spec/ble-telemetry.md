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

**These UUIDs are provisional.** They must be fixed before any unit ships,
because once hardware is in the field they are permanent. Regenerate once,
record the decision here, and never change them again.

Base: `f5a2c1e0-XXXX-4b7a-9c3d-1e6f8a2b4d70`

| Slot | Characteristic | Properties | Rate |
|---|---|---|---|
| `0001` | Junco service | — | — |
| `0010` | Air data | notify | 25 Hz |
| `0011` | Engine speed | notify | 5 Hz |
| `0012` | Temperatures | notify | 2 Hz |
| `0013` | Slow channels | notify | 1 Hz |
| `0020` | Node status | notify, read | on change |
| `0030` | Aircraft profile | read | on connect |
| `0040` | Clock | write | on connect |
| `0041` | Configuration | read, write | rare |

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
and must not render it. Float-typed values additionally carry NaN when invalid,
matching the convention already used in `dronecan-engine-extension.md`, but the
status bit is authoritative and a client must not infer validity from the value.

**A node never holds a stale value on the link.** Bit 1 exists for the case
where a channel is genuinely slower than its rate class, not as permission to
republish an old reading. If a channel has failed, it is published invalid or
not published at all. Holding is a display behavior and belongs in the client;
see PRD section 10, which deliberately specifies different behavior for the link
and for the display.

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
A profile larger than one MTU is read in sequential chunks; the encoding is
listed as not yet specified below.

The profile describes the aircraft only. Client-side configuration, such as the
traffic backend selection in PRD section 22, is not carried here and the node
has no knowledge of it.

## Writable surface

Exactly two characteristics accept writes: Clock and Configuration.

**Neither may influence a published flight value.** A configuration write that
changed a calibration constant mid-flight would violate design rule 1 by making
the node's outputs a function of something it subscribed to. Configuration
writes are therefore rejected while a flight is in progress, and the definition
of "in progress" is listed as not yet specified below.

A client is not required to write anything. A read-only client that never writes
the clock is valid and gets usable telemetry with node-relative timestamps.

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

- The UUID base, which must be generated once and then frozen
- Exact field widths and scaling for each channel, per rate class
- Profile encoding and chunking over the read characteristic
- Configuration characteristic contents and its write schema
- What "flight in progress" means for rejecting configuration writes
- Whether node status carries channel transition counts, or whether the client
  derives them from the validity bits it has already seen
- Pairing and bonding, and whether an unpaired client may subscribe at all
- Behavior when two clients subscribe at once, which the phone-plus-FIX-Gateway
  case in PRD section 24 makes a real scenario rather than a hypothetical
