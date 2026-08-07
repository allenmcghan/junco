# Contributing

## The most useful contribution

**Build one and tell us where the documentation was wrong.**

The most common way an open hardware project dies is that only the originator
ever built one, so the documentation is wrong in ways nobody discovered until
the project was already cold. A build report from someone who is not the author
is worth more than a feature.

Open an issue titled "Build report" and include what you built it for, what you
substituted, and every point where you got stuck.

## Before proposing a feature

Read `docs/prd.md` section 19, the decisions and rationale table. Several
obvious-looking ideas were considered and rejected for specific reasons:
e-paper displays, LiDAR fuel sensing inside the tank, ram air turbines,
building on ArduPilot, and a PWA client. If you want to revisit one, argue
against the stated reason rather than around it.

## Rules that are not up for negotiation

These are in `docs/prd.md` section 2 and a pull request that weakens one will
be declined regardless of its merits elsewhere.

- The sensor node never actuates anything, and is publish-only on the bus
- Logbook entries are proposed, never filed
- Adapting to a new aircraft never requires a toolchain
- A unit always declares its build class

## Specifications before implementations

Changes to the log format, the aircraft profile schema, or the DroneCAN
extension go through `spec/` first. Those documents are expected to outlive
every implementation in this repository, including the reference one.
