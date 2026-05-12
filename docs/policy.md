---
title: Policy Enforcement
description: "Centrally owned design-system guardrails that consumer configs cannot weaken."
sidebar_position: 7
---

# Policy Enforcement

A `designlint.policy.json` file adds a governance layer on top of per-project configuration. Policies are designed to be owned centrally (for example in a monorepo root or a shared npm package) and applied to every workspace that participates in the design system. Consumer `designlint.config.*` files cannot weaken a policy.

## Table of contents
- [Policy file](#policy-file)
- [Required rules](#required-rules)
- [Minimum severity](#minimum-severity)
- [Token coverage](#token-coverage)
- [Ratchet mode](#ratchet-mode)
- [AI agent policy](#ai-agent-policy)
- [Extending policies](#extending-policies)
- [See also](#see-also)

## Policy file

Place `designlint.policy.json` next to your `designlint.config.*` file (or in any ancestor directory — design-lint searches upward). A minimal policy:

```json
{
  "requiredRules": ["design-token/colors", "design-token/spacing"],
  "minSeverity": {},
  "tokenCoverage": {},
  "ratchet": { "mode": "entropy" }
}
```

design-lint validates the policy at startup and throws a `ConfigError` if any constraint is violated.

## Required rules

List rule IDs that must be enabled in every consumer config. design-lint throws an error at startup if a required rule is disabled or absent.

```json
{
  "requiredRules": [
    "design-token/colors",
    "design-token/spacing",
    "design-system/component-usage"
  ]
}
```

## Minimum severity

Set a floor severity for specific rules. Consumer configs can raise severity (e.g., `warn` → `error`) but cannot lower it below the policy minimum.

```json
{
  "minSeverity": {
    "design-token/colors": "error",
    "design-system/deprecation": "warn"
  }
}
```

## Token coverage

Require a minimum ratio of token types to be covered across linted files. Coverage ratios are expressed as fractions between `0` (no requirement) and `1` (100% coverage required).

```json
{
  "tokenCoverage": {
    "color": 0.8,
    "dimension": 0.6
  }
}
```

Token types correspond to DTIF `$type` values (`color`, `dimension`, `fontFamily`, `fontWeight`, etc.).

## Ratchet mode

Ratchet mode prevents design-system entropy from increasing between runs. Two modes are available:

| Mode | Description |
| --- | --- |
| `"entropy"` | Tracks an entropy score (0–100). Set `minScore` to prevent score from falling below a threshold. |
| `"metric"` | Tracks raw violation counts. Set `maxDelta` to limit how many new violations can be introduced. |

```json
{
  "ratchet": {
    "mode": "entropy",
    "minScore": 80
  }
}
```

```json
{
  "ratchet": {
    "mode": "metric",
    "maxDelta": 0
  }
}
```

`maxDelta: 0` in metric mode means no new violations are ever allowed — the strictest possible ratchet.

## AI agent policy

The `agentPolicy` block applies additional constraints during AI-assisted code generation sessions:

```json
{
  "agentPolicy": {
    "maxViolationRate": 0.05,
    "requiredConvergence": true,
    "trustedAgents": ["copilot", "cursor"]
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `maxViolationRate` | number | Maximum allowed violations per file. |
| `requiredConvergence` | boolean | When `true`, agent sessions must reach zero violations before completing. |
| `trustedAgents` | string[] | Agent identifiers exempt from policy enforcement. |

## Extending policies

Share a base policy across workspaces by publishing it as a package and extending it:

```json
{
  "extends": ["@acme/design-lint-policy"],
  "requiredRules": ["design-system/component-usage"]
}
```

`extends` entries are resolved in order (leftmost lowest precedence, root policy highest). All arrays and maps are merged; scalar values in the extending policy win.

## See also

- [Configuration](./configuration.md)
- [Architecture](./architecture.md)
- [CI integration](./ci.md)
