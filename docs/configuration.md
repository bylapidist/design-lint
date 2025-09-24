---
title: Configuration
description: "Define how design-lint evaluates your project."
sidebar_position: 3
---

# Configuration

This page explains every option in `designlint.config.*`. It targets developers adjusting the linter to their workflow.

## Table of contents
- [Basic config](#basic-config)
- [Tokens](#tokens)
- [Name transforms](#name-transforms)
- [Rules and severity](#rules-and-severity)
- [Plugins](#plugins)
- [Overrides](#overrides)
- [Configuration best practices](#configuration-best-practices)
- [JS and TS config files](#js-and-ts-config-files)
- [Common patterns](#common-patterns)
- [See also](#see-also)

## Basic config
Create a configuration file at the project root:

```json
{
  "tokens": {},
  "rules": {}
}
```

The config file name may be `designlint.config.json`, `.js`, `.ts`, `.mjs`, or `.mts`. design-lint searches upward from the current working directory until it finds one of these files. Nested config files override settings from parent directories, allowing per-package customization in monorepos.

### Top-level options

Each option tunes a specific aspect of design-lint. Use the table below as a quick reference.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tokens` | object | `undefined` | A [DTIF token document](./glossary.md#design-tokens) or a map of themes. Theme values may be inline DTIF objects or paths to `.tokens` files. |
| `rules` | object | `undefined` | Enables [rules](./rules/index.md) and sets their severity. |
| `plugins` | string[] | `[]` | Loads additional [plugins](./plugins.md). |
| `ignoreFiles` | string[] | `[]` | Glob patterns ignored during linting. |
| `patterns` | string[] | `[]` | File patterns to lint when none are passed on the CLI. |
| `concurrency` | number | `os.cpus()` | Maximum parallel workers. Lower the value when running multiple linters in CI to avoid resource contention. |
| `wrapTokensWithVar` | boolean | `false` | Wrap token values with `var()` when autofixing CSS. Useful when migrating legacy codebases to CSS variables. |
| `nameTransform` | string | `undefined` | Convert token paths to `kebab-case`, `camelCase`, or `PascalCase`. |


## Tokens
Tokens describe the design system in a machine-readable form. Provide a DTIF document directly or supply a map of theme names.

Inline example:

```json
{
  "tokens": {
    "color": {
      "primary": {
        "$type": "color",
        "$value": { "colorSpace": "srgb", "components": [1, 0, 0] }
      },
      "secondary": { "$type": "color", "$ref": "#/color/primary" }
    },
    "space": {
      "sm": { "$type": "dimension", "$value": { "value": 4, "unit": "px" } },
      "md": { "$type": "dimension", "$value": { "value": 8, "unit": "px" } }
    }
  }
}
```

Organise tokens by category—such as `color`, `space`, or `typography`—to mirror your design language. To support light and dark themes, supply an object keyed by theme name. Each theme may contain an inline token tree or a path to an external token file. Paths resolve relative to the configuration file:

```json
{
  "tokens": {
    "light": "./light.tokens.json",
    "dark": {
      "color": {
        "primary": {
          "$type": "color",
          "$value": { "colorSpace": "srgb", "components": [1, 1, 1] }
        },
        "secondary": { "$type": "color", "$ref": "#/color/primary" }
      }
    }
  }
}
```

Token files should use the `.tokens` or `.tokens.json` extension and are typically served with the `application/design-tokens+json` MIME type.

Design token files are validated strictly:

- Token and group names may not include `{`, `}`, or `.` and names differing only by case are rejected.
- `$extensions` keys must contain at least one dot to avoid collisions.
- Alias references must resolve to tokens of the same `$type` and cyclic or unknown aliases raise errors.
- Composite token objects such as `shadow`, `strokeStyle`, `gradient`, and `typography` may only include the fields defined by the specification.
## Name transforms
Token paths are normalized to dot notation. Set `nameTransform` to convert those paths into a preferred case during flattening and output generation.

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

Severity values: `"off"`, `"warn"`, `"error"`, or numeric `0`, `1`, `2`. Many rules accept options; see the [rule reference](./rules/index.md).

## Plugins
Plugins bundle custom rules or formatters. Install the package and list it in `plugins`:

```json
{
  "plugins": ["@company/design-lint-plugin"]
}
```

See the [plugins guide](./plugins.md) to author and publish your own.

## Overrides
Use overrides to apply different settings to specific files. Create separate configuration files in subdirectories or use a JavaScript config file to inspect file paths at runtime.

## Configuration best practices
- **Layer configs in monorepos.** Place a root config with shared tokens and rules, then add package-level configs to tailor behavior.
- **Keep tokens close to source.** Store token files alongside the components that consume them to simplify updates.
- **Avoid global ignores.** Prefer targeted `ignoreFiles` entries over broad `.gitignore` patterns to reduce accidental omissions.
- **Validate configs in CI.** Run design-lint as part of pull requests to catch misconfigurations early.

## JS and TS config files
Configuration can be written in JavaScript or TypeScript for dynamic setups:

```ts
// designlint.config.ts
import { defineConfig } from '@lapidist/design-lint';

export default defineConfig({
  tokens: {
    color: {
      primary: {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [1, 0, 0] },
      },
      secondary: { $type: 'color', $value: '{color.primary}' },
    },
  },
  rules: { 'design-token/colors': 'error' },
});
```

## Common patterns
- Share configs across repositories with npm packages.
- Combine with framework presets; see [framework integrations](./frameworks.md).
- Set `patterns` to lint only changed files in CI.

## See also
- [Rule reference](./rules/index.md)
- [Plugins](./plugins.md)
- [Troubleshooting](./troubleshooting.md)
