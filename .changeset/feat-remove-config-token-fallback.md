---
'@lapidist/design-lint': minor
---

feat(env): remove local config token fallback — DSR kernel is the only token source in v8

- `createNodeEnvironment` now requires `dsr` options; the `ConfigTokenProvider`
  fallback is removed. Calling the function without a kernel connection throws
  a descriptive error.
- `ConfigTokenProvider` is removed from the public API (`config/index.ts`).
- `prepareEnvironment` auto-launches the DSR kernel daemon when the socket is
  absent, eliminating the need for `design-lint kernel start` as a separate step.
- Removed `--kernel` / `--no-kernel` CLI flags — kernel is always used in v8.
- `validate-config` no longer loads tokens (kernel not required for rule syntax checks).
- `watch.ts` passes the kernel socket path on config reload so the hot-reload
  path also connects to the running kernel.
