# Specifications

These documents are expected to outlive every implementation in this
repository, including the reference one. They are versioned independently of
the firmware and are the artifacts most worth getting right.

| Document | Status |
|---|---|
| `log-format.md` | Draft. Required for v1 |
| `aircraft-profile.md` | Draft. Required for v1 |
| `dronecan-engine-extension.md` | Draft. Not implemented in v1 |
| `ble-telemetry.md` | **Not started. Required for v1, and the one that blocks code** |

`ble-telemetry.md` is the gating document. It carries every value the pilot
sees, both the firmware and the app are written against it, and PRD success
criterion 4 requires a stranger to write a second client from it without reading
the Android source. Little of substance should be implemented before it exists.

The source tag enumeration required by design rule 8 is shared between the BLE
protocol and the log format. Define it once, in one document, and reference it
from the other.
