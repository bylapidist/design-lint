---
'@lapidist/design-lint': minor
---

Add runtime policy enforcement for tokenCoverage, ratchet, and agentPolicy

`enforceRuntimePolicy` now handles all three dynamic policy constraints:

- **tokenCoverage**: when threshold is `1` (100%), any violation for the
  mapped token category throws a `ConfigError`. Sub-100% thresholds require
  total usage counts not yet available and are skipped.
- **ratchet** (`metric` mode): total violation count must not exceed
  `baseline.totalCount + maxDelta`. (`entropy` mode): computed quality score
  must meet `minScore`.
- **agentPolicy**: `requiredConvergence` fails on any remaining errors;
  `maxViolationRate` fails when violations-per-file exceeds the threshold;
  agents listed in `trustedAgents` bypass both checks.

`executeLint` now accepts `baseline` (path to a baseline JSON file) and
`agentId` options, reads the baseline automatically, and calls
`enforceRuntimePolicy` after every lint run when a policy is active.
The loaded policy is retained in the `Environment` object returned by
`prepareEnvironment` and forwarded to `executeLint` via the services spread.
