# Design Lint Telemetry Specification — v1.0.0

**Status:** Stable  
**Authors:** Lapidist contributors  
**Publication URL:** `https://telemetry.design-lint.lapidist.net/schema/v1.json`

---

## 1. Introduction

The Design Lint Telemetry Specification (DLTS) defines a versioned event stream
format for observability data emitted by `@lapidist/design-lint` at runtime. DLTS
events provide structured insight into lint runs, AI agent correction cycles,
DSR kernel mutations, and design system entropy trends.

DLTS is consumed by:

- OpenTelemetry pipelines (via `createOtelBridge`)
- Custom analytics dashboards
- AI agent orchestration systems tracking correction convergence
- CI quality gates that gate on entropy score

---

## 2. Envelope (`DLTSEnvelope`)

Every DLTS event MUST include the common envelope fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `$schema` | `string` (URI) | Yes | MUST be `https://telemetry.design-lint.lapidist.net/schema/v1.json` |
| `specVersion` | `"1.0.0"` | Yes | MUST be the literal string `"1.0.0"` |
| `eventType` | `DLTSEventType` | Yes | Discriminant identifying the event shape (see §3) |
| `timestamp` | `string` (ISO 8601) | Yes | UTC timestamp of when the event occurred |
| `runId` | `string` | Yes | Unique identifier for the lint run that produced this event |
| `workspaceRunId` | `string` | No | Identifier for the workspace-level run (spans multiple lint runs) |
| `kernelSnapshotHash` | `string` | Yes | SHA-256 prefix of the DSR kernel snapshot active during the event |
| `agentId` | `string` | No | AI agent session identifier; present on agent-attributed events |

---

## 3. Event types

### 3.1 `RunEvent`

Emitted once per lint run (start or completion).

| Field | Type | Description |
| --- | --- | --- |
| `filesScanned` | `integer >= 0` | Number of files processed |
| `durationMs` | `number` | Wall-clock duration in milliseconds |
| `totalDiagnostics` | `integer >= 0` | Total violations emitted |
| `errorCount` | `integer >= 0` | Violations with severity `error` |
| `warnCount` | `integer >= 0` | Violations with severity `warn` |

### 3.2 `DiagnosticEvent`

Emitted for each individual violation detected.

| Field | Type | Description |
| --- | --- | --- |
| `ruleId` | `string` | Rule identifier (e.g. `design-token/colors`) |
| `severity` | `"error" or "warn"` | Violation severity |
| `message` | `string` | Human-readable description |
| `file` | `string` | Relative path of the offending file |
| `line` | `integer` | 1-based line number |
| `column` | `integer` | 1-based column number |

### 3.3 `FixEvent`

Emitted when an auto-fix is applied to a diagnostic.

| Field | Type | Description |
| --- | --- | --- |
| `ruleId` | `string` | Rule that triggered the fix |
| `file` | `string` | File path |
| `line` | `integer` | Line of the fix |
| `column` | `integer` | Column of the fix |
| `before` | `string` | Original source text |
| `after` | `string` | Replacement source text |

### 3.4 `CorrectionEvent`

Emitted at the end of an AI agent correction cycle.

| Field | Type | Description |
| --- | --- | --- |
| `agentId` | `string` | Agent session identifier |
| `iterationsUsed` | `integer >= 1` | Number of refinement passes performed |
| `converged` | `boolean` | Whether all violations were resolved |
| `violationsRemaining` | `integer >= 0` | Violations still present after correction |

### 3.5 `AgentSessionEvent`

Emitted when an AI agent session starts or ends.

| Field | Type | Description |
| --- | --- | --- |
| `agentId` | `string` | Agent identifier |
| `sessionId` | `string` | Unique session identifier |
| `action` | `"start" or "end"` | Session boundary |

### 3.6 `KernelMutationEvent`

Emitted when the DSR kernel token graph is modified.

| Field | Type | Description |
| --- | --- | --- |
| `mutationType` | `"add" or "update" or "deprecate" or "remove"` | Type of mutation |
| `pointer` | `string` | JSON pointer of the affected token |

### 3.7 `SnapshotEvent`

Emitted when the DSR kernel creates a snapshot checkpoint.

| Field | Type | Description |
| --- | --- | --- |
| `snapshotHash` | `string` | SHA-256 hash of the snapshot |
| `tokenCount` | `integer >= 0` | Number of tokens in the snapshot |

### 3.8 `EntropyEvent`

Emitted after each run with the current design system health score.

| Field | Type | Description |
| --- | --- | --- |
| `score` | `EntropyScore` | See §4 |

---

## 4. `EntropyScore`

The `EntropyScore` object quantifies design system health on a 0–100 scale where
100 is fully conformant and 0 is maximally entropic.

| Field | Type | Description |
| --- | --- | --- |
| `overall` | `number` (0–100) | Weighted aggregate health score |
| `byCategory` | `object` | Per-category scores keyed by DTIF token type |
| `byFile` | `object` | Optional per-file scores keyed by file path |
| `components.tokenCoverageRatio` | `number` (0–1) | Ratio of styled properties using tokens |
| `components.violationRecurrenceRate` | `number` (0–1) | Rate of recurring vs new violations |
| `components.agentAttributionRatio` | `number` (0–1) | Fraction of violations attributed to AI agents |
| `components.rateOfChange` | `number` | Score delta per run (negative = improving) |
| `components.violationConcentration` | `number` (0–1) | Gini coefficient of violation distribution across files |

---

## 5. SDK

The `@lapidist/design-lint-telemetry` package exports:

- `parseDLTSStream(stream)` — parse a newline-delimited JSON stream into `DLTSEnvelope[]`
- `validateDLTSEvent(event)` — validate an event against the DLTS v1 schema
- `aggregateRunEvents(events)` — produce an `AggregateReport` from multiple `RunEvent`s
- `createOtelBridge(tracer)` — returns a handler that converts DLTS events to OTel spans

---

## 6. Versioning

The `specVersion` field is a semver string. This spec defines `"1.0.0"`. Future versions
follow the same rules as DSCP: patch for clarifications, minor for new optional fields,
major for breaking changes to required fields.

---

## 7. Conformance

An event is conforming to DLTS v1 if and only if:

1. It validates against the JSON Schema at the `$schema` URI
2. `specVersion` equals `"1.0.0"`
3. `eventType` is one of the eight defined event types
4. All required envelope fields are present and correctly typed
