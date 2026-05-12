---
'@lapidist/design-lint': minor
---

feat(kernel): add --config-path to kernel start — when provided, design tokens are loaded from the designlint.config.* file and injected into the kernel token graph on startup, so DSQL queries return meaningful results immediately without requiring explicit write-API calls
