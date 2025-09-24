---
'@lapidist/design-lint': major
---

Remove the legacy flatten adapter exports now that the DTIF token view helpers
replace `LegacyFlattenedToken`, `toLegacyFlattenedTokens`, and
`toLegacyFlattenedToken`. Consumers should rely on `createTokenView` and
pointer-based helpers when converting DTIF records to path-keyed structures.
