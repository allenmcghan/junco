# Specifications

These documents are expected to outlive every implementation in this
repository, including the reference one. They are versioned independently of
the firmware and are the artifacts most worth getting right.

| Document | Status |
|---|---|
| `log-format.md` | Draft. Required for v1 |
| `aircraft-profile.md` | Draft. Required for v1 |
| `dronecan-engine-extension.md` | Draft. Not implemented in v1, and its choice of bus is reopened. See PRD section 24 |
| `ble-telemetry.md` | Draft. Required for v1. The gating document |

`ble-telemetry.md` gates firmware and app work. It carries every value the pilot
sees, both reference clients are written against it, and PRD success criterion 4
requires a stranger to write a second client from it without reading the Android
source.

The source tag enumeration required by design rule 8 is **defined in
`ble-telemetry.md`** and referenced from `log-format.md`. Add a new source in one
place only.
