---
"@lapidist/design-lint": major
---

refactor: start migrating configuration and core types to DTIF, wiring in the shared validator and pointer-aware token metadata

- normalize token utilities, registries, and CSS output around JSON Pointer paths while updating tests to exercise DTIF `$ref` aliases and pointer-based transforms
- propagate collection metadata such as inherited types into flattened JSON Pointer tokens and refresh parser/file-loader tests to assert DTIF-compliant values, warnings, and diagnostics
- align flattening utilities, token tracker helpers, and config flatten/getFlattened tests with DTIF color payloads, canonical `$ref` pointers, and pointer-based metadata expectations
