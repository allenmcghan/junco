# Aircraft profile

This specification has moved to **Open Checklists**.

- **Authoritative document:** [github.com/allenmcghan/openchecklists/spec/aircraft-profile.md](https://github.com/allenmcghan/openchecklists/blob/main/spec/aircraft-profile.md)
- **Configuration tool:** [openchecklists.net](https://openchecklists.net)
- **Aircraft profiles** (including the PM-2): [github.com/allenmcghan/openchecklists/profiles/](https://github.com/allenmcghan/openchecklists/tree/main/profiles)

The aircraft profile format is defined and versioned in the openchecklists
project, which also hosts profiles for common Part 103 and experimental
aircraft and the checklists that accompany them.

Two formats live there, and they are deliberately different. **Aircraft
profiles are TOML**: hand-edited hardware configuration, no upstream document
to cite. **Checklists are JSON** against a published schema, because a
checklist carries a source and a verification state that has to survive being
converted to every other format. Junco consumes both, plus the preflight-log
and pilot-logbook schemas:

- **Checklist schema:** [schema/open-checklist-1.0.schema.json](https://github.com/allenmcghan/openchecklists/blob/main/schema/open-checklist-1.0.schema.json)
- **Preflight log:** [schema/open-checklist-log-1.0.schema.json](https://github.com/allenmcghan/openchecklists/blob/main/schema/open-checklist-log-1.0.schema.json)
- **Pilot logbook:** [schema/open-logbook-1.0.schema.json](https://github.com/allenmcghan/openchecklists/blob/main/schema/open-logbook-1.0.schema.json)

Checklist phase identifiers are stable and semantic, which is the property
Junco depends on: it is what lets the app map a checklist section to a moment
in flight rather than to a page number.

Junco firmware and the Android app implement the current schema version of
that specification. Incompatible schema version changes will be tracked in
the Junco changelog.
