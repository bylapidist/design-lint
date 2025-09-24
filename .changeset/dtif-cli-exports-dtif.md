---
'@lapidist/design-lint': major
---

BREAKING: the `design-lint tokens` command now writes canonical DTIF flattened tokens keyed by JSON pointer instead of the legacy `{ value, type, aliases }` view. Consumers should read `DtifFlattenedToken` records from the generated JSON.
