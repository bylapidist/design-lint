---
'@lapidist/design-lint': minor
---

- Add DTIF schema validation for token documents that declare `$version`, using `@lapidist/dtif-validator` with Ajv 2020 helpers.
- Preserve DTIF `$value` fallback arrays by resolving aliases, exposing ordered fallbacks, and normalizing color entries alongside the primary value.
