---
'@lapidist/design-lint': minor
---

Complete OTel instrumentation bridge for all DLTS event types

`createOtelInstrumentation` now bridges the full DLTS v1 event taxonomy:

- `DiagnosticEvent` → child span with `ruleId`, `severity`, `file`, `line`, `column`
- `FixEvent` → span with `addEvent('fix.applied', { before, after })`
- `CorrectionEvent` → span with `addEvent('correction.cycle', { iterationsUsed, converged, violationsRemaining })`
- `KernelMutationEvent` → span with `addEvent('kernel.mutation', { mutationType, pointer })`
- `EntropyEvent` → six `OtelGauge` metric observations for every entropy component

`OtelSpan` gains `addEvent()`; `OtelMeter.createObservableGauge` now returns
the new `OtelGauge` interface (with `record()`) instead of `unknown`.
