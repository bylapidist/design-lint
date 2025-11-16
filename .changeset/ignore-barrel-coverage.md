---
'@lapidist/design-lint': patch
---

ignore coverage for barrel modules that only re-export helpers so c8 no longer counts their generated helper bindings as uncovered functions
