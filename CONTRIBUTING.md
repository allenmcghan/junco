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
- Every channel declares its source, and invalid data is published as invalid
  rather than held at its last value

## Licensing your contribution

Code is GPL-2.0-or-later, hardware is CERN-OHL-S-2.0, documentation and
specifications are CC-BY-4.0. By opening a pull request you agree your
contribution ships under the license covering that artifact.

Sign your commits off with `git commit -s`, which appends:

    Signed-off-by: Your Name <you@example.com>

That is the Developer Certificate of Origin, the same one the Linux kernel uses.
It is not a copyright assignment and it does not ask you to give anything up. It
is a statement that you wrote the contribution or otherwise have the right to
submit it under this license, which is what makes the project safe to
redistribute, including through an app store.

Every source file starts with:

    SPDX-License-Identifier: GPL-2.0-or-later

The "or later" is not optional and not decorative. It is what lets code move
between Junco and MakerPlane's FIX-Gateway and pyEFIS, which are GPL v2 or
later, and it keeps GPLv3 reachable if ArduPilot code is ever wanted. A file
contributed as GPL-2.0-only would break both.

Do not paste in code from a permissively licensed project without checking that
the attribution requirements survive the relicensing, and do not paste in code
from a GPLv3-only project at all.

## Specifications before implementations

Changes to the log format, the aircraft profile schema, or the DroneCAN
extension go through `spec/` first. Those documents are expected to outlive
every implementation in this repository, including the reference one.
