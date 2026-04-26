---
'@lapidist/design-lint': major
---

Remove `TokenRegistry` from the public API surface

`TokenRegistry` and `TokenRegistryOptions` are no longer exported from
`@lapidist/design-lint` or `@lapidist/design-lint/core`. The class remains
an internal implementation detail of the linter. Consumers that previously
imported `TokenRegistry` directly should migrate to using the rule context's
`getDtifTokens()` callback, which provides the same DTIF token access without
depending on the registry class itself.

This is part of the Phase 3 design-lint v8 refactor to remove internal state
management from the public API surface in preparation for full DSR kernel
delegation.
