---
'@lapidist/design-lint': minor
---

Populate violations in DESIGN_SYSTEM.md via opt-in lint pass

`export-design-system-md` now accepts a `--lint` flag. When set, the command
runs a lint pass against the configured patterns and aggregates the results
into DSCP `ViolationInput` patterns — grouped by CSS property and raw value
with frequency counts and correct-token suggestions where auto-fixes exist.

Without `--lint`, the command remains fast and produces a violations-free
snapshot (prior behavior). The `aggregateViolations` helper is exported for
programmatic use and is covered by six new unit tests.
