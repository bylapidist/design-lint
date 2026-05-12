---
'@lapidist/design-lint': minor
---

Wire policy enforcement into the normal CLI lint flow

`prepareEnvironment` (the CLI's environment setup path used by all normal
lint invocations) now loads and enforces `designlint.policy.json` before any
linting begins. Previously policy was only checked during `design-lint validate`.

Static constraints (`requiredRules`, `minSeverity`) are enforced at startup
and throw a `ConfigError` when violated, preventing any lint run from
proceeding. Dynamic constraints (`tokenCoverage`, `ratchet`, `agentPolicy`)
still require DSR runtime data and are handled separately.
