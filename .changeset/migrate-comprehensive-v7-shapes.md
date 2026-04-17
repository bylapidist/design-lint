---
'@lapidist/design-lint': minor
---

Extend migration codemod to cover all documented v7 config shapes

`design-lint migrate` now handles five additional v7 config shapes:

- `ignorePatterns` → renamed to `ignoreFiles` (v7 used the ESLint field name)
- `overrides` → removed; per-file rule overrides are not supported in v8
- `root` → removed; no-op in v8 (config is always project-relative)
- `env` → removed with a note; design-lint does not use environment globals
- `plugins` / `extends` → existing comment notes retained

`applyMigrations` is now an exported function so callers can apply the
transformation to an in-memory config object. A comprehensive test suite
covers every documented v7 shape as well as the dry-run and `--out` flags.
