---
'@lapidist/design-lint': minor
---

Allow design token paths to include forward slashes by normalizing JSON Pointer fragments rather than rejecting `/` characters. Update token parsing, flattening, and registries to preserve escaped segments and emit valid constant names for slash-containing tokens.
