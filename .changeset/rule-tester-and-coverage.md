---
'@lapidist/design-lint': patch
'@lapidist/design-lint-testing': minor
---

feat(testing): complete RuleTester coverage for all 30 built-in rules; add DtifFlattenedToken injection to ValidCase/InvalidCase so token-based rules can exercise real validation logic; fix TSX/JSX docType normalisation through FILE_TYPE_MAP so tsx snippets resolve to the TypeScript parser
