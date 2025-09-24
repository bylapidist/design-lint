---
'@lapidist/design-lint': major
---

remove the legacy `Token`, `TokenGroup`, and `LegacyDesignTokens` type exports in favor of the DTIF-native `TokenNode` and `TokenCollectionNode` aliases, and update the token guards to recognise `$ref` entries.
