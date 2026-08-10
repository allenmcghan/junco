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

Code is MPL-2.0, hardware is CERN-OHL-S-2.0, documentation and specifications
are CC-BY-4.0.

The code is weak copyleft rather than strong. Change a Junco file and you publish
that file; combine it with anything you like otherwise, including closed code,
and charge for the result. That is a deliberate loosening from the GPL chosen in
revision 4, and the reason is distribution: GPL cannot ship on Apple's App Store,
because Apple's DRM imposes exactly the further restrictions GPL section 6
forbids. VLC was pulled over it. MPL-2.0 is what Firefox for iOS ships under.

MPL is also explicitly GPL-compatible through its Secondary License clause, so
the two-way flow with MakerPlane's FIX-Gateway and pyEFIS that motivated the GPL
choice survives the change intact.

The hardware stays strongly reciprocal. No app store touches a board file, so
none of the above applies to it.

The specifications stay CC-BY so anyone can implement them in anything. A
protocol that cannot be adopted freely does not outlive its implementation, which
is the entire reason `spec/` exists.
