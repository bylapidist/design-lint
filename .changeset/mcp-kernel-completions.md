---
'@lapidist/design-lint': minor
---

Resolve token completion values from the DSR kernel when available

`handleTokenCompletions` now accepts an optional `TokenValueResolver` third
parameter. When provided, each token's `resolvedValue` is sourced from the
resolver (e.g. a live kernel lookup) rather than a fabricated CSS variable
reference. Falls back to the existing fabricated value when the resolver
returns `undefined` or is not supplied.
