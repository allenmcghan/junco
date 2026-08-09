# Maintainers

Junco is built with the explicit goal of outliving its originator. This file
is part of that, and it is meant to be kept current rather than written once.

## Current

| Role | Who | Scope |
|---|---|---|
| Lead | Allen McGhan | Everything |
| Co-maintainer | TBD | **Fill this in.** A single-maintainer project is a project with a scheduled end date |

## Handoff trigger

If the lead maintainer is unreachable for **12 consecutive months**, the
co-maintainer assumes the lead role and may add maintainers without further
approval. If no co-maintainer exists at that point, any contributor with three
or more merged pull requests may claim the role by opening an issue titled
"Maintainer succession" and waiting 30 days for objection.

This clause exists so the project does not require anyone's permission to
continue existing.

## Stewardship checklist

Status of the things that make the project survivable. Unchecked items are
open work, not aspirations. `docs/open-questions.md` records the order worth
doing them in; naming a co-maintainer comes first, because every other item
assumes someone is there to act on it.

- [ ] GitHub organization with at least two owners (not a personal account)
- [ ] Mirror to a second forge
- [ ] Co-maintainer named above
- [ ] Tagged releases archived to Zenodo for a permanent DOI
- [ ] OSHWA certification (free, self-certified, registry entries are permanent)
- [ ] Donations routed through a fiscal host rather than a personal account
- [x] Documentation lives in the repository as markdown, not on a hosted site requiring renewal
- [x] Rationale recorded alongside decisions (see docs/prd.md section 19)

## Why the licenses differ

Firmware is GPL-2.0-or-later, hardware is CERN-OHL-S-2.0, documentation and
specifications are CC-BY-4.0.

The code and the hardware are copyleft because the purpose of the project is to
put this capability into the world permanently, and a permissive license lets a
better funded fork take the work closed and outrun the original. Anyone may
still build, modify, sell, or fork Junco. What they may not do is stop passing
it on.

GPL v2 **or later** matches MakerPlane, so code moves in both directions between
this project and FIX-Gateway or pyEFIS without relicensing. The "or later" also
keeps GPLv3 reachable if ArduPilot code is ever wanted for the v2 bus stage.

CERN-OHL-S is the strongly reciprocal license actually written for hardware
design artifacts. A software license does not cleanly cover board files and
mechanical models.

The specifications are the deliberate exception and stay CC-BY, so anyone can
implement them in anything, including a closed product. A protocol that cannot
be adopted freely does not outlive its implementation, which is the entire
reason `spec/` exists.
