---
title: Migration Guide
description: "Adopt design-lint incrementally in existing repositories."
sidebar_position: 6
---

# Migration Guide

This guide helps teams introduce `@lapidist/design-lint` into an existing codebase with minimal disruption.

## Table of contents
- [Set a baseline](#set-a-baseline)
- [Start with warnings](#start-with-warnings)
- [Prioritize auto-fix rules](#prioritize-auto-fix-rules)
- [Roll out strictness in phases](#roll-out-strictness-in-phases)
- [Gate in CI](#gate-in-ci)
- [Recommended rollout order](#recommended-rollout-order)
- [See also](#see-also)

## Set a baseline
Install and initialize design-lint, then run it once to understand the current violation volume:

```bash
npm install --save-dev @lapidist/design-lint
npx design-lint init
npx design-lint "src/**/*"
```

Capture this first report as your migration baseline.

## Start with warnings
When introducing new rules, prefer warning severity first so teams can ship while fixing existing debt:

```json
{
  "rules": {
    "design-system/deprecation": "warn",
    "design-token/colors": "warn"
  }
}
```

After violations trend down, promote the same rules to `error`.

## Prioritize auto-fix rules
Run with `--fix` locally to remove easy violations early:

```bash
npx design-lint "src/**/*" --fix
```

Bundle these changes into small, reviewable commits before enabling stricter CI enforcement.

## Roll out strictness in phases
A practical sequence is:
1. Structural guardrails (`design-system/import-path`, `design-system/component-prefix`)
2. Deprecated usage cleanup (`design-system/deprecation`)
3. Design token enforcement (`design-token/*`)

This order reduces churn and prevents repeated rewrites.

## Gate in CI
Once critical rules are stable at `error`, run design-lint on pull requests to stop regressions.

Use the CI examples in the [CI integration guide](./ci.md).

## Recommended rollout order
1. Enable selected rules as `warn`
2. Run `--fix` and commit low-risk automated changes
3. Resolve remaining warnings by area/team
4. Promote stable rules from `warn` to `error`
5. Enforce in CI for changed files, then full repository

## See also
- [Getting Started](./usage.md)
- [Configuration](./configuration.md)
- [Framework integrations](./frameworks.md)
- [Troubleshooting](./troubleshooting.md)
- [Rule reference](./rules/index.md)
