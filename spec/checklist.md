# Junco checklist format

**Status:** draft. Not required for v1. Proposed as an interchange format and a
repository convention, not as another vendor format.

## Why this exists

Six checklist formats already exist and are in daily use:

| Format | System |
|---|---|
| `.ace` | Garmin G3X, G3X Touch, GTN |
| `.gplt` | Garmin Pilot |
| `.fmd` | Jeppesen ForeFlight |
| AFS | Advanced Flight Systems |
| Dynon | Dynon SkyView |
| GRT | Grand Rapids |

[efis-editor](https://github.com/rdamazio/efis-editor) already reads and writes
all six under Apache 2.0, which is a substantial piece of work and the reason
this document does not contain six parsers. The rule from
`dronecan-engine-extension.md` applies unchanged: **standard types wherever one
exists, and a new definition only for the genuine gap.**

Three gaps are genuine.

**Every one of those formats is a vendor artifact.** They are binary or
semi-binary, tied to a panel, and at least one Garmin Pilot variant is encrypted
and cannot be read at all. None is something a builder opens in a text editor,
diffs, or reviews a change to. A format nobody can read by eye is a format
nobody can check, and a checklist is a safety document.

**The free repositories that exist are PDFs.** They are useful to a human with a
printer and useless to software. Nothing can load one into a panel, diff two
revisions, or tell you the one you are holding is three years old.

**None of it covers this aircraft class.** Every format above targets a
certified or experimental panel. A Part 103 ultralight with no electrical system
is not in scope for any of them, and it is the aircraft most likely to be flown
with no checklist at all.

## What this is

A **human-editable text format**, and a **repository convention** for sharing
files written in it. Not a service. The same position `aircraft-profile.md`
takes, for the same reasons: a file can be mailed, diffed, printed, reviewed,
and kept working after everyone involved has lost interest.

TOML, matching the aircraft profile, so a builder learns one syntax.

## Format

```toml
schema_version = 1

[aircraft]
make = "ParaPlane"
model = "PM-2"
# Free text, matched loosely. A checklist for a PM-2 is a reasonable starting
# point for a PM-1 and the format should not pretend otherwise.
variant = ""
category = "part103"        # part103 | lsa | experimental | certified | glider

[provenance]
# Load-bearing, not bookkeeping. A checklist off the internet is a starting
# point for the pilot's own, and the pilot has to be able to see where it came
# from before trusting a line of it.
author = "Allen McGhan"
source = "Transcribed from the ParaPlane owner's manual, 1985 printing"
revised = "2026-08-10"
verified_on_aircraft = false
notes = "Twin-engine start sequence differs from the single-engine manual."

[[phase]]
id = "preflight"
name = "Preflight"

[[phase.item]]
challenge = "Fuel quantity"
response = "CHECKED, both tanks"

[[phase.item]]
challenge = "Control surfaces"
response = "FREE AND CORRECT"

[[phase.item]]
type = "caution"
text = "Do not run the engines with the sail unstowed."

[[phase]]
id = "pretakeoff"
name = "Before takeoff"

[[phase.item]]
challenge = "Engine temps"
response = "GREEN"
```

### Item types

| `type` | Meaning |
|---|---|
| `challenge` (default) | A challenge and response pair. `response` may be omitted for a plain action |
| `note` | Information, no action, not ticked |
| `caution` | Something that damages the aircraft if ignored |
| `warning` | Something that hurts somebody if ignored |

`caution` and `warning` are separate from `note` because they must render
differently and must not be tickable. A warning is not a task.

### Phases

`id` is from a fixed set so software can map a phase to a moment in the flight:
`preflight`, `before_start`, `start`, `pretakeoff`, `takeoff`, `climb`,
`cruise`, `descent`, `prelanding`, `landing`, `postflight`, `securing`,
`emergency`, `abnormal`.

`name` is free text and is what the pilot sees. A phase with an unrecognised
`id` is displayed but not mapped, rather than rejected.

## Rules

1. **A checklist is never authoritative.** It is a proposal, exactly as a
   logbook entry is under PRD section 13. The aircraft's own manual wins, and
   the pilot owns the result. Any software rendering this format must show
   `provenance` where the pilot can see it before use.
2. **`verified_on_aircraft = false` is the honest default.** A transcription
   nobody has flown behind is worth having and worth marking.
3. **Never silently merge two checklists.** Two files for the same aircraft are
   two opinions, not one better checklist.
4. **Emergency phases are never auto-advanced or auto-ticked** by anything.

## Repository convention

A directory tree in a git repository. That is the whole design.

```
checklists/
  part103/
    paraplane/pm-2.toml
    quicksilver/mx-sprint.toml
  experimental/
    vans/rv-12.toml
```

Git supplies what a checklist repository actually needs and a web form does not:
history, attribution, diffs, review before merge, forking a file you disagree
with, and full function with the origin server gone.

**Licensing.** Files in the repository should be CC-BY-4.0 or more permissive,
matching this specification, so they can be used in any application including
closed ones. A checklist nobody may adopt does not get adopted.

**A transcription of a manufacturer's checklist is a derivative of their
document.** Contributors are responsible for the right to publish what they
submit. Transcribing a Part 103 owner's manual whose maker closed in 1987 is a
different question from copying a current POH, and this document does not
pretend they are the same.

## Interoperating rather than competing

Export to the six vendor formats should go through efis-editor rather than be
reimplemented. It is Apache 2.0, it works, and rewriting six parsers to avoid a
dependency would be vanity.

**One licensing note.** Apache 2.0 is incompatible with GPL-2.0-only, but Junco
is GPL-2.0-**or-later**, so a combined work can be distributed under GPLv3. This
is the first place that "or later" has paid for itself, and it is worth
recording that it was not decorative.

## Not yet specified

- Whether an item may carry a condition, such as "if the engine is fuel injected"
- How a repository declares that one file supersedes another
- Whether phases may nest, which every vendor format handles differently
- A signing or checksum convention, so a printed copy can be matched to a file
