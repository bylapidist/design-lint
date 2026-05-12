---
'@lapidist/design-lint': minor
---

Wire `docs` and `export-design-system-md` commands to live DSR kernel state

Both CLI commands now attempt a kernel connection at runtime via a shared
`tryFetchKernelData()` helper. When the kernel is reachable:

- `export-design-system-md` uses the real snapshot hash, component registry,
  and deprecation ledger in the generated DSCP document instead of placeholder defaults.
- `docs` includes a generated `components.md` page sourced from the kernel's
  component registry and links it from the index page.

When the kernel is not running both commands fall back to their previous
behaviour (empty registries, `'local'` snapshot hash) — no error is thrown.
