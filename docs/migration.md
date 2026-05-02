---
title: Migration Guide
description: "Upgrade from design-lint v7 to v8, or adopt design-lint incrementally in a new codebase."
sidebar_position: 6
---

# Migration Guide

## Table of contents

- [v7 to v8 migration](#v7-to-v8-migration)
- [Adopting design-lint incrementally](#adopting-design-lint-incrementally)
- [See also](#see-also)

---

## v7 to v8 migration

v8 is a breaking release. The Design System Runtime (DSR) kernel is now the **sole
authoritative token source** — inline config-based token loading no longer works. Every
team upgrading from v7 must complete the following steps.

### Step 1 — Update the dependency

```bash
pnpm add --save-dev @lapidist/design-lint@^8.0.0
```

### Step 2 — Run the migration codemod

The bundled codemod removes v7-only config keys and flags what needs manual attention:

```bash
npx design-lint migrate --config designlint.config.json
```

The codemod handles:

- Numeric severity codes (`0`, `1`, `2`) → string equivalents (`"off"`, `"warn"`, `"error"`)
- `ignorePatterns` → `ignoreFiles` key rename
- `overrides` removal (per-file overrides are not supported in v8)
- `root`, `env` removal (no-ops in v8)
- **`tokens` removal** — the codemod detects any inline `tokens:` field, removes it from
  the config file, and prints instructions to seed the DSR kernel instead (see Step 3).

### Step 3 — Start the DSR kernel and seed tokens

In v8 tokens come from the running DSR kernel, not from config files. Start the kernel
and seed it from your DTIF token file:

```bash
# Start the kernel daemon (persists across terminal sessions)
design-lint kernel start --config designlint.config.json
```

If you previously passed a DTIF catalog path inside the config `tokens` field, you now
pass the config that references it to `kernel start`. The daemon reads the token file
paths and seeds the kernel's in-memory token graph automatically.

Verify the kernel is running:

```bash
design-lint kernel status
```

### Step 4 — Update CI/CD pipelines

v8 CLI invocations require the kernel to be running **before** the lint command:

```yaml
# .github/workflows/ci.yml
- name: Start DSR kernel
  run: design-lint kernel start --config designlint.config.json

- name: Lint
  run: design-lint "src/**/*"
```

The kernel auto-starts on the first lint command if no socket is present, but explicit
`kernel start` in CI is recommended for reliability.

### Step 5 — Remove `ConfigTokenProvider` imports

`ConfigTokenProvider` is no longer part of the public API. If your codebase imports it
directly:

```ts
// v7 — remove this
import { ConfigTokenProvider } from '@lapidist/design-lint/config';
```

Replace with a `DsrTokenProvider` via `createNodeEnvironment`:

```ts
// v8
import { createNodeEnvironment, createLinter } from '@lapidist/design-lint';

const env = createNodeEnvironment(config, {
  dsr: { socketPath: '/tmp/designlint-kernel.sock' },
});
const linter = createLinter(config, env);
```

### Breaking changes summary

| v7 | v8 |
| --- | --- |
| `config.tokens` — inline DTIF token objects | Removed — use `kernel start --config` |
| `ConfigTokenProvider` — public class | Removed from public API; internal only |
| `--no-kernel` CLI flag | Removed |
| `--kernel` CLI flag | Removed — kernel is always required |
| Numeric severity (`0`, `1`, `2`) | Deprecated — use `"off"`, `"warn"`, `"error"` |
| `ignorePatterns` config key | Renamed to `ignoreFiles` |
| `overrides` config key | Removed — not supported |
| `root` / `env` config keys | Removed — no-ops |

---

## Adopting design-lint incrementally

If you are introducing design-lint into an existing codebase for the first time:

### Install and initialize

```bash
pnpm add --save-dev @lapidist/design-lint
npx design-lint init
```

Start the DSR kernel before your first lint run:

```bash
design-lint kernel start --config designlint.config.json
```

Run once to establish a baseline:

```bash
npx design-lint "src/**/*"
```

### Start with warnings

Introduce new rules at warning severity so teams can ship while fixing existing debt:

```json
{
  "rules": {
    "design-system/deprecation": "warn",
    "design-token/colors": "warn"
  }
}
```

After violations trend down, promote to `"error"`.

### Prioritize auto-fix rules

```bash
npx design-lint "src/**/*" --fix
```

Bundle auto-fixed changes into small, reviewable commits before enabling stricter CI gates.

### Recommended rollout order

1. Structural guardrails (`design-system/import-path`, `design-system/component-prefix`)
2. Deprecated usage cleanup (`design-system/deprecation`)
3. Design token enforcement (`design-token/*`)
4. Gate in CI for changed files, then the full repository

---

## See also

- [Getting Started](./usage.md)
- [Configuration](./configuration.md)
- [CI integration](./ci.md)
- [Troubleshooting](./troubleshooting.md)
- [Rule reference](./rules/index.md)
