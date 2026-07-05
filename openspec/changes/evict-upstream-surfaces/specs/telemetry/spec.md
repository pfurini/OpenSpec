# telemetry — delta

## REMOVED Requirements

### Requirement: Command execution tracking
**Reason**: Telemetry subsystem evicted — a personal hard fork does not report usage to upstream analytics.
**Migration**: None — no replacement; the CLI emits no analytics events.

### Requirement: Privacy-preserving event design
**Reason**: Telemetry subsystem evicted.
**Migration**: None.

### Requirement: Environment variable opt-out
**Reason**: Telemetry subsystem evicted; with no telemetry there is nothing to opt out of.
**Migration**: `OPENSPEC_TELEMETRY`-style opt-out variables become inert and can be removed from user environments.

### Requirement: CI environment auto-disable
**Reason**: Telemetry subsystem evicted.
**Migration**: None.

### Requirement: First-run telemetry notice
**Reason**: Telemetry subsystem evicted; no notice is shown because nothing is collected.
**Migration**: None.

### Requirement: Anonymous user identification
**Reason**: Telemetry subsystem evicted; the `anonymousId` is no longer generated or stored.
**Migration**: The `telemetry` object in `~/.config/openspec/config.json` is ignored on read and dropped on the next config write (see `global-config` delta).

### Requirement: Immediate event sending
**Reason**: Telemetry subsystem evicted.
**Migration**: None.

### Requirement: Graceful shutdown
**Reason**: Telemetry subsystem evicted; no event queue exists to flush.
**Migration**: None.

### Requirement: Silent failure handling
**Reason**: Telemetry subsystem evicted.
**Migration**: None.
