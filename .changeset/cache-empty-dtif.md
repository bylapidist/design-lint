---
'@lapidist/design-lint': patch
---

Ensure DTIF cache hydration stores empty flattened arrays when documents contain no tokens so synchronous consumers can detect processed inline payloads without reparsing.
