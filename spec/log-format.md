# Junco log format

**Status:** draft. Required for v1.

## Requirement

A log written in 2027 must be readable in 2040 by someone who has the file and
nothing else. No external schema. No firmware version lookup table. No access
to this repository.

That single requirement drives every decision below.

## Design

**Self-describing.** The file opens with format descriptor records declaring
every message type and field layout it contains, in the manner of ArduPilot
dataflash logs. A reader parses the descriptors first and then the data.
Adding a field in a later firmware version does not break an old reader.

**Fixed-size records, written sequentially.** Each record carries a magic
header, a monotonic timestamp, a type identifier, and a CRC.

**Recoverable without a filesystem.** A destroyed FAT must still yield the
flight. The recovery tool scans raw sectors for the magic header and
reconstructs the record stream. This is the realistic failure mode: power cut
mid-write, not impact.

**Preallocated.** The file is allocated to full size at engine start, because
FAT32 only updates the directory length on close. An interrupted flight
otherwise leaves a zero-length file with every byte still on the card.

**Flushed every second.** Not on close.

## Required header content

Every file identifies the unit that wrote it, per PRD design rule 7.

- Build class: self-built, kit-built, or factory-qualified
- Hardware revision
- Firmware version
- Calibration date
- Aircraft profile identifier and hash

A v1 self-build must be distinguishable from a later qualified unit using the
log file alone, with no external record.

## Required per-record content

Every sample carries the source that produced it, per PRD design rule 8. A
pressure altitude derived from a plumbed static plenum and one derived from a
phone barometer are different measurements, and a reader that cannot tell them
apart will silently merge them.

**The source tag enumeration is defined in `ble-telemetry.md`.** It is not
restated here, because two copies of an enumeration diverge. That document
allocates values for phone-supplied sources as well, which never cross the BLE
link but do appear in this file.

Invalid data is flagged invalid or omitted. It is never written at its last
known value. Holding is a display behavior and has no place in a log.

## Time

There are two recordings and they are required to merge without manual
alignment: the node log on the card, and the phone log that also carries
position and attitude.

The node has no real-time clock and must never be assumed to have one. It
timestamps with a monotonic counter. The phone sends its wall clock on connect,
and the node writes the offset into the file as a record, so a card recovered on
its own can still be placed in real time.

## Not yet specified

- Record type identifiers and their allocation
- Descriptor record encoding
- Whether records are a raw partition or a file on FAT
- Export mapping to CSV and GPX
