---
'@lapidist/design-lint': patch
---

Validate configuration token files with the DTIF parser before falling back to
the legacy reader so DTIF diagnostics surface for invalid documents while
keeping DTCG compatibility during the migration.
