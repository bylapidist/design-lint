---
'@lapidist/design-lint': patch
---

centralize DTIF cache hydration behind a shared helper so inline configuration
and Node environments reuse the same parse-and-attach logic.
