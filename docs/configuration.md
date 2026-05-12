---
title: Configuration
description: "Define how design-lint evaluates your project."
sidebar_position: 3
---

# Configuration

This page explains every option in `designlint.config.*`. It targets developers adjusting the
linter to their workflow.

## Table of contents

- [Basic config](#basic-config)
- [Token seeding](#token-seeding)
- [Name transforms](#name-transforms)
- [Rules and severity](#rules-and-severity)
- [Plugins](#plugins)
- [Configuration best practices](#configuration-best-practices)
- [JS and TS config files](#js-and-ts-config-files)
- [Common patterns](#common-patterns)
- [See also](#see-also)

## Basic config

Create a configuration file at the project root:

```json
{
  "rules": {}
}
```

The config file name may be `designlint.config.json`, `.js`, `.ts`, `.mjs`, or `.mts`.
design-lint searches from the current working directory to the filesystem root and merges every
discovered config from root to leaf. Merge behavior is deterministic:

- `plugins`, `ignoreFiles`, and `patterns` are concatenated in root → leaf order.
- Scalar values (for example `concurrency`) are overwritten by the nearest config that defines them.
- Object values (for example `rules`) are replaced by the nearest config that defines them.

This lets monorepos define shared defaults at the root and override selected fields per package.

### Monorepo layering example

```text
repo/
  designlint.config.json
  packages/
    app/
      designlint.config.json
```

`repo/designlint.config.json`:

```json
{
  "plugins": ["@company/design-lint-plugin"],
  "ignoreFiles": ["**/*.stories.tsx"],
  "rules": { "design-token/colors": "error" },
  "concurrency": 4
}
```

`repo/packages/app/designlint.config.json`:

```json
{
  "plugins": ["@company/app-plugin"],
  "ignoreFiles": ["src/generated/**"],
  "rules": { "design-token/colors": "warn" },
  "concurrency": 2
}
```

Effective config in `packages/app`:

- `plugins`: `["@company/design-lint-plugin", "@company/app-plugin"]`
- `ignoreFiles`: `["**/*.stories.tsx", "src/generated/**"]`
- `rules`: `{ "design-token/colors": "warn" }`
- `concurrency`: `2`

### Top-level options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | object | `undefined` | Enables [rules](./rules/index.md) and sets their severity. |
| `plugins` | string[] | `[]` | Loads additional [plugins](./plugins.md). |
| `ignoreFiles` | string[] | `[]` | Glob patterns ignored during linting. |
| `patterns` | string[] | `[]` | File patterns to lint when none are passed on the CLI. |
| `format` | string | `"stylish"` | Default output [formatter](./formatters.md). Overridden by `--format` on the CLI. |
| `concurrency` | number | `os.cpus()` | Maximum parallel workers. |
| `nameTransform` | string | `undefined` | Convert token paths to `kebab-case`, `camelCase`, or `PascalCase`. |
| `templateTags` | string[] | `["styled", "css", "tw"]` | Tagged-template roots treated as CSS template sources. |

---

## Token seeding

In v8 the DSR kernel is the sole authoritative token source. Tokens are not declared in the
config file — they are seeded into the running kernel from a DTIF catalog file at startup.

To seed the kernel with your tokens before linting:

```bash
design-lint kernel start --config-path designlint.config.json
```

The kernel daemon reads token file references from the config (via the internal `KernelConfig`
type) and loads them into its in-memory token graph. All lint commands then query the kernel
via DSQL to retrieve token data.

See the [migration guide](./migration.md#step-3--start-the-dsr-kernel-and-seed-tokens) for the
full token seeding workflow, and the [usage guide](./usage.md#the-dsr-kernel) for kernel
lifecycle commands.

---

## Name transforms

Token paths are normalized to dot notation. Set `nameTransform` to convert those paths into a
preferred case during flattening and output generation.

```json
{
  "nameTransform": "kebab-case"
}
```

Flattened token exports and completion suggestions use the configured transform.

## Rules and severity

Enable a rule by adding it to the `rules` map with a severity:

```json
{
  "rules": {
    "design-token/colors": "error",
    "design-system/component-usage": ["warn", { "substitutions": { "button": "DSButton" } }]
  }
}
```

Severity values: `"off"`, `"warn"`, `"error"`. Numeric values `0`, `1`, `2` are accepted but
deprecated — run `design-lint migrate` to convert them to string equivalents.
Many rules accept options; see the [rule reference](./rules/index.md).

## Plugins

Plugins bundle custom rules or formatters. Install the package and list it in `plugins`:

```json
{
  "plugins": ["@company/design-lint-plugin"]
}
```

Only use trusted plugin packages. Plugins are loaded and executed with the same permissions as
the design-lint process.

See the [plugins guide](./plugins.md) to author and publish your own.

## Configuration best practices

- **Layer configs in monorepos.** Place a root config with shared rules, then add package-level
  configs to tailor behavior.
- **Avoid global ignores.** Prefer targeted `ignoreFiles` entries over broad `.gitignore`
  patterns to reduce accidental omissions.
- **Validate configs in CI.** Run design-lint as part of pull requests to catch misconfigurations
  early.
- **Start the kernel in CI.** Add `design-lint kernel start --config-path` before any lint step.
  See the [CI integration guide](./ci.md).

## JS and TS config files

Configuration can be written in JavaScript or TypeScript for dynamic setups.

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  rules: {
    'design-token/colors': 'error',
    'design-token/spacing': 'warn',
  },
});
```

To seed the kernel with your DTIF token catalog before linting:

```bash
design-lint kernel start --config-path designlint.config.ts
design-lint "src/**/*"
```

## Common patterns

- Share configs across repositories with pnpm packages.
- Combine with framework presets; see [framework integrations](./frameworks.md).
- Set `patterns` to lint only changed files in CI.

## See also

- [Rule reference](./rules/index.md)
- [Config presets](./configuration-presets.md)
- [Policy enforcement](./policy.md)
- [Plugins](./plugins.md)
- [Migration guide](./migration.md)
- [Troubleshooting](./troubleshooting.md)
