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

## Not yet specified

- Record type identifiers and their allocation
- Descriptor record encoding
- Whether records are a raw partition or a file on FAT
- Export mapping to CSV and GPX
