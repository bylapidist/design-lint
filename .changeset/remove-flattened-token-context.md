---
'@lapidist/design-lint': major
---

Remove the legacy flattened token view from rule contexts. `RuleContext` now
exposes only `getDtifTokens` and `getTokenPath`, the `FlattenedToken` type and
`createTokenView` helper are gone, and the `tokenRule` utility passes canonical
DTIF tokens to `getAllowed`. Update custom rules to read DTIF data directly.
