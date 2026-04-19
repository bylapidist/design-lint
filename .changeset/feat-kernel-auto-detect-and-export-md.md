---
'@lapidist/design-lint': minor
---

feat(cli): auto-detect DSR kernel socket and make export-design-system-md kernel-authoritative

- Auto-detect running kernel: when /tmp/designlint-kernel.sock exists (and
  DESIGN_LINT_NO_KERNEL is unset), the kernel is used automatically for token
  resolution without requiring --kernel; set DESIGN_LINT_NO_KERNEL=1 to opt out
- export-design-system-md: when the kernel is running, pull the token graph
  from DSQL (via forProperty) instead of re-parsing local config, making the
  document a true kernel projection
- kernel-client.ts: expose tokenEntries from kernel in KernelData
- Test script sets DESIGN_LINT_NO_KERNEL=1 to preserve test isolation
