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
open work, not aspirations.

- [ ] GitHub organization with at least two owners (not a personal account)
- [ ] Mirror to a second forge
- [ ] Co-maintainer named above
- [ ] Tagged releases archived to Zenodo for a permanent DOI
- [ ] OSHWA certification (free, self-certified, registry entries are permanent)
- [ ] Donations routed through a fiscal host rather than a personal account
- [x] Documentation lives in the repository as markdown, not on a hosted site requiring renewal
- [x] Rationale recorded alongside decisions (see docs/prd.md section 19)

## Why the licenses differ

Firmware is MIT, hardware is CERN-OHL-P-2.0, documentation is CC-BY-4.0.
MIT is drafted for source code and does not cleanly cover hardware design
artifacts. CERN-OHL-P is the permissive license actually written for hardware.
Neither is a copyleft choice: anyone may build, modify, sell, or fork Junco.
